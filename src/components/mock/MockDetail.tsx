'use client'

/**
 * `<MockDetail />` — детальный экран мок-интервью для `Mock_Module`
 * (task 20.3; Requirements 17.1, 17.5, 22.1, 22.4, 24.2, 1.8).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       mock: {
 *         id: string;
 *         title: string;
 *         description: string | null;
 *         difficulty: number;       // 1..5
 *         category: string;
 *         averageRating: number;    // 0..5
 *         commentCount: number;     // ≥ 0
 *       };
 *       ratingControl?: ReactNode;
 *       commentThread?: ReactNode;
 *     }
 *
 *   Компоновка (внутри `<GlassPanel>`):
 *     - Заголовок мок-интервью (`<h1>`).
 *     - Бейджи: difficulty (вариант по уровню) + category (neutral) +
 *       средний рейтинг (info) + счётчик комментариев (neutral).
 *     - Описание (если присутствует).
 *     - Слот `ratingControl` под подзаголовком `t('mock.detail.rate')`.
 *     - Слот `commentThread` под подзаголовком `t('mock.detail.comments')`.
 *
 *   Слоты (Req 22.4): `ratingControl` и `commentThread` — ReactNode-
 *   слоты, которые потребитель композирует на странице (`<MockDetail>
 *   <RatingControl onChange={...} /> <CommentThread comments={...} />
 *   </MockDetail>`). Это сохраняет MockDetail чистым presentational-
 *   компонентом без знания о Supabase-запросах. Если слот не передан
 *   — соответствующая секция не рендерится.
 *
 *   i18n (Req 24.2): все строки через `t()`. Используются ключи
 *   `mock.detail.rate`, `mock.detail.comments`, `mock.detail.description`,
 *   `mock.card.ratingAriaLabel`, `mock.card.commentsAriaLabel`.
 *
 *   Стили — только токены DS (Req 1.8). Никаких `#xxx` / `rgb()` /
 *   px-литералов.
 */

import { MessageSquare, Star } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { Badge, GlassPanel } from '@/components/ui'
import { t } from '@/lib/i18n'
import { getDifficultyLabel } from '@/lib/utils'
import type { Difficulty } from '@/types/database'

// ── Public types ────────────────────────────────────────────────────────

/**
 * Нормализованный shape мок-интервью для детальной страницы.
 * Не импортирует `MockSet` из `types/database.ts`: страница маппит
 * Supabase-модель в этот контракт (Req 22.4), сохраняя компонент
 * независимым от схемы БД.
 */
export interface MockDetailSummary {
  /** UUID мок-сета. */
  id: string
  /** Человекочитаемый заголовок. */
  title: string
  /** Опциональное описание мок-интервью. */
  description: string | null
  /** Сложность 1..5; значения вне диапазона рендерятся как «—». */
  difficulty: number
  /** Человекочитаемое имя категории. */
  category: string
  /** Средний рейтинг 0..5 (float). */
  averageRating: number
  /** Количество комментариев ≥ 0. */
  commentCount: number
}

export interface MockDetailProps {
  /** Данные мок-сета. */
  mock: MockDetailSummary
  /**
   * Слот для `<RatingControl />`. Композируется потребителем на
   * странице. Если не передан — секция рейтинга не рендерится.
   */
  ratingControl?: ReactNode
  /**
   * Слот для `<CommentThread />`. Композируется потребителем на
   * странице. Если не передан — секция комментариев не рендерится.
   */
  commentThread?: ReactNode
  /** Дополнительный className на корневой GlassPanel. */
  className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const PANEL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  width: '100%',
  minWidth: 0,
}

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  minWidth: 0,
}

const TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-2xl)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-900)',
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
  margin: 0,
}

const BADGES_ROW_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--space-2)',
}

const BADGE_INNER_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  fontVariantNumeric: 'tabular-nums',
}

const ICON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const DESCRIPTION_STYLE: CSSProperties = {
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
  gap: 'var(--space-3)',
  minWidth: 0,
}

const SECTION_TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-lg)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-900)',
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
  margin: 0,
}

// ── Helpers ─────────────────────────────────────────────────────────────

function difficultyBadgeVariant(
  d: number,
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (!Number.isFinite(d)) return 'neutral'
  if (d <= 1) return 'success'
  if (d === 2) return 'info'
  if (d === 3) return 'info'
  if (d === 4) return 'warning'
  if (d >= 5) return 'danger'
  return 'neutral'
}

function difficultyLabel(d: number): string {
  if (d === 1 || d === 2 || d === 3 || d === 4 || d === 5) {
    return getDifficultyLabel(d as Difficulty)
  }
  return '—'
}

function formatRating(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const clamped = Math.max(0, Math.min(5, value))
  return clamped.toFixed(1)
}

function formatCommentCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}

// ── Component ───────────────────────────────────────────────────────────

export function MockDetail({
  mock,
  ratingControl,
  commentThread,
  className,
}: MockDetailProps) {
  const diffVariant = difficultyBadgeVariant(mock.difficulty)
  const diffLabel = difficultyLabel(mock.difficulty)
  const ratingStr = formatRating(mock.averageRating)
  const commentCount = formatCommentCount(mock.commentCount)
  const description =
    mock.description && mock.description.trim().length > 0
      ? mock.description
      : null

  return (
    <GlassPanel
      className={className}
      style={PANEL_STYLE}
      data-ds="mock-detail"
      data-mock-id={mock.id}
      data-testid="mock-detail"
    >
      <header style={HEADER_STYLE}>
        <h1 style={TITLE_STYLE}>{mock.title}</h1>
        <div style={BADGES_ROW_STYLE} data-testid="mock-detail-badges">
          <Badge variant={diffVariant}>{diffLabel}</Badge>
          {mock.category ? (
            <Badge variant="neutral">{mock.category}</Badge>
          ) : null}
          <Badge
            variant="info"
            aria-label={t('mock.detail.averageRatingAriaLabel', {
              value: ratingStr,
            })}
          >
            <span style={BADGE_INNER_STYLE}>
              <span style={ICON_STYLE} aria-hidden="true">
                <Star size={12} strokeWidth={2} />
              </span>
              {ratingStr}
            </span>
          </Badge>
          <Badge
            variant="neutral"
            aria-label={t('mock.card.commentsAriaLabel', {
              count: commentCount,
            })}
          >
            <span style={BADGE_INNER_STYLE}>
              <span style={ICON_STYLE} aria-hidden="true">
                <MessageSquare size={12} strokeWidth={2} />
              </span>
              {commentCount}
            </span>
          </Badge>
        </div>
      </header>

      {description ? (
        <section
          style={SECTION_STYLE}
          aria-label={t('mock.detail.description')}
          data-testid="mock-detail-description"
        >
          <h2 style={SECTION_TITLE_STYLE}>{t('mock.detail.description')}</h2>
          <p style={DESCRIPTION_STYLE}>{description}</p>
        </section>
      ) : null}

      {ratingControl ? (
        <section
          style={SECTION_STYLE}
          aria-label={t('mock.detail.rate')}
          data-testid="mock-detail-rating-section"
        >
          <h2 style={SECTION_TITLE_STYLE}>{t('mock.detail.rate')}</h2>
          {ratingControl}
        </section>
      ) : null}

      {commentThread ? (
        <section
          style={SECTION_STYLE}
          aria-label={t('mock.detail.comments')}
          data-testid="mock-detail-comments-section"
        >
          {commentThread}
        </section>
      ) : null}
    </GlassPanel>
  )
}

export default MockDetail
