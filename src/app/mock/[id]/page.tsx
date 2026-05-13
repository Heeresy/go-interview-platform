'use client'

/**
 * `/mock/[id]` — Mock_Module detail route.
 *
 * Перестроено под Design System v2 (task 20.4; Requirements 17.1, 17.6,
 * 21.1, 21.3, 21.5, 22.4, 22.5):
 *
 *   - Авторизованный пользователь видит контент внутри `AppShell`;
 *     гость получает `null` (middleware перенаправляет на `/login`).
 *   - Контент собирается из публичного API `@/components/mock`
 *     (барреля) — Req 22.4, 22.5.
 *   - Старая разметка (inline-стили / motion-обёртки / styled-jsx)
 *     удалена полностью — её место заняли DS v2 примитивы:
 *     `<MockDetail />`, `<RatingControl />`, `<CommentThread />`
 *     (Req 21.1, 21.5).
 *   - Бизнес-логика (Supabase-запросы, схема БД) **не меняется** —
 *     данные тянутся ровно теми же запросами (Req 21.3).
 *   - `useParams()` из `next/navigation` для получения mock ID.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { CSSProperties } from 'react'

import { AppShell, AuthGate } from '@/components/shell'
import {
  MockDetail,
  RatingControl,
  CommentThread,
} from '@/components/mock'
import type { MockDetailSummary, Comment } from '@/components/mock'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import type { MockSet } from '@/types/database'

// ── Layout (DS tokens only; Req 1.8) ─────────────────────────────────────

const PAGE_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
  width: '100%',
  minWidth: 0,
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Маппинг Supabase `MockSet` → UI `MockDetailSummary` (Req 22.4).
 */
function toDetailSummary(set: MockSet): MockDetailSummary {
  return {
    id: set.id,
    title: set.title,
    description: set.description ?? null,
    difficulty: set.difficulty,
    category: set.author?.display_name || set.author?.username || '',
    averageRating: set.avg_rating ?? 0,
    commentCount: set.total_ratings ?? 0,
  }
}

// ── Inner authenticated content ──────────────────────────────────────────

function MockDetailRouteContent() {
  const params = useParams()
  const id = params.id as string

  const [mock, setMock] = useState<MockDetailSummary | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [commentsError, setCommentsError] = useState<Error | null>(null)
  const [userRating, setUserRating] = useState<number | undefined>(undefined)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function load() {
      try {
        // 1. Fetch Mock Set
        const { data: setData, error: setErr } = await supabase
          .from('mock_sets')
          .select('*, author:profiles(*)')
          .eq('id', id)
          .single()

        if (!active) return
        if (setErr) throw setErr
        if (!setData) throw new Error('Not found')

        setMock(toDetailSummary(setData))
        setError(null)

        // 2. Fetch user's existing rating
        const { data: { user } } = await supabase.auth.getUser()
        if (user && active) {
          const { data: ratingData } = await supabase
            .from('mock_ratings')
            .select('rating')
            .eq('mock_set_id', id)
            .eq('user_id', user.id)
            .maybeSingle()

          if (active && ratingData) {
            setUserRating(ratingData.rating)
          }
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (active) setIsLoading(false)
      }
    }

    async function loadComments() {
      try {
        const { data, error: err } = await supabase
          .from('mock_comments')
          .select('*, author:profiles(*)')
          .eq('mock_set_id', id)
          .order('created_at', { ascending: true })

        if (!active) return
        if (err) throw err

        const mapped: Comment[] = (data ?? []).map((c: any) => ({
          id: c.id,
          author: {
            id: c.author?.id ?? c.user_id,
            name: c.author?.display_name || c.author?.username || '',
            avatarUrl: c.author?.avatar_url ?? undefined,
          },
          createdAt: c.created_at,
          content: c.content,
        }))

        setComments(mapped)
        setCommentsError(null)
      } catch (err) {
        if (!active) return
        setCommentsError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (active) setCommentsLoading(false)
      }
    }

    void load()
    void loadComments()

    return () => {
      active = false
    }
  }, [id])

  const handleRate = useCallback(
    async (value: number) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: err } = await supabase
        .from('mock_ratings')
        .upsert(
          { mock_set_id: id, user_id: user.id, rating: value },
          { onConflict: 'mock_set_id,user_id' },
        )

      if (err) throw err
      setUserRating(value)
    },
    [id],
  )

  const handlePostComment = useCallback(
    async (text: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: err } = await supabase
        .from('mock_comments')
        .insert({ mock_set_id: id, user_id: user.id, content: text })
        .select('*, author:profiles(*)')
        .single()

      if (err) throw err

      if (data) {
        const newComment: Comment = {
          id: data.id,
          author: {
            id: data.author?.id ?? data.user_id,
            name: data.author?.display_name || data.author?.username || '',
            avatarUrl: data.author?.avatar_url ?? undefined,
          },
          createdAt: data.created_at,
          content: data.content,
        }
        setComments((prev) => [...prev, newComment])
      }
    },
    [id],
  )

  if (isLoading) {
    return (
      <div style={PAGE_STYLE} data-ds="mock-detail-page" data-state="loading">
        <MockDetail
          mock={{
            id: '',
            title: '',
            description: null,
            difficulty: 1,
            category: '',
            averageRating: 0,
            commentCount: 0,
          }}
        />
      </div>
    )
  }

  if (error || !mock) {
    return (
      <div style={PAGE_STYLE} data-ds="mock-detail-page" data-state="error">
        <MockDetail
          mock={{
            id: '',
            title: t('state.error.unknown'),
            description: null,
            difficulty: 1,
            category: '',
            averageRating: 0,
            commentCount: 0,
          }}
        />
      </div>
    )
  }

  return (
    <div style={PAGE_STYLE} data-ds="mock-detail-page">
      <MockDetail
        mock={mock}
        ratingControl={
          <RatingControl
            value={userRating}
            onChange={handleRate}
          />
        }
        commentThread={
          <CommentThread
            comments={comments}
            onPost={handlePostComment}
            isLoading={commentsLoading}
            error={commentsError}
          />
        }
      />
    </div>
  )
}

// ── Page export ──────────────────────────────────────────────────────────

export default function MockDetailPage() {
  return (
    <AuthGate
      guest={null}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <MockDetailRouteContent />
        </AppShell>
      )}
    />
  )
}
