'use client'

/**
 * `<MockList />` — карточная сетка мок-интервью для `Mock_Module`
 * (task 20.1; Requirements 17.1, 17.2, 17.3, 20.1, 20.2, 20.3,
 * 22.1, 22.4, 24.2).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       mocks: MockSummary[];
 *       isLoading?: boolean;
 *       error?: Error | null;
 *     }
 *
 *   - **Карточный bento-grid.** Ни при каком состоянии (loading,
 *     error, empty, ready) компонент НЕ переключается на
 *     альтернативный layout (таблица, list-view) — прямой контракт
 *     Req 17.2 («Bento_Grid или карточная сетка»).
 *
 *   - Grid — `display: grid; grid-template-columns: repeat(auto-fill,
 *     minmax(300px, 1fr));`. `minmax(300px, 1fr)` — единственное
 *     литеральное px-значение в модуле, оно прямо зафиксировано
 *     постановкой задачи 20.1.
 *
 *   - Рендер карточек **полностью независим от состояния фильтров**
 *     (Req 17.3): `MockList` не получает пропов от `MockFilters`;
 *     родитель подаёт уже отфильтрованный массив `mocks`. Без
 *     активных фильтров (эквивалент «всё») — передаётся полный
 *     список. Это делает инвариант изоляции сиблингов
 *     конструктивным: не связан фильтрами через общий state.
 *
 *   - Оборачивается в собственный `SectionErrorBoundary` через
 *     экспорт `MockList` (см. ниже): внутренности — `MockListInner`.
 *     Сиблинг `MockFilters` оборачивается симметрично. При крахе
 *     фильтров список продолжает рендериться полноценно
 *     (Req 17.3), и наоборот.
 *
 *   - Ветки (приоритет сверху вниз):
 *
 *       1) `error` truthy → в сетке 6 Skeleton-плейсхолдеров +
 *          над сеткой inline `<ErrorState />` (Req 20.3). Grid-обёртка
 *          карточная, ошибка в самом списке не переключает layout.
 *
 *       2) `isLoading` truthy → 6 Skeleton-карточек (Req 20.1).
 *
 *       3) `mocks.length === 0` → одна ячейка во всю ширину с
 *          `<EmptyState />` (Req 20.2). Grid-обёртка сохраняется.
 *
 *       4) иначе → `MockCard` на каждый элемент `mocks`.
 *
 *   - Все пользовательские строки — через `t()` (Req 24.2).
 *   - Стили — только токены DS (Req 1.8).
 */

import type { CSSProperties } from 'react'

import { EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { t } from '@/lib/i18n'

import { MockCard, type MockSummary } from './MockCard'
import { SectionErrorBoundary } from './SectionErrorBoundary'

export type { MockSummary } from './MockCard'

export interface MockListProps {
    /** Список мок-сетов для рендера. Порядок сохраняется. */
    mocks: MockSummary[]
    /** Флаг загрузки. Если `true` — показываются 6 Skeleton-карточек. */
    isLoading?: boolean
    /** Ошибка. Если truthy — над сеткой рендерится `<ErrorState />`. */
    error?: Error | null
    /** Дополнительный className на корневой контейнер. */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

/**
 * Корневой контейнер: вертикальный flex, в который попадают
 * inline-стейты (ErrorState) *над* сеткой, и сама grid-сетка *под*
 * ними. Это позволяет сохранить карточный grid во всех ветках без
 * переключения layout (Req 17.2).
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
    // `minmax(300px, 1fr)` — единственный px-литерал, разрешённый
    // прямой постановкой задачи 20.1: минимальная ширина карточки
    // мок-интервью в auto-fill сетке.
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 'var(--space-4)',
    minWidth: 0,
    width: '100%',
}

const EMPTY_CELL_STYLE: CSSProperties = {
    // Пустой/ошибочный state растягивается на всю строку, но
    // grid-контейнер сохраняется (не заменяется другим layout).
    gridColumn: '1 / -1',
    minWidth: 0,
}

// ── Skeleton cells ──────────────────────────────────────────────────────

function SkeletonGrid({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="card"
                    label={t('state.loading')}
                    data-testid="mock-list-skeleton"
                />
            ))}
        </>
    )
}

// ── Inner (без ErrorBoundary) ───────────────────────────────────────────

/**
 * Внутренний рендер, не обёрнутый в boundary. Вынесен в отдельный
 * компонент, чтобы (1) тесты могли проверять ветки без прохода через
 * boundary и (2) публичный `MockList` всегда представлял сиблинг-
 * изолированный узел (Req 17.3).
 */
export function MockListInner({
    mocks,
    isLoading = false,
    error = null,
    className,
}: MockListProps) {
    // Ветка 1: error — inline ErrorState над grid, сетка со Skeleton
    // для сохранения карточного layout (Req 17.2, 20.3).
    if (error) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="mock-list"
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
                data-ds="mock-list"
                data-state="loading"
            >
                <div style={GRID_STYLE}>
                    <SkeletonGrid count={6} />
                </div>
            </div>
        )
    }

    // Ветка 3: empty (Req 20.2).
    if (mocks.length === 0) {
        return (
            <div
                className={className}
                style={ROOT_STYLE}
                data-ds="mock-list"
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

    // Ветка 4: success — рендер карточек мок-интервью.
    return (
        <div
            className={className}
            style={ROOT_STYLE}
            data-ds="mock-list"
            data-state="ready"
        >
            <div style={GRID_STYLE} data-testid="mock-list-grid">
                {mocks.map((mock) => (
                    <MockCard key={mock.id} mock={mock} />
                ))}
            </div>
        </div>
    )
}

// ── Public component (wrapped in own ErrorBoundary) ─────────────────────

/**
 * Публичный компонент — inner-рендер обёрнут в собственный
 * `SectionErrorBoundary` (Req 17.3). Ошибка внутри списка не
 * может деградировать сиблинг `MockFilters`, и наоборот.
 */
export function MockList(props: MockListProps) {
    return (
        <SectionErrorBoundary
            fallbackDataDs="mock-list-error-boundary-fallback"
        >
            <MockListInner {...props} />
        </SectionErrorBoundary>
    )
}

export default MockList
