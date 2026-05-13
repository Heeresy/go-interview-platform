'use client'

/**
 * `<ServiceCard />` — одна плитка Status_Module (Requirements 19.1, 19.2,
 * 19.3, 19.4, 22.4).
 *
 * Компонент рендерит `<GlassCard>` с именем сервиса, семантическим
 * `<Badge>`-ом состояния и — только для ветки `unknown` — кнопкой retry
 * с подписью «Повторить». Для `degraded` и `outage` дополнительно
 * показывается человеко-понятное сообщение из пропа `message`
 * (опционально).
 *
 * Контракт типа `ServiceCardState` — дискриминированный union с
 * дискриминатором `kind`:
 *
 *   ServiceCardState =
 *     | { kind: 'operational'; name: string }
 *     | { kind: 'degraded';    name: string; message?: string }
 *     | { kind: 'outage';      name: string; message?: string }
 *     | { kind: 'unknown';     name: string; retry: () => Promise<void> }
 *
 * **Гарантия retry для `unknown` (Req 19.4).** Поле `retry` в ветке
 * `unknown` объявлено как обязательный non-nullable callback
 * `() => Promise<void>`. Типизация физически запрещает конструкцию
 * `{ kind: 'unknown', name, retry: undefined }` — TypeScript упадёт
 * на создании такого объекта, а не при рендере. Таким образом, сам
 * путь «показать unknown без retry» не существует в коде: без
 * рабочего callback невозможно даже сконструировать `ServiceCardState`
 * с `kind === 'unknown'`. На уровне рендера это означает, что JSX-
 * ветка `unknown` **всегда** монтирует активную кнопку с валидным
 * onClick.
 *
 * Цвета — семантические токены Design_System (Req 19.2):
 *   - operational  → Badge variant="success"  (`--success`)
 *   - degraded     → Badge variant="warning"  (`--warning`)
 *   - outage       → Badge variant="danger"   (`--danger`)
 *   - unknown      → Badge variant="neutral"  (нейтральная поверхность)
 *
 * Строки — через `t('status.operational|degraded|outage|unknown')` и
 * `t('common.retry')` (Req 24.2). Никаких хардкодных цветов, radius
 * или px-значений (Req 1.8) — только токены `--space-*`, `--fs-*`,
 * `--fw-*`, `--radius-*`, `--border-*`, `--danger-*`. Макет самой
 * карточки — flex column со стандартными отступами, идентично
 * остальным карточкам DS v2.
 */

import type { CSSProperties, ReactElement } from 'react'

import { Badge, Button, GlassCard } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui/Badge'
import { t, type TranslationKey } from '@/lib/i18n'

// ── Public types ─────────────────────────────────────────────────────────

/**
 * Дискриминированный union состояния карточки одного сервиса.
 *
 * Дискриминатор — поле `kind`. Именно типизация — в первую очередь
 * требование `retry: () => Promise<void>` для `kind: 'unknown'` без
 * `?` — закрывает Requirement 19.4: «unknown без retry» физически
 * нельзя сконструировать.
 */
export type ServiceCardState =
    | { kind: 'operational'; name: string }
    | { kind: 'degraded'; name: string; message?: string }
    | { kind: 'outage'; name: string; message?: string }
    | { kind: 'unknown'; name: string; retry: () => Promise<void> }

export interface ServiceCardProps {
    /** Дискриминированное состояние сервиса. */
    state: ServiceCardState
    /** Дополнительный className на корневой `GlassCard`. */
    className?: string
}

// ── Lookup tables ────────────────────────────────────────────────────────

/**
 * Связь между дискриминатором `kind` и визуальным вариантом `<Badge>`.
 * Ключи `operational`/`degraded`/`outage` мапятся на семантические
 * цвета Design_System (Req 19.2); `unknown` использует нейтральную
 * поверхность — прямое требование задачи.
 */
const KIND_TO_BADGE_VARIANT: Record<ServiceCardState['kind'], BadgeVariant> = {
    operational: 'success',
    degraded: 'warning',
    outage: 'danger',
    unknown: 'neutral',
}

/**
 * Связь `kind` → i18n-ключ подписи статуса. Строки локализуются через
 * `t()` (Req 24.2) и существуют в `src/lib/i18n/ru.ts` как
 * `status.operational | status.degraded | status.outage | status.unknown`.
 */
const KIND_TO_STATUS_LABEL_KEY: Record<
    ServiceCardState['kind'],
    TranslationKey
> = {
    operational: 'status.operational',
    degraded: 'status.degraded',
    outage: 'status.outage',
    unknown: 'status.unknown',
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const CARD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-5)',
    height: '100%',
    minHeight: 'var(--space-32)',
    borderRadius: 'var(--radius-lg)',
}

const HEADER_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    minWidth: 0,
}

const NAME_STYLE: CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-md)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.2,
    color: 'var(--border-900)',
    margin: 0,
    // Длинное имя схлопываем многоточием — карточка не должна
    // ломать сетку из-за пользовательского ввода.
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    flex: 1,
}

const MESSAGE_STYLE: CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    lineHeight: 1.5,
    color: 'var(--border-700)',
    margin: 0,
}

const FOOTER_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 'var(--space-2)',
    marginTop: 'auto',
}

// ── Component ────────────────────────────────────────────────────────────

export function ServiceCard({
    state,
    className,
}: ServiceCardProps): ReactElement {
    const badgeVariant = KIND_TO_BADGE_VARIANT[state.kind]
    const statusLabel = t(KIND_TO_STATUS_LABEL_KEY[state.kind])

    // Сообщение показывается только для ветвей, где оно семантически
    // релевантно (degraded/outage). Для operational/unknown message не
    // существует в типе. Используем type guard через switch(state.kind).
    let message: string | null = null
    if (state.kind === 'degraded' || state.kind === 'outage') {
        if (state.message && state.message.length > 0) {
            message = state.message
        }
    }

    return (
        <GlassCard
            className={className}
            style={CARD_STYLE}
            data-ds="service-card"
            data-kind={state.kind}
        >
            <div style={HEADER_STYLE}>
                <h3 style={NAME_STYLE} title={state.name}>
                    {state.name}
                </h3>
                <Badge variant={badgeVariant} data-testid="service-card-badge">
                    {statusLabel}
                </Badge>
            </div>

            {message !== null ? (
                <p style={MESSAGE_STYLE} data-testid="service-card-message">
                    {message}
                </p>
            ) : null}

            {state.kind === 'unknown' ? (
                <div style={FOOTER_STYLE}>
                    {/*
                     * Retry-кнопка — **всегда** рендерится для ветви
                     * `unknown` (Req 19.4). Ничто в коде не позволяет
                     * попасть в этот JSX без рабочего `state.retry`:
                     * дискриминированный union требует non-nullable
                     * `retry: () => Promise<void>`. Button поддерживает
                     * async onClick и сам покажет loading-спиннер на
                     * время выполнения retry (Req 20.4).
                     */}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={state.retry}
                        data-testid="service-card-retry"
                    >
                        {t('common.retry')}
                    </Button>
                </div>
            ) : null}
        </GlassCard>
    )
}

export default ServiceCard
