'use client'

/**
 * `<MockCard />` — карточка мок-интервью для `Mock_Module`
 * (task 20.1; Requirements 17.1, 17.2, 17.3, 22.1, 24.2).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       mock: {
 *         id: string;
 *         title: string;
 *         difficulty: number;        // 1…5
 *         category: string;          // человекочитаемое имя категории
 *         averageRating: number;     // 0…5
 *         commentCount: number;      // ≥ 0
 *       };
 *     }
 *
 *   - `GlassCard`-поверхность (Req 3.4, 3.5 через класс `.glass`) с
 *     внутренней раскладкой:
 *       • строка бейджей: difficulty + category;
 *       • заголовок;
 *       • футер: звёзды рейтинга + счётчик комментариев.
 *   - Ссылка на `/mock/{id}` (Req 17.1). Ссылка оборачивает всё
 *     содержимое карточки, чтобы клик в любую точку вёл на страницу
 *     мока (Req 17.3: открытие `/mock/[id]` остаётся работоспособным
 *     даже при крахе фильтров — карточка сама по себе полностью
 *     functional).
 *   - Все строки через `t()` (Req 24.2). Difficulty-метка — через
 *     `getDifficultyLabel()`; неизвестные значения difficulty (вне
 *     диапазона 1…5) отображаются без метки (`—`).
 *   - Стили — только токены DS (Req 1.8).
 *   - Рейтинг — 5 звёзд, заполняются пропорционально
 *     `Math.round(averageRating)`. Числовое значение рядом, для
 *     a11y — `aria-label` через `t('mock.card.ratingAriaLabel')`.
 *   - Комментарии — иконка + счётчик; `aria-label` через
 *     `t('mock.card.commentsAriaLabel')`.
 */

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { MessageSquare, Star } from 'lucide-react'

import { Badge, GlassCard } from '@/components/ui'
import { t } from '@/lib/i18n'
import { getDifficultyLabel } from '@/lib/utils'
import type { Difficulty } from '@/types/database'

// ── Public data shape ───────────────────────────────────────────────────

/**
 * Нормализованный summary мок-интервью, как его ждёт карточка.
 * Преднамеренно **не** импортирует `MockSet` из `types/database.ts`:
 * страница (`/mock/page.tsx`) отвечает за маппинг доменной модели
 * Supabase в этот минимальный контракт, чтобы карточка оставалась
 * независимой от схемы БД (Req 22.4).
 */
export interface MockSummary {
    /** UUID мок-сета. */
    id: string
    /** Человекочитаемый заголовок. */
    title: string
    /** Сложность 1…5 (выходящие за диапазон значения обрабатываются корректно). */
    difficulty: number
    /** Человекочитаемое имя категории. */
    category: string
    /** Средний рейтинг 0…5 (float). */
    averageRating: number
    /** Количество комментариев ≥ 0. */
    commentCount: number
}

export interface MockCardProps {
    /** Данные мок-сета. */
    mock: MockSummary
    /** Дополнительный className на корневой `GlassCard`. */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const CARD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-5)',
    minHeight: 'var(--space-32)',
    borderRadius: 'var(--radius-lg)',
    color: 'inherit',
    textDecoration: 'none',
}

const LINK_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    color: 'inherit',
    textDecoration: 'none',
    flex: 1,
    minWidth: 0,
}

const BADGES_ROW_STYLE: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
}

const TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    color: 'var(--border-900)',
    margin: 0,
}

const FOOTER_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    marginTop: 'auto',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-700)',
}

const STARS_ROW_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    color: 'var(--warning-strong)',
    fontVariantNumeric: 'tabular-nums',
}

const STARS_ICONS_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'calc(var(--space-1) / 2)',
}

const STAR_ICON_FILLED_STYLE: CSSProperties = {
    color: 'var(--warning-strong)',
    fill: 'var(--warning-strong)',
}

const STAR_ICON_EMPTY_STYLE: CSSProperties = {
    color: 'var(--border-300)',
    fill: 'transparent',
}

const RATING_VALUE_STYLE: CSSProperties = {
    color: 'var(--border-800)',
    fontWeight: 'var(--fw-semibold)',
}

