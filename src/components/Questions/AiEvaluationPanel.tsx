'use client'

/**
 * `<AiEvaluationPanel />` — панель отображения результата AI-оценки ответа
 * пользователя на вопрос (task 17.5;
 * Requirements 14.1, 14.2, 14.7, 20.1, 20.3).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       evaluation: AiEvaluation | null;
 *       isLoading?: boolean;
 *       error?: Error | null;
 *     }
 *
 *   Контракт `evaluation` (Req 14.2 — без изменения API `/api/evaluate`):
 *     Поле        | Источник                                    | Обяз.
 *     ------------|---------------------------------------------|-------
 *     score       | response.score (0..100)                     | да
 *     feedback    | response.feedback                           | да
 *     strengths   | необязательно — список «сильных сторон»     | нет
 *     improvements| необязательно — список «что улучшить»       | нет
 *
 *   Текущий backend `/api/evaluate` возвращает только `{ score, feedback,
 *   is_correct }` (см. `AIEvaluationResponse` в `src/types/database.ts`).
 *   Поля `strengths` / `improvements` опциональны и просто не рендерятся,
 *   когда не пришли от сервера. Контракт `/api/evaluate` НЕ меняется
 *   (Req 14.2). Если backend в будущем начнёт возвращать эти поля — UI
 *   их подхватит без изменений (Req 21.2).
 *
 *   Состояния (приоритет вычисления):
 *     1) `isLoading === true`               → loading-state (Req 20.1)
 *     2) `error != null`                    → error-state   (Req 20.3)
 *     3) `evaluation == null`               → empty-state
 *     4) success                            → результат (анимированно)
 *
 *   Анимация (Req 14.7, 10.1, 10.2, 10.8): success-блок обёрнут
 *   в `motion.div` со стандартным fade-in/slide-up через токены
 *   `duration.base` + `easing.standard` из `@/lib/motion`. При
 *   `prefers-reduced-motion: reduce` длительность переключается в 0
 *   через `reduced(...)`, узел `motion.*` не подменяется на статический
 *   `<div>` (Req 10.8). Loading/error/empty состояния не анимируются —
 *   это не изменения данных, а служебные индикаторы.
 *
 *   Score-бейдж (Req 14.1, 1.8):
 *     Бакеты по 10-балльной семантике, нормализованные к 100-балльному
 *     контракту backend через score/10 (round-half-down):
 *       0..3   → danger
 *       4..6   → warning
 *       7..8   → info
 *       9..10  → success
 *     В отображаемом тексте используется исходный 100-балльный score
 *     (`X из 100`, ключ `questions.detail.eval.scoreValue`), чтобы не
 *     терять точность контракта `/api/evaluate`.
 *
 *   Дизайн-токены (Req 1.8): фон/border/spacing/radius/typography —
 *   только через CSS-переменные (`--surface-*`, `--border-*`, `--space-*`,
 *   `--radius-*`, `--fs-*`, `--fw-*`, `--success`, `--danger`, `--info`,
 *   `--warning`). Никаких `#xxx` / `rgb()` / px-литералов в TSX.
 *
 *   i18n (Req 24.2): все строки через `t(...)`. Новые ключи:
 *     - `questions.detail.evaluation.score`
 *     - `questions.detail.evaluation.strengths`
 *     - `questions.detail.evaluation.improvements`
 *     - `questions.detail.evaluation.empty`
 *   Состояния loading/error используют общие ключи `state.loading` /
 *   `state.error.unknown`.
 */

import * as React from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'

import {
  Badge,
  EmptyState,
  ErrorState,
  GlassPanel,
  Skeleton,
} from '@/components/ui'
import { duration, easing, reduced } from '@/lib/motion'
import { t } from '@/lib/i18n'
import type { BadgeVariant } from '@/components/ui'

// ── Public types ────────────────────────────────────────────────────────

/**
 * Контракт результата AI-оценки. Совместим с `AIEvaluationResponse` из
 * `src/types/database.ts` (`{ score: number; feedback: string;
 * is_correct: boolean }`) и расширяет его необязательными полями
 * `strengths` / `improvements`. Контракт `/api/evaluate` сохраняется
 * unchanged (Req 14.2): дополнительные поля — опциональны и не нарушают
 * совместимости с текущим backend.
 */
