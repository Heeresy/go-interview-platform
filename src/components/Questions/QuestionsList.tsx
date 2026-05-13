'use client'

/**
 * `<QuestionsList />` — карточная сетка вопросов для `Questions_Module`
 * (task 17.1; Requirements 14.1, 14.4, 22.1, 24.2).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       questions: Question[];
 *       isLoading?: boolean;
 *       error?: Error | null;
 *     }
 *
 *   - **Только карточная сетка.** Ни при каком состоянии (loading,
 *     error, empty) компонент НЕ переключается на альтернативный
 *     layout (таблица, list-view, детали-страница и т.п.) — прямой
 *     контракт задачи 14.1/14.4. Ветки отличаются только *содержимым*
 *     grid-ячеек и/или inline-стейтом над сеткой.
 *
 *   - Grid — `display: grid;
 *     grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));`.
 *     То есть «BentoGrid-like» авто-fill без фиксированного числа
 *     колонок (задача 17.1). `minmax(280px, 1fr)` — единственное
 *     литеральное px-значение в модуле, оно явно прописано
 *     постановкой задачи как минимальная ширина карточки. Все
 *     прочие величины — токены (`--space-*`, `--radius-*`).
 *
 *   - Ветки (последовательность приоритетов):
 *
 *       1) `error` truthy → в сетке рендерятся **6 Skeleton-карточек
 *          для визуального сохранения layout'а** + над сеткой
 *          inline `<ErrorState messageKey="state.error.unknown" />`.
 *          Грид остаётся карточным, error-state показывается
 *          встроено — без полноэкранного overlay и без подмены layout.
 *
 *       2) `isLoading` truthy → 6 Skeleton-карточек в сетке
 *          (Req 20.1). Само по себе empty-/error-состояние при
 *          одновременно-поднятом loading игнорируется: loading
 *          имеет приоритет ниже error, но выше empty.
 *
 *       3) `questions.length === 0` → одна ячейка во всю ширину
 *          с `<EmptyState />` (Req 20.2). Сетка сохраняется
 *          (обёртка-grid остаётся, пустой state занимает
 *          `grid-column: 1 / -1`) — никакого fallback-layout.
 *
 *       4) иначе → карточки с вопросами, каждая — `<GlassCard>`
 *          с заголовком, тегами (категория) и difficulty-badge.
 *
 *   - Все пользовательские строки — через `t()` (Req 24.2).
 *   - Стили — только токены DS (Req 1.8).
 */

import Link from 'next/link'
import type { CSSProperties } from 'react'

import {
    Badge,
    EmptyState,
    ErrorState,
    GlassCard,
    Skeleton,
} from '@/components/ui'
import { t } from '@/lib/i18n'
import { getDifficultyLabel } from '@/lib/utils'
import type { Difficulty, Question } from '@/types/database'

export interface QuestionsListProps {
    /** Список вопросов для рендера. Порядок сохраняется. */
    questions: Question[]
    /** Флаг загрузки. Если `true` — показываются 6 Skeleton-карточек. */
    isLoading?: boolean
    /** Ошибка. Если truthy — над сеткой рендерится `<ErrorState />`. */
    error?: Error | null
    /** Дополнительный className на grid-контейнер. */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

/**
 * Корневой контейнер: вертикальный flex, в который попадают
 * inline-стейты (ErrorState) *над* сеткой, и сама grid-сетка *под*
 * ними. Это позволяет сохранить карточный grid во всех ветках без
 * переключения layout (прямой контракт 14.4).
 */
const ROOT_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    width: '100%',
    minWidth: 0,
}

const GRID_STYLE: CSSProperties = {
    display: 'grid',
    // `minmax(280px, 1fr)` — единственный px-литерал, разрешённый
    // прямой постановкой задачи 17.1: минимальная ширина карточки
    // вопроса в auto-fill сетке.
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 'var(--space-4)',
    minWidth: 0,
    width: '100%',
}

const EMPTY_CELL_STYLE: CSSProperties = {
    // Растягиваем пустой/ошибочный state на всю строку,
    // сохраняя при этом grid-контейнер (не заменяя его).
    gridColumn: '1 / -1',
    minWidth: 0,
}

