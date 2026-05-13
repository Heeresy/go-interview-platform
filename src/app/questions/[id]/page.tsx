'use client'

/**
 * `/questions/[id]` — Questions_Module detail route.
 *
 * Перестроено под Design System v2 (task 17.7; Requirements 14.1, 21.1, 21.5,
 * 22.4, 22.5):
 *
 *   - Авторизованный пользователь видит контент внутри `AppShell`;
 *     гость уходит на `PublicLanding` через клиентский `AuthGate`,
 *     без `router.push` и без полной перезагрузки страницы (Req 6.8, 5.7).
 *   - Контент собирается из публичного API `@/components/questions`
 *     барреля: `<QuestionDetail />` (left/right grid + hint), внутри
 *     него — `<AnswerEditor />` как answer-slot. Под основной шапкой
 *     рендерятся `<AiEvaluationPanel />` и `<CommunityThread />`
 *     (Req 22.4, 22.5).
 *   - Старая разметка (Navbar / AIAssistant / inline-стили / motion-обёртки
 *     с framer-motion / AuraCard / MarkdownContent на странице) удалена
 *     полностью (Req 21.1, 21.5).
 *   - Бизнес-логика без изменений (Req 21.2):
 *       * Загрузка вопроса — `supabase.from('questions').select(...).eq('id', id).single()`;
 *       * Submit ответа на оценку — `POST /api/evaluate` (тот же контракт
 *         `{ question, reference_answer, user_answer } → { score, feedback,
 *         is_correct }`);
 *       * Persist ответа в `question_answers` (тот же набор полей).
 *
 * Состояния вопроса:
 *   - loading  → `<QuestionDetail />` ещё не имеет `question`, поэтому мы
 *     рендерим Skeleton-карту в shell-контейнере.
 *   - error / not-found → inline `<ErrorState />` со ссылкой назад через
 *     стандартную кнопку retry (повторная загрузка).
 *   - success → `<QuestionDetail question={...}>` + `<AnswerEditor />` slot,
 *     ниже — оценка и тред сообщества.
 */

import { useCallback, useEffect, useMemo, useState, use, type CSSProperties } from 'react'
import Link from 'next/link'

import { AppShell, AuthGate } from '@/components/shell'
import {
  AiEvaluationPanel,
  AnswerEditor,
  CommunityThread,
  QuestionDetail,
  type AiEvaluation,
  type CommunityComment,
} from '@/components/Questions'
import { PublicLanding } from '@/components/landing'
import { Button, EmptyState, ErrorState, GlassPanel, Skeleton } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import type { AIEvaluationResponse, Question } from '@/types/database'

// ── Layout (DS tokens only; Req 1.8) ─────────────────────────────────────

const PAGE_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
  width: '100%',
  minWidth: 0,
}

const BACK_LINK_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--border-700)',
  textDecoration: 'none',
  alignSelf: 'flex-start',
}

const NOT_FOUND_ACTIONS_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  marginTop: 'var(--space-4)',
}

const SKELETON_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 'var(--space-4)',
}

// ── Inner authenticated content ──────────────────────────────────────────

interface QuestionDetailRouteContentProps {
  /** Идентификатор вопроса из URL. */
  questionId: string
}

