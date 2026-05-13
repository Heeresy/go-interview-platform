'use client'

/**
 * `<TasksList />` — карточная сетка задач для `Tasks_Module`
 * (task 18.1; Requirements 15.1, 20.1, 20.2, 20.3, 14.4, 22.1, 22.4,
 * 24.2).
 *
 * Зеркалит `QuestionsList.tsx` (task 17.1): тот же auto-fill grid
 * `repeat(auto-fill, minmax(280px, 1fr))`, та же последовательность
 * веток `error → loading → empty → ready`, тот же запрет на
 * fallback-layout. Различия — только в доменной модели (`Task`
 * вместо `Question`), href (`/tasks/{id}`) и полях карточки.
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       tasks: Task[];
 *       isLoading?: boolean;
 *       error?: Error | null;
 *     }
 *
 *   - **Только карточная сетка.** Ни при каком состоянии компонент
 *     НЕ переключается на альтернативный layout (таблица, list,
 *     детали-страница) — Req 14.4/15.1. Ветки отличаются только
 *     *содержимым* grid-ячеек и/или inline-стейтом над сеткой.
 *
 *   - Grid — `display: grid;
 *     grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));`.
 *     `minmax(280px, 1fr)` — единственное px-литеральное значение в
 *     модуле, оно прямо зафиксировано постановкой задачи 18.1 как
 *     минимальная ширина карточки. Все прочие величины — токены
 *     (`--space-*`, `--radius-*`).
 *
 *   - Ветки (приоритет сверху вниз):
 *
 *       1) `error` truthy → в сетке 6 Skeleton-карточек + над сеткой
 *          inline `<ErrorState messageKey="state.error.unknown" />`.
 *          Grid остаётся карточным — Req 20.3 без смены layout.
 *
 *       2) `isLoading` truthy → 6 Skeleton-карточек (Req 20.1).
 *
 *       3) `tasks.length === 0` → одна ячейка во всю ширину с
 *          `<EmptyState />` (Req 20.2). Grid-обёртка сохраняется.
 *
 *       4) иначе → карточки задач, каждая — `<GlassCard>` с
 *          difficulty-Badge, (опц.) category-Badge, заголовком,
 *          excerpt описания и ссылкой на `/tasks/{id}`.
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
import type { Difficulty, Task } from '@/types/database'

export interface TasksListProps {
    /** Список задач для рендера. Порядок сохраняется. */
    tasks: Task[]
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
 * переключения layout (Req 14.4/15.1).
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
    // прямой постановкой задачи 18.1: минимальная ширина карточки
    // задачи в auto-fill сетке.
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 'var(--space-4)',
    minWidth: 0,
    width: '100%',
}

const EMPTY_CELL_STYLE: CSSProperties = {
    // Растягиваем пустой/ошибочный state на всю строку, сохраняя
    // при этом grid-контейнер (не заменяя его).
    gridColumn: '1 / -1',
    minWidth: 0,
}

const CARD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-5)',
    // Единообразная минимальная высота карточек — даже короткие
    // описания не «схлопываются».
    minHeight: 'var(--space-28)',
    borderRadius: 'var(--radius-lg)',
    // Ссылка-wrapper не должна визуально отличаться от прочего
    // текста; переопределяем дефолтный underline.
    color: 'inherit',
    textDecoration: 'none',
}

const CARD_LINK_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    color: 'inherit',
    textDecoration: 'none',
    flex: 1,
    minWidth: 0,
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
 * Маппинг Difficulty → вариант Badge (тот же, что у QuestionsList).
 * Лёгкие уровни — `success`, средние — `info`, сложные — `warning`,
 * экспертный — `danger`. Цветовая семантика приходит из токенов.
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

// ── Skeleton cells ───────────────────────────────────────────────────────

function SkeletonGrid({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="card"
                    label={t('state.loading')}
                    data-testid="tasks-list-skeleton"
                />
            ))}
        </>
    )
}

// ── Card cell ────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
    const categoryName = task.category?.name
    const variant = difficultyBadgeVariant(task.difficulty)

    return (
        <GlassCard style={CARD_STYLE} data-testid="tasks-list-card">
            <Link
                href={`/tasks/${task.id}`}
                style={CARD_LINK_STYLE}
                data-testid="tasks-list-card-link"
            >
                <div style={CARD_BADGES_STYLE}>
                    <Badge variant={variant}>
                        {getDifficultyLabel(task.difficulty)}
                    </Badge>
                    {categoryName ? (
                        <Badge variant="neutral">{categoryName}</Badge>
                    ) : null}
                </div>
                <h3 style={CARD_TITLE_STYLE}>{task.title}</h3>
                {task.description ? (
                    <p style={CARD_DESCRIPTION_STYLE}>{task.description}</p>
                ) : null}
            </Link>
        </GlassCard>
    )
}

// ── Public component ─────────────────────────────────────────────────────

export function TasksList({
    tasks,
    isLoading = false,
    error = null,
    className,
}: TasksListProps) {
    // Ветка 1: error — inline ErrorState над grid, сетка со Skeleton
    // для сохранения карточного layout (Req 14.4/15.1, 20.3).
    if (error) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="tasks-list"
                data-state="error"
            >
                <ErrorState messageKey="state.error.unknown" />
                <div style={GRID_STYLE}>
                    <SkeletonGrid count={6} />
                </div>
            </div>
        )
    }

    // Ветка 2: loading (Req 20.1).
    if (isLoading) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="tasks-list"
                data-state="loading"
            >
                <div style={GRID_STYLE}>
                    <SkeletonGrid count={6} />
                </div>
            </div>
        )
    }

    // Ветка 3: empty (Req 20.2).
    if (tasks.length === 0) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="tasks-list"
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

    // Ветка 4: success — рендер карточек задач.
    return (
        <div
            className={className}
            style={ROOT_STYLE}
            data-ds="tasks-list"
            data-state="ready"
        >
            <div style={GRID_STYLE} data-testid="tasks-list-grid">
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </div>
        </div>
    )
}

export default TasksList