const CARD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-5)',
    // Обеспечиваем единообразную минимальную высоту — карточки
    // с коротким описанием не «схлопываются».
    minHeight: 'var(--space-28)',
    // GlassCard сам выставляет `.glass` через CSS-класс; тут
    // добавляем radius, чтобы grid-ячейка смотрелась согласованно
    // с сеткой (token-only).
    borderRadius: 'var(--radius-lg)',
    // Ссылка-wrapper должна визуально не отличаться от прочего
    // текста; переопределяем дефолтный underline.
    color: 'inherit',
    textDecoration: 'none',
}

const CARD_BADGES_STYLE: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
}

const CARD_TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    color: 'var(--border-900)',
    margin: 0,
}

const CARD_DESCRIPTION_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    lineHeight: 1.5,
    color: 'var(--border-700)',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1,
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Маппинг Difficulty → вариант Badge. Лёгкие уровни — `success`,
 * средние — `info`, сложные — `warning`, экспертный — `danger`.
 * Таким образом цветовая семантика всегда берётся из токенов.
 */
function difficultyBadgeVariant(
    d: Difficulty,
): 'success' | 'info' | 'warning' | 'danger' {
    if (d <= 1) return 'success'
    if (d === 2) return 'info'
    if (d === 3) return 'info'
    if (d === 4) return 'warning'
    return 'danger'
}

// ── Skeleton cell ────────────────────────────────────────────────────────

function SkeletonGrid({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="card"
                    label={t('state.loading')}
                    data-testid="questions-list-skeleton"
                />
            ))}
        </>
    )
}

// ── Card cell ────────────────────────────────────────────────────────────

function QuestionCard({ question }: { question: Question }) {
    const categoryName = question.category?.name
    const variant = difficultyBadgeVariant(question.difficulty)

    return (
        <GlassCard style={CARD_STYLE} data-testid="questions-list-card">
            <Link
                href={`/questions/${question.id}`}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                    color: 'inherit',
                    textDecoration: 'none',
                    flex: 1,
                    minWidth: 0,
                }}
                data-testid="questions-list-card-link"
            >
                <div style={CARD_BADGES_STYLE}>
                    <Badge variant={variant}>
                        {getDifficultyLabel(question.difficulty)}
                    </Badge>
                    {categoryName ? (
                        <Badge variant="neutral">{categoryName}</Badge>
                    ) : null}
                </div>
                <h3 style={CARD_TITLE_STYLE}>{question.title}</h3>
                {question.description ? (
                    <p style={CARD_DESCRIPTION_STYLE}>
                        {question.description}
                    </p>
                ) : null}
            </Link>
        </GlassCard>
    )
}

// ── Public component ─────────────────────────────────────────────────────

export function QuestionsList({
    questions,
    isLoading = false,
    error = null,
    className,
}: QuestionsListProps) {
    // Ветка 1: error — над grid inline ErrorState, а сетка остаётся
    // в карточном виде со Skeleton-плейсхолдерами. Это удерживает
    // layout «только карточная сетка» даже при ошибке (Req 14.4).
    if (error) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="questions-list"
                data-state="error"
            >
                <ErrorState messageKey="state.error.unknown" />
                <div style={GRID_STYLE}>
                    <SkeletonGrid count={6} />
                </div>
            </div>
        )
    }

    // Ветка 2: loading.
    if (isLoading) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="questions-list"
                data-state="loading"
            >
                <div style={GRID_STYLE}>
                    <SkeletonGrid count={6} />
                </div>
            </div>
        )
    }

    // Ветка 3: empty.
    if (questions.length === 0) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="questions-list"
                data-state="empty"
            >
                <div style={GRID_STYLE}>
                    <div style={EMPTY_CELL_STYLE}>
                        <EmptyState
                            title={t('state.empty.title')}
                            description={t('state.empty.description')}
                        />
                    </div>
                </div>
            </div>
        )
    }

    // Ветка 4: success — рендер карточек вопросов.
    return (
        <div
            className={className}
            style={ROOT_STYLE}
            data-ds="questions-list"
            data-state="ready"
        >
            <div style={GRID_STYLE} data-testid="questions-list-grid">
                {questions.map((q) => (
                    <QuestionCard key={q.id} question={q} />
                ))}
            </div>
        </div>
    )
}

export default QuestionsList
