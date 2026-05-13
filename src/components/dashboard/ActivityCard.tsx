'use client'

/**
 * `<ActivityCard />` — Dashboard-карточка активности за последние
 * 7 дней (Requirements 5.3, 5.4, 5.5, 5.6, 20.1, 20.3, 22.4).
 *
 * Контракт:
 *
 *  - Обёрнута в собственный `<CardErrorBoundary retry={handleRetry}>`.
 *    Изолирует runtime-throw от сиблингов (Req 5.6).
 *
 *  - Локальное состояние `{ data, isLoading, error }` — только внутри
 *    `ActivityCardInner`, не разделяется с другими карточками (Req 5.6).
 *
 *  - Fetch-стратегия:
 *      * `endpoint === null` — mock-стаб, 7 детерминированных значений
 *        (для стабильности тестов и UX в dev). По умолчанию, т.к.
 *        реального эндпоинта `/api/profile/activity` пока нет.
 *      * иначе — `fetch(endpoint)` с AbortSignal. Payload должен быть
 *        массивом из ровно 7 неотрицательных целых. Невалидный payload
 *        либо HTTP !ok → throw → inline ErrorState.
 *
 *  - Во время загрузки — `<Skeleton variant="card" />` (Req 5.4, 20.1).
 *
 *  - В success-состоянии — мини-bar-chart из 7 колонок (понедельник
 *    …воскресенье), счётчик суммарной активности за период. Bar-chart
 *    построен на CSS Grid + `var(--accent-600)` + высота через %;
 *    никаких canvas/SVG — только токены Design_System (Req 1.8).
 *    Если все 7 значений = 0 — показываем компактное empty-сообщение
 *    (Req 20.2 эквивалент).
 *
 *  - Доступность: каждая колонка — `role="img"` с `aria-label`,
 *    содержащим название дня и количество действий (Req 11.6).
 *    Подписи дней под chart-ом помечены `aria-hidden`, поскольку
 *    информация уже доступна через labels баров.
 *
 *  - Все строки через `t()` (Req 24.2).
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react'

import { ErrorState, GlassCard, Skeleton } from '@/components/ui'
import { t, type TranslationKey } from '@/lib/i18n'

import { CardErrorBoundary } from './CardErrorBoundary'

// ── Public prop type ────────────────────────────────────────────────────

export interface ActivityCardProps {
    /**
     * Endpoint, возвращающий массив из 7 неотрицательных целых — число
     * действий пользователя за каждый из последних 7 дней. Индекс 0 —
     * 6 дней назад, индекс 6 — сегодня. По умолчанию `null` — mock-путь.
     */
    endpoint?: string | null
    /** Дополнительный className на корневую `GlassCard`. */
    className?: string
}

// ── Internal data contract ──────────────────────────────────────────────

const DAYS_IN_WINDOW = 7

type ActivityData = readonly number[]

/**
 * Ключи дней недели в словаре i18n. Упорядочены по ru-локали
 * (понедельник = 0, воскресенье = 6).
 */
const WEEKDAY_KEYS: readonly TranslationKey[] = [
    'dashboard.activity.day.mon',
    'dashboard.activity.day.tue',
    'dashboard.activity.day.wed',
    'dashboard.activity.day.thu',
    'dashboard.activity.day.fri',
    'dashboard.activity.day.sat',
    'dashboard.activity.day.sun',
] as const

const MOCK_ACTIVITY: ActivityData = [2, 3, 1, 5, 4, 0, 6]

const MOCK_DELAY_MS = 400

function parseActivity(input: unknown): ActivityData | null {
    if (!Array.isArray(input)) return null
    if (input.length !== DAYS_IN_WINDOW) return null
    const out: number[] = []
    for (const v of input) {
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
        out.push(Math.floor(v))
    }
    return out
}

async function loadActivity(
    endpoint: string | null,
    signal: AbortSignal,
): Promise<ActivityData> {
    if (endpoint === null) {
        return new Promise<ActivityData>((resolve, reject) => {
            const timer = setTimeout(() => {
                if (signal.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'))
                    return
                }
                resolve(MOCK_ACTIVITY.slice())
            }, MOCK_DELAY_MS)
            signal.addEventListener(
                'abort',
                () => {
                    clearTimeout(timer)
                    reject(new DOMException('Aborted', 'AbortError'))
                },
                { once: true },
            )
        })
    }

    const response = await fetch(endpoint, {
        signal,
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
        throw new Error(`activity endpoint returned ${response.status}`)
    }
    const json: unknown = await response.json()
    const parsed = parseActivity(json)
    if (!parsed) {
        throw new Error('activity endpoint returned invalid payload')
    }
    return parsed
}

// ── Presentation helpers ────────────────────────────────────────────────

/**
 * Нормализует высоту бара в проценты относительно максимума.
 * Для нулевого максимума возвращает 0 — бар выставит только
 * `minHeight`, чтобы пустой день был виден как минимальная ячейка.
 */
function computeBarPercent(value: number, max: number): number {
    if (max <= 0) return 0
    const raw = (value / max) * 100
    if (!Number.isFinite(raw)) return 0
    if (raw < 0) return 0
    if (raw > 100) return 100
    return raw
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const CARD_ROOT_STYLE: CSSProperties = {
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    minHeight: '100%',
}

const TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.2,
    color: 'var(--border-900)',
    margin: 0,
}

const CHART_STYLE: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${DAYS_IN_WINDOW}, 1fr)`,
    gap: 'var(--space-2)',
    alignItems: 'end',
    // Высота bar-chart-а выражена через токен spacing (`--space-24` = 96px),
    // что соблюдает контракт «только токены Design_System» (Req 1.8).
    height: 'var(--space-24)',
    padding: 'var(--space-1) 0',
}

const BAR_COLUMN_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'stretch',
    height: '100%',
    minWidth: 0,
}

const BAR_STYLE_BASE: CSSProperties = {
    width: '100%',
    background: 'var(--accent-600)',
    borderRadius: 'var(--radius-sm)',
    transition: 'height var(--dur-base) var(--ease-standard)',
    minHeight: 'var(--space-1)',
}

const DAY_LABELS_ROW_STYLE: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${DAYS_IN_WINDOW}, 1fr)`,
    gap: 'var(--space-2)',
    marginTop: 'var(--space-2)',
}