const COMMENTS_ROW_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    color: 'var(--border-700)',
    fontVariantNumeric: 'tabular-nums',
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Маппинг Difficulty → вариант Badge. Лёгкие уровни — `success`,
 * средние — `info`, сложные — `warning`, экспертный — `danger`.
 * Зеркалит QuestionsList/TasksList для консистентности DS.
 */
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

/**
 * Безопасное форматирование среднего рейтинга: `2.5` → «2.5»,
 * `NaN`/`Infinity` → «—».
 */
function formatRating(value: number): string {
    if (!Number.isFinite(value)) return '—'
    const clamped = Math.max(0, Math.min(5, value))
    return clamped.toFixed(1)
}

/**
 * Безопасное представление количества комментариев. Отрицательные
 * значения и `NaN` фиксируются в 0 — иначе ariaLabel и UI могли бы
 * показать противоречивые данные.
 */
function formatCommentCount(value: number): number {
    if (!Number.isFinite(value) || value < 0) return 0
    return Math.floor(value)
}

/**
 * Безопасное получение difficulty-метки: если значение вне диапазона
 * `Difficulty = 1..5` — возвращаем «—».
 */
function difficultyLabel(d: number): string {
    if (d === 1 || d === 2 || d === 3 || d === 4 || d === 5) {
        return getDifficultyLabel(d as Difficulty)
    }
    return '—'
}

// ── Stars ───────────────────────────────────────────────────────────────

const STAR_COUNT = 5

function RatingStars({ rating }: { rating: number }) {
    const clamped = Number.isFinite(rating)
        ? Math.max(0, Math.min(STAR_COUNT, rating))
        : 0
    const filled = Math.round(clamped)
    return (
        <span
            aria-hidden="true"
            style={STARS_ICONS_STYLE}
            data-testid="mock-card-stars"
        >
            {Array.from({ length: STAR_COUNT }).map((_, i) => (
                <Star
                    key={i}
                    size={14}
                    strokeWidth={2}
                    style={
                        i < filled
                            ? STAR_ICON_FILLED_STYLE
                            : STAR_ICON_EMPTY_STYLE
                    }
                />
            ))}
        </span>
    )
}

// ── Public component ────────────────────────────────────────────────────

export function MockCard({ mock, className }: MockCardProps) {
    const difficultyVariant = difficultyBadgeVariant(mock.difficulty)
    const diffLabel = difficultyLabel(mock.difficulty)
    const ratingStr = formatRating(mock.averageRating)
    const commentCount = formatCommentCount(mock.commentCount)

    const ratingAriaLabel = t('mock.card.ratingAriaLabel', {
        value: ratingStr,
    })
    const commentsAriaLabel = t('mock.card.commentsAriaLabel', {
        count: commentCount,
    })

    return (
        <GlassCard
            className={className}
            style={CARD_STYLE}
            data-testid="mock-card"
            data-difficulty={mock.difficulty}
            data-rating={ratingStr}
        >
            <Link
                href={`/mock/${mock.id}`}
                style={LINK_STYLE}
                data-testid="mock-card-link"
            >
                <div style={BADGES_ROW_STYLE}>
                    <Badge variant={difficultyVariant}>{diffLabel}</Badge>
                    {mock.category ? (
                        <Badge variant="neutral">{mock.category}</Badge>
                    ) : null}
                </div>
                <h3 style={TITLE_STYLE}>{mock.title}</h3>
                <div style={FOOTER_STYLE}>
                    <span
                        style={STARS_ROW_STYLE}
                        aria-label={ratingAriaLabel}
                        data-testid="mock-card-rating"
                    >
                        <RatingStars rating={mock.averageRating} />
                        <span style={RATING_VALUE_STYLE}>{ratingStr}</span>
                    </span>
                    <span
                        style={COMMENTS_ROW_STYLE}
                        aria-label={commentsAriaLabel}
                        data-testid="mock-card-comments"
                    >
                        <MessageSquare
                            size={14}
                            strokeWidth={2}
                            aria-hidden="true"
                        />
                        <span>{commentCount}</span>
                    </span>
                </div>
            </Link>
        </GlassCard>
    )
}

export default MockCard