function QuestionDetailRouteContent({ questionId }: QuestionDetailRouteContentProps) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // Evaluation state — изолировано от загрузки вопроса.
  const [evaluation, setEvaluation] = useState<AiEvaluation | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluationError, setEvaluationError] = useState<Error | null>(null)

  // Загрузка вопроса. Без зависимостей от submit/answer — тех ререндеров
  // не должно вызывать повторный fetch.
  useEffect(() => {
    let active = true
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('questions')
          .select('*, category:categories(*)')
          .eq('id', questionId)
          .single()

        if (!active) return

        if (fetchError) throw fetchError
        setQuestion((data as Question | null) ?? null)
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
  }, [questionId, reloadToken])

  const handleRetryLoad = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  // Submit ответа на оценку. Контракт `/api/evaluate` без изменений
  // (Req 14.2, 21.2): `{ question, reference_answer, user_answer }` →
  // `{ score, feedback, is_correct }`. Дополнительно сохраняем ответ
  // в `question_answers` тем же набором полей, что и legacy-страница.
  const handleEvaluate = useCallback(
    async (answer: string) => {
      if (!question) return
      setIsEvaluating(true)
      setEvaluationError(null)
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: question.description,
            reference_answer: question.reference_answer,
            user_answer: answer,
          }),
        })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = (await res.json()) as AIEvaluationResponse
        setEvaluation({ score: data.score, feedback: data.feedback })

        // Persist в question_answers (best-effort, не блокирует UI):
        // если auth-сессии нет, просто не пишем — поведение совпадает
        // с legacy-страницей.
        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            await supabase.from('question_answers').insert({
              user_id: user.id,
              question_id: question.id,
              answer_text: answer,
              ai_score: data.score,
              ai_feedback: data.feedback,
              is_correct: data.is_correct,
            })
          }
        } catch {
          // Сетевая/RLS ошибка persist'а не должна ломать UX оценки;
          // результат evaluate уже показан пользователю.
        }
      } catch (err) {
        setEvaluationError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsEvaluating(false)
      }
    },
    [question],
  )

  // ── Loading ──
  if (isLoading) {
    return (
      <div style={PAGE_STYLE} data-ds="question-detail-page" data-state="loading">
        <Link href="/questions" style={BACK_LINK_STYLE}>
          ← {t('common.back')}
        </Link>
        <GlassPanel style={SKELETON_GRID_STYLE}>
          <Skeleton variant="line" />
          <Skeleton variant="line" />
          <Skeleton variant="card" />
        </GlassPanel>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div style={PAGE_STYLE} data-ds="question-detail-page" data-state="error">
        <Link href="/questions" style={BACK_LINK_STYLE}>
          ← {t('common.back')}
        </Link>
        <ErrorState messageKey="state.error.unknown" retry={handleRetryLoad} />
      </div>
    )
  }

  // ── Not found ──
  if (!question) {
    return (
      <div style={PAGE_STYLE} data-ds="question-detail-page" data-state="empty">
        <Link href="/questions" style={BACK_LINK_STYLE}>
          ← {t('common.back')}
        </Link>
        <GlassPanel>
          <EmptyState
            title={t('state.empty.title')}
            description={t('state.empty.description')}
          />
          <div style={NOT_FOUND_ACTIONS_STYLE}>
            <Link href="/questions">
              <Button variant="secondary" size="md">
                {t('common.back')}
              </Button>
            </Link>
          </div>
        </GlassPanel>
      </div>
    )
  }

  // ── Success ──
  return (
    <div style={PAGE_STYLE} data-ds="question-detail-page" data-state="success">
      <Link href="/questions" style={BACK_LINK_STYLE}>
        ← {t('common.back')}
      </Link>

      <QuestionDetail question={question}>
        <AnswerEditor
          questionId={question.id}
          onSubmit={handleEvaluate}
        />
      </QuestionDetail>

      <AiEvaluationPanel
        evaluation={evaluation}
        isLoading={isEvaluating}
        error={evaluationError}
      />

      <CommunityThread
        questionId={question.id}
        comments={EMPTY_COMMENTS as CommunityComment[]}
      />
    </div>
  )
}

/**
 * Стабильная пустая ссылка для CommunityThread, чтобы не пересоздавать
 * массив на каждом рендере. CommunityThread рендерит empty-state, когда
 * комментариев нет; источник комментариев в текущей схеме базы
 * отсутствует (Req 21.3 — схему не меняем), поэтому страница передаёт
 * read-only тред без `onPost`.
 */
const EMPTY_COMMENTS: readonly CommunityComment[] = Object.freeze([])

// ── Page export ──────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function QuestionDetailPage({ params }: PageProps) {
  // Next.js 16 App Router: `params` — Promise. Разворачиваем через `use()`
  // ровно так же, как делает legacy-страница, чтобы не нарушать контракт.
  const { id } = use(params)

  // useMemo на случай ре-рендера: AuthGate стабилен, но render-функция
  // `authenticated` пересоздаётся на каждый рендер. Содержимое
  // `QuestionDetailRouteContent` зависит только от `id`, поэтому
  // мемоизация не критична — оставляем простую форму.
  const content = useMemo(
    () => <QuestionDetailRouteContent questionId={id} />,
    [id],
  )

  return (
    <AuthGate
      guest={<PublicLanding />}
      authenticated={({ user }) => (
        <AppShell user={user}>{content}</AppShell>
      )}
    />
  )
}