const DAY_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-700)',
    textAlign: 'center',
    lineHeight: 1.2,
}

const TOTAL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    color: 'var(--border-700)',
    lineHeight: 1.4,
    margin: 0,
    marginTop: 'var(--space-3)',
    fontVariantNumeric: 'tabular-nums',
}

const EMPTY_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    color: 'var(--border-700)',
    lineHeight: 1.4,
    margin: 0,
}

function ActivityContent({ data }: { data: ActivityData }) {
    const total = useMemo(() => data.reduce((s, v) => s + v, 0), [data])
    const max = useMemo(
        () => data.reduce((m, v) => (v > m ? v : m), 0),
        [data],
    )

    if (total === 0) {
        return (
            <>
                <h2 style={TITLE_STYLE}>{t('dashboard.activity.title')}</h2>
                <p style={EMPTY_STYLE} data-testid="activity-empty">
                    {t('dashboard.activity.empty')}
                </p>
            </>
        )
    }

    return (
        <>
            <h2 style={TITLE_STYLE}>{t('dashboard.activity.title')}</h2>
            <div
                style={CHART_STYLE}
                role="group"
                aria-label={t('dashboard.activity.title')}
                data-testid="activity-chart"
            >
                {data.map((value, index) => {
                    const dayLabel = t(WEEKDAY_KEYS[index])
                    const heightPercent = computeBarPercent(value, max)
                    const barStyle: CSSProperties = {
                        ...BAR_STYLE_BASE,
                        height: `${heightPercent}%`,
                        opacity: value === 0 ? 0.35 : 1,
                    }
                    return (
                        <div
                            key={index}
                            style={BAR_COLUMN_STYLE}
                            data-testid={`activity-column-${index}`}
                        >
                            <div
                                style={barStyle}
                                role="img"
                                aria-label={t(
                                    'dashboard.activity.barAriaLabel',
                                    { day: dayLabel, count: value },
                                )}
                                data-testid={`activity-bar-${index}`}
                            />
                        </div>
                    )
                })}
            </div>
            <div style={DAY_LABELS_ROW_STYLE} aria-hidden="true">
                {data.map((_, index) => (
                    <span key={index} style={DAY_LABEL_STYLE}>
                        {t(WEEKDAY_KEYS[index])}
                    </span>
                ))}
            </div>
            <p style={TOTAL_STYLE} data-testid="activity-total">
                {t('dashboard.activity.total', { count: total })}
            </p>
        </>
    )
}

// ── Inner (inside boundary) ─────────────────────────────────────────────

interface ActivityCardInnerProps {
    endpoint: string | null
    reloadNonce: number
    onRetry: () => void
}

function ActivityCardInner({
    endpoint,
    reloadNonce,
    onRetry,
}: ActivityCardInnerProps): ReactNode {
    const [data, setData] = useState<ActivityData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        abortRef.current = controller

        setIsLoading(true)
        setError(null)

        loadActivity(endpoint, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return
                setData(result)
                setIsLoading(false)
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return
                if (
                    err instanceof DOMException &&
                    err.name === 'AbortError'
                ) {
                    return
                }
                setError(err instanceof Error ? err : new Error(String(err)))
                setIsLoading(false)
            })

        return () => {
            controller.abort()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint, reloadNonce])

    if (error) {
        return <ErrorState messageKey="state.error.unknown" retry={onRetry} />
    }

    if (isLoading || !data) {
        return (
            <Skeleton
                variant="card"
                label={t('state.loading')}
                data-testid="activity-card-skeleton"
            />
        )
    }

    return <ActivityContent data={data} />
}

// ── Public component ────────────────────────────────────────────────────

export function ActivityCard({
    endpoint = null,
    className,
}: ActivityCardProps = {}) {
    const [reloadNonce, setReloadNonce] = useState(0)

    const handleRetry = useCallback(() => {
        setReloadNonce((n) => n + 1)
    }, [])

    return (
        <GlassCard
            className={className}
            style={CARD_ROOT_STYLE}
            data-dashboard-card="activity"
        >
            <CardErrorBoundary retry={handleRetry}>
                <ActivityCardInner
                    endpoint={endpoint}
                    reloadNonce={reloadNonce}
                    onRetry={handleRetry}
                />
            </CardErrorBoundary>
        </GlassCard>
    )
}

export default ActivityCard