export interface AiEvaluation {
  /** Балл от 0 до 100 (backend-контракт). */
  score: number
  /** Развёрнутый комментарий AI на русском. */
  feedback: string
  /** Опциональный список сильных сторон ответа. */
  strengths?: string[]
  /** Опциональный список того, что можно улучшить. */
  improvements?: string[]
}

export interface AiEvaluationPanelProps {
  /** Результат оценки. `null` означает «оценка ещё не запрошена». */
  evaluation: AiEvaluation | null
  /** Идёт сетевой запрос /api/evaluate. */
  isLoading?: boolean
  /** Ошибка сетевого запроса /api/evaluate. */
  error?: Error | null
  /** Дополнительный className на корневой GlassPanel. */
  className?: string
}

// ── Score → Badge variant mapping ───────────────────────────────────────

/**
 * Маппинг 0..100 score → вариант Badge в 10-балльной семантике
 * (постановка задачи 17.5):
 *   0..3   → danger
 *   4..6   → warning
 *   7..8   → info
 *   9..10  → success
 *
 * Используем `Math.floor(score / 10)`. Ровно 100 даёт 10 → success.
 * Отрицательные / NaN / >100 значения зажимаются в [0, 100] — это
 * пограничный случай, который не должен вылезать из backend, но мы
 * не доверяем данным внешнего источника (defensive).
 */
export function scoreBadgeVariant(score: number): BadgeVariant {
  if (!Number.isFinite(score)) return 'neutral'
  const clamped = Math.max(0, Math.min(100, score))
  const bucket = Math.floor(clamped / 10) // 0..10
  if (bucket <= 3) return 'danger'
  if (bucket <= 6) return 'warning'
  if (bucket <= 8) return 'info'
  return 'success'
}

// ── Styles (DS tokens only; Req 1.8) ────────────────────────────────────

const PANEL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  minWidth: 0,
}

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  flexWrap: 'wrap',
  minWidth: 0,
}

const SCORE_LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-semibold)',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  color: 'var(--border-700)',
  margin: 0,
  lineHeight: 1,
}

const FEEDBACK_TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-semibold)',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  color: 'var(--border-700)',
  margin: 0,
  lineHeight: 1,
}

const FEEDBACK_BODY_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-md)',
  fontWeight: 'var(--fw-regular)',
  lineHeight: 1.6,
  color: 'var(--border-800)',
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const SECTION_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  minWidth: 0,
}

const SECTION_TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-semibold)',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  margin: 0,
  lineHeight: 1,
}

const SECTION_TITLE_STRENGTHS_STYLE: CSSProperties = {
  ...SECTION_TITLE_STYLE,
  color: 'var(--success-strong)',
}

const SECTION_TITLE_IMPROVEMENTS_STYLE: CSSProperties = {
  ...SECTION_TITLE_STYLE,
  color: 'var(--info-strong)',
}

const LIST_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  paddingInlineStart: 0,
  margin: 0,
  listStyle: 'none',
}

const LIST_ITEM_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-regular)',
  lineHeight: 1.55,
  color: 'var(--border-800)',
  minWidth: 0,
}

const LIST_GLYPH_STYLE: CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'var(--space-5)',
  height: 'var(--space-5)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1,
  fontSize: 'var(--fs-sm)',
}

const LIST_GLYPH_STRENGTH_STYLE: CSSProperties = {
  ...LIST_GLYPH_STYLE,
  color: 'var(--success-strong)',
}

const LIST_GLYPH_IMPROVEMENT_STYLE: CSSProperties = {
  ...LIST_GLYPH_STYLE,
  color: 'var(--info-strong)',
}

const LOADING_LAYOUT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  minWidth: 0,
}

const LOADING_LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--border-700)',
  margin: 0,
  lineHeight: 1.4,
}

// ── Component ────────────────────────────────────────────────────────────

