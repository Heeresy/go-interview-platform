'use client'

/**
 * `/mock/create` — Mock_Module creation route.
 *
 * Перестроено под Design System v2 (task 20.4; Requirements 17.1, 17.6,
 * 21.1, 21.3, 21.5, 22.4, 22.5):
 *
 *   - Авторизованный пользователь видит контент внутри `AppShell`;
 *     гость получает `null` (middleware перенаправляет на `/login`).
 *   - Контент — `<MockCreateStepper />` из публичного API
 *     `@/components/mock` (барреля) — Req 22.4, 22.5.
 *   - Старая разметка (inline-стили / checkbox-списки / двухколоночный
 *     layout) удалена полностью — её место занял многошаговый stepper
 *     с валидацией (Req 17.4, 21.1, 21.5).
 *   - Бизнес-логика (Supabase insert в `mock_sets`) **не меняется** —
 *     маппинг `MockDraft` → insert-строки делается здесь (Req 21.3).
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'

import { AppShell, AuthGate } from '@/components/shell'
import { MockCreateStepper } from '@/components/mock'
import type { MockDraft } from '@/components/mock'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import type { Category } from '@/types/database'

// ── Layout (DS tokens only; Req 1.8) ─────────────────────────────────────

const PAGE_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
  width: '100%',
  maxWidth: '640px',
  minWidth: 0,
}

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
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

// ── Inner authenticated content ──────────────────────────────────────────

function MockCreateRouteContent() {
  const router = useRouter()
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order')

      if (active && data) {
        setCategories(data)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = useCallback(
    async (draft: MockDraft) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('mock_sets').insert({
        created_by: user.id,
        title: draft.title,
        description: null,
        difficulty: draft.difficulty,
        question_ids: [],
        task_ids: null,
        is_published: true,
      })

      if (error) throw error

      router.push('/mock')
    },
    [router],
  )

  return (
    <div style={PAGE_STYLE} data-ds="mock-create-page">
      <header style={HEADER_STYLE}>
        <h1 style={TITLE_STYLE}>{t('mock.create.title')}</h1>
      </header>

      <MockCreateStepper
        onSubmit={handleSubmit}
        categories={categories}
      />
    </div>
  )
}

// ── Page export ──────────────────────────────────────────────────────────

export default function CreateMockPage() {
  return (
    <AuthGate
      guest={null}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <MockCreateRouteContent />
        </AppShell>
      )}
    />
  )
}
