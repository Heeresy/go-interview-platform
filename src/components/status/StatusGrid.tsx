'use client'

/**
 * `<StatusGrid />` — контейнер Status_Module (Requirements 19.1, 19.2,
 * 22.4, 22.5).
 *
 * Компонент берёт массив `services: ServiceCardState[]` и рендерит по
 * одному `<ServiceCard />` на элемент, оборачивая каждый в `<BentoItem />`
 * внутри общего `<BentoGrid />`.
 *
 * Контракт layout (прямое требование задачи 22.1):
 *   - На Viewport_Desktop/Wide — 3-колоночный layout. BentoGrid сам по
 *     себе 12-колоночный (см. `src/components/dashboard/BentoGrid.css`),
 *     поэтому 3 колонки получаются через `colSpan={4}` на каждом
 *     BentoItem (4 × 3 = 12).
 *   - На Viewport_Mobile BentoGrid коллапсирует в одну колонку
 *     (`.bento-grid > .bento-item { grid-column: 1 / -1 !important }` в
 *     CSS), поэтому `colSpan={4}` автоматически игнорируется и все
 *     карточки встают друг под друга — это корректный mobile-first
 *     контракт Req 9.3 без отдельной логики здесь.
 *
 * Нулевая длина `services` тривиально рендерит пустой `<BentoGrid />` —
 * выбор соответствующего empty-state оставлен странице-потребителю
 * (`src/app/status/page.tsx`), т.к. StatusGrid — чистый контейнер.
 *
 * Компонент не содержит цветов, radius или px-значений — только
 * пробрасывает состояние в `ServiceCard`, у которого визуальный слой
 * уже собран на токенах Design_System (Req 1.8).
 */

import type { ReactElement } from 'react'

import { BentoGrid, BentoItem } from '@/components/dashboard'

import { ServiceCard, type ServiceCardState } from './ServiceCard'

export interface StatusGridProps {
    /**
     * Упорядоченный список состояний сервисов. Порядок определяет
     * порядок отрисовки карточек. Каждый элемент рендерится как
     * отдельная `<ServiceCard />` внутри своего `<BentoItem />`.
     *
     * Требование Req 19.4 уже закодировано в типе `ServiceCardState`:
     * попытка сконструировать `{ kind: 'unknown', retry: undefined }`
     * не пройдёт typecheck — а значит, в этом массиве не может оказаться
     * unknown-карточки без работающего retry.
     */
    services: ServiceCardState[]
    /**
     * Стабильный ключ элемента для React reconciliation. По умолчанию
     * используется комбинация `kind + name`, что корректно, пока в
     * списке нет двух сервисов с одинаковым именем и одинаковым kind.
     * Потребитель может передать собственный резолвер, например
     * UUID из Supabase, через `getItemKey`.
     */
    getItemKey?: (state: ServiceCardState, index: number) => string
    /** Дополнительный className на корневую `BentoGrid`. */
    className?: string
}

/**
 * Desktop-сетка: 12 колонок / 4 на карточку = 3 колонки карточек.
 * Поднято в модульную константу, чтобы было очевидно, откуда взялось
 * число, и чтобы можно было поменять плотность в одной точке.
 */
const DESKTOP_COL_SPAN = 4

/**
 * Дефолтный резолвер ключей: `kind + name`. Стабильный и
 * достаточный для ожидаемого набора сервисов Status_Module
 * (Supabase, Gemini, Sentry, Vercel Analytics, Speed Insights и т.п.),
 * где имя каждого сервиса уникально.
 */
function defaultGetItemKey(state: ServiceCardState, index: number): string {
    return `${state.kind}:${state.name}:${index}`
}

export function StatusGrid({
    services,
    getItemKey = defaultGetItemKey,
    className,
}: StatusGridProps): ReactElement {
    return (
        <BentoGrid className={className} data-ds="status-grid">
            {services.map((state, index) => (
                <BentoItem
                    key={getItemKey(state, index)}
                    colSpan={DESKTOP_COL_SPAN}
                    rowSpan={1}
                    data-status-cell={state.kind}
                >
                    <ServiceCard state={state} />
                </BentoItem>
            ))}
        </BentoGrid>
    )
}

export default StatusGrid