export function AiEvaluationPanel({
  evaluation,
  isLoading = false,
  error = null,
  className,
}: AiEvaluationPanelProps) {
  // Анимационный transition вычисляем на render через `reduced(...)`,
  // который сам читает `prefers-reduced-motion`. На сервере reduced(...)
  // вернёт исходное значение — это безопасно, т.к. данный компонент
  // помечен `'use client'` и фактическая анимация играется только в
  // браузере.
  const motionTransition = React.useMemo(
    () => ({
      duration: reduced(duration.base, 0),
      ease: easing.standard,
    }),
    [],
  )

  // ── 1. Loading (Req 20.1) ──
  if (isLoading) {
    return (
      <GlassPanel
        className={className}
        style={PANEL_STYLE}
        data-ds="ai-evaluation-panel"
        data-state="loading"
        data-testid="ai-evaluation-panel"
      >
        <p
          role="status"
          aria-live="polite"
          style={LOADING_LABEL_STYLE}
          data-testid="ai-evaluation-loading-label"
        >
          {t('state.loading')}
        </p>
        <div style={LOADING_LAYOUT_STYLE} aria-hidden="true">
          <Skeleton variant="line" />
          <Skeleton variant="line" />
          <Skeleton variant="card" />
        </div>
      </GlassPanel>
    )
  }

  // ── 2. Error (Req 20.3) ──
  if (error) {
    return (
      <GlassPanel
        className={className}
        style={PANEL_STYLE}
        data-ds="ai-evaluation-panel"
        data-state="error"
        data-testid="ai-evaluation-panel"
      >
        <ErrorState messageKey="state.error.unknown" />
      </GlassPanel>
    )
  }

  // ── 3. Empty ──
  if (evaluation === null) {
    return (
      <GlassPanel
        className={className}
        style={PANEL_STYLE}
        data-ds="ai-evaluation-panel"
        data-state="empty"
        data-testid="ai-evaluation-panel"
      >
        <EmptyState title={t('questions.detail.evaluation.empty')} />
      </GlassPanel>
    )
  }

  // ── 4. Success ──
  const variant = scoreBadgeVariant(evaluation.score)
  const scoreText = t('questions.detail.eval.scoreValue', {
    score: String(evaluation.score),
  })
  const strengths = evaluation.strengths ?? []
  const improvements = evaluation.improvements ?? []

  return (
    <GlassPanel
      className={className}
      style={PANEL_STYLE}
      data-ds="ai-evaluation-panel"
      data-state="success"
      data-testid="ai-evaluation-panel"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTransition}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          minWidth: 0,
        }}
        data-testid="ai-evaluation-content"
      >
        <header style={HEADER_STYLE} data-testid="ai-evaluation-header">
          <p style={SCORE_LABEL_STYLE}>
            {t('questions.detail.evaluation.score')}
          </p>
          <Badge
            variant={variant}
            data-testid="ai-evaluation-score-badge"
            data-score={evaluation.score}
          >
            {scoreText}
          </Badge>
        </header>

        <section style={SECTION_STYLE} aria-label={t('questions.detail.eval.feedbackTitle')}>
          <p style={FEEDBACK_TITLE_STYLE}>
            {t('questions.detail.eval.feedbackTitle')}
          </p>
          <p
            style={FEEDBACK_BODY_STYLE}
            data-testid="ai-evaluation-feedback"
          >
            {evaluation.feedback}
          </p>
        </section>

        {strengths.length > 0 ? (
          <section
            style={SECTION_STYLE}
            aria-label={t('questions.detail.evaluation.strengths')}
            data-testid="ai-evaluation-strengths"
          >
            <p style={SECTION_TITLE_STRENGTHS_STYLE}>
              {t('questions.detail.evaluation.strengths')}
            </p>
            <ul style={LIST_STYLE}>
              {strengths.map((s, i) => (
                <li key={`s-${i}`} style={LIST_ITEM_STYLE}>
                  <span aria-hidden="true" style={LIST_GLYPH_STRENGTH_STYLE}>
                    ✓
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {improvements.length > 0 ? (
          <section
            style={SECTION_STYLE}
            aria-label={t('questions.detail.evaluation.improvements')}
            data-testid="ai-evaluation-improvements"
          >
            <p style={SECTION_TITLE_IMPROVEMENTS_STYLE}>
              {t('questions.detail.evaluation.improvements')}
            </p>
            <ul style={LIST_STYLE}>
              {improvements.map((it, i) => (
                <li key={`i-${i}`} style={LIST_ITEM_STYLE}>
                  <span aria-hidden="true" style={LIST_GLYPH_IMPROVEMENT_STYLE}>
                    →
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </motion.div>
    </GlassPanel>
  )
}

export default AiEvaluationPanel
