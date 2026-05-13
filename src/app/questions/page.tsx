'use client'

/**
 * `/questions` — Questions_Module index route.
 *
 * Перестроено под Design System v2 (task 17.7; Requirements 14.1, 21.1, 21.5,
 * 22.4, 22.5):
 *
 *   - Авторизованный пользователь видит контент внутри `AppShell`;
 *     гость уходит на `PublicLanding` через клиентский `AuthGate`,
 *     без `router.push` и без полной перезагрузки страницы (Req 6.8, 5.7).
 *   - Контент собирается из публичного API `@/components/questions`
 *     (барреля), без обращения во внутренние файлы — Req 22.4, 22.5.
 *   - Старая разметка (Navbar / AIAssistant / inline-стили / motion-обёртки)
 *     удалена полностью — её место заняли DS v2 примитивы и модульные
 *     компоненты `<QuestionFilters />` + `<QuestionsList />` (Req 21.1, 21.5).
 *   - Бизнес-логика (Supabase-запросы, схема БД, контракт `/api/evaluate`)
 *     **не меняется** — данные тянутся ровно теми же запросами
 *     (`categories`, `questions` с `category:categories(*)`), просто без
 *     legacy-UI вокруг.
 *
 * Контракт фильтрации:
 *   - `search` — клиентский full-text по `title` + `description` (case-
 *     insensitive). Фильтр на сервер не уходит — список вопросов
 *     невелик и уже загружен; так совпадает поведение с прежней
 *     legacy-страницей (Req 21.2: контракт без изменений).
 *   - `selectedTags` — массив имён категорий. UI чипы рендерит
 *     `<QuestionFilters />`; матчинг идёт по `question.category?.name`.
 *     Difficulty-фильтр не выставляется на этом маршруте — Design v2
 *     ограничивает фильтр-панель «поиск + теги» (см. design.md
 *     Questions_Module: «sticky glass filter panel», Req 14.4).
 */

import { useEffect, useMemo, useState } from 'react'

import { AppShell, AuthGate } from '@/components/shell'
import { QuestionFilters, QuestionsList } from '@/components/Questions'
import { PublicLanding } from '@/components/landing'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import type { Category, Question } from '@/types/database'

import type { CSSProperties } from 'react'

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

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Клиентский матчер «вопрос проходит фильтр».
 *
 * - `search` — substring (lowercase) в `title` + `description`. Пустая
 *    строка пропускает все вопросы.
 * - `tags`   — пересечение по `question.category?.name`. Пустой массив
 *    пропускает все вопросы.
 */
function matchesQuestion(
  question: Question,
  searchLower: string,
  tags: string[],
): boolean {
  if (searchLower.length > 0) {
    const haystack = `${question.title} ${question.description}`.toLowerCase()
    if (!haystack.includes(searchLower)) return false
  }
  if (tags.length > 0) {
    const categoryName = question.category?.name
    if (!categoryName || !tags.includes(categoryName)) return false
  }
  return true
}

// ── Inner authenticated content ──────────────────────────────────────────

/**
 * Контент, рендерящийся **только для авторизованного пользователя**
 * внутри `AppShell`. Вынесен в отдельный компонент, чтобы не
 * монтировать Supabase-запросы и хуки до прохождения `AuthGate`.
 */
function QuestionsRouteContent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Initial load: categories + questions. Без useCallback и без зависимостей —
  // фильтрация на этой странице клиентская, дополнительные round-trip'ы
  // на смену search / tags не нужны (Req 21.2 — контракт API без изменений).
  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function load() {
      try {
        const [catsRes, qRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase
            .from('questions')
            .select('*, category:categories(*)')
            .order('difficulty')
            .order('created_at', { ascending: false }),
        ])

        if (!active) return

        if (catsRes.error) throw catsRes.error
        if (qRes.error) throw qRes.error

        setCategories(catsRes.data ?? [])
        setQuestions(qRes.data ?? [])
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

  const availableTags = useMemo<string[]>(
    () => categories.map((c) => c.name),
    [categories],
  )

  const filtered = useMemo<Question[]>(() => {
    const searchLower = search.trim().toLowerCase()
    if (searchLower.length === 0 && selectedTags.length === 0) return questions
    return questions.filter((q) => matchesQuestion(q, searchLower, selectedTags))
  }, [questions, search, selectedTags])

  return (
    <div style={PAGE_STYLE} data-ds="questions-page">
      <header style={HEADER_STYLE}>
        <h1 style={TITLE_STYLE}>{t('questions.list.title')}</h1>
      </header>

      <QuestionFilters
        search={search}
        onSearchChange={setSearch}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        availableTags={availableTags}
      />

      <QuestionsList
        questions={filtered}
        isLoading={isLoading}
        error={error}
      />
    </div>
  )
}

// ── Page export ──────────────────────────────────────────────────────────

export default function QuestionsPage() {
  return (
    <AuthGate
      guest={<PublicLanding />}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <QuestionsRouteContent />
        </AppShell>
      )}
    />
  )
}
