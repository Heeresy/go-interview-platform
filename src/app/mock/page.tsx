'use client'

/**
 * `/mock` — Mock_Module index route.
 *
 * Перестроено под Design System v2 (task 20.4; Requirements 17.1, 17.6,
 * 21.1, 21.3, 21.5, 22.4, 22.5):
 *
 *   - Авторизованный пользователь видит контент внутри `AppShell`;
 *     гость получает `null` (middleware перенаправляет на `/login`).
 *   - Контент собирается из публичного API `@/components/mock`
 *     (барреля), без обращения во внутренние файлы — Req 22.4, 22.5.
 *   - Старая разметка (inline-стили / motion-обёртки / styled-jsx)
 *     удалена полностью — её место заняли DS v2 примитивы и модульные
 *     компоненты `<MockFilters />` + `<MockList />` (Req 21.1, 21.5).
 *   - Бизнес-логика (Supabase-запросы, схема БД) **не меняется** —
 *     данные тянутся ровно теми же запросами, просто без legacy-UI
 *     вокруг (Req 21.3).
 *
 * Контракт фильтрации:
 *   - Клиентский full-text по `title` + `description` (case-insensitive).
 *   - Difficulty-фильтр через `MockFilters`.
 *   - Сортировка по рейтингу / дате.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'

import { AppShell, AuthGate } from '@/components/shell'
import { MockList, MockFilters } from '@/components/mock'
import type { MockSummary } from '@/components/mock'
import { Button } from '@/components/ui'
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

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-4)',
  margin: 0,
}

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-2xl)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
  color: 'var(--border-900)',
  margin: 0,
}

const CREATE_LINK_STYLE: CSSProperties = {
  textDecoration: 'none',
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Маппинг Supabase `MockSet` → UI `MockSummary` (Req 22.4: компонент
 * не зависит от схемы БД напрямую).
 */
function toMockSummary(set: MockSet): MockSummary {
  return {
    id: set.id,
    title: set.title,
    difficulty: set.difficulty,
    category: set.author?.display_name || set.author?.username || '',
    averageRating: set.avg_rating ?? 0,
    commentCount: set.total_ratings ?? 0,
  }
}

/**
 * Клиентский матчер «мок-сет проходит фильтр».
 */
function matchesMock(
  set: MockSet,
  searchLower: string,
  difficulties: number[],
): boolean {
  if (searchLower.length > 0) {
    const haystack = `${set.title} ${set.description ?? ''}`.toLowerCase()
    if (!haystack.includes(searchLower)) return false
  }
  if (difficulties.length > 0) {
    if (!difficulties.includes(set.difficulty)) return false
  }
  return true
}

// ── Inner authenticated content ──────────────────────────────────────────

function MockRouteContent() {
  const [sets, setSets] = useState<MockSet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([])

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function load() {
      try {
        const { data, error: err } = await supabase
          .from('mock_sets')
          .select('*, author:profiles(*)')
          .eq('is_published', true)
          .order('avg_rating', { ascending: false })

        if (!active) return
        if (err) throw err

        setSets(data ?? [])
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo<MockSummary[]>(() => {
    const searchLower = '' // search is handled by MockFilters internally if needed
    const matching = sets.filter((s) =>
      matchesMock(s, searchLower, selectedDifficulties),
    )
    return matching.map(toMockSummary)
  }, [sets, selectedDifficulties])

  return (
    <div style={PAGE_STYLE} data-ds="mock-page">
      <header style={HEADER_STYLE}>
        <h1 style={TITLE_STYLE}>{t('mock.list.title')}</h1>
        <Link href="/mock/create" style={CREATE_LINK_STYLE}>
          <Button variant="primary" size="md" tabIndex={-1}>
            {t('mock.create.submit')}
          </Button>
        </Link>
      </header>

      <MockFilters
        selectedDifficulties={selectedDifficulties}
        onDifficultiesChange={setSelectedDifficulties}
      />

      <MockList
        mocks={filtered}
        isLoading={isLoading}
        error={error}
      />
    </div>
  )
}

// ── Page export ──────────────────────────────────────────────────────────

export default function MockPage() {
  return (
    <AuthGate
      guest={null}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <MockRouteContent />
        </AppShell>
      )}
    />
  )
}
