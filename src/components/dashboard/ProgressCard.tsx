'use client'

/**
 * `<ProgressCard />` — Dashboard-карточка общего прогресса пользователя
 * (Requirements 5.3, 5.4, 5.5, 5.6, 20.1, 20.3, 22.4).
 *
 * Контракт:
 *
 *  - Обёрнута в собственный `<CardErrorBoundary retry={handleRetry}>`.
 *    Сбой одной карточки не ремонтирует сиблингов и не включает
 *    глобальный Dashboard-level ErrorState — граница строго локальна
 *    (Req 5.5, 5.6).
 *
 *  - Локальное состояние `{ data, isLoading, error }` живёт внутри
 *    `ProgressCardInner` и не разделяется с другими карточками
 *    (Req 5.6, инвариант Property 15). Успешно загруженная карточка
 *    **всегда** рендерит свои данные, независимо от состояния сиблингов.
 *
 *  - Fetch-стратегия:
 *      * `endpoint === null` — mock-стаб, резолвится через
 *        `setTimeout(MOCK_DELAY_MS)`. Используется по умолчанию, т.к.
 *        реального эндпоинта `/api/profile/progress` в схеме пока нет
 *        (прямо разрешено постановкой задачи 14.2).
 *      * иначе — `fetch(endpoint)` с AbortSignal и валидацией
 *        payload-а. Любой сбой (HTTP != 2xx, невалидный payload,
 *        сетевой throw) переводит карточку в error-ветку с inline
 *        `<ErrorState retry />` (Req 5.5, 20.3).
 *
 *  - Во время загрузки — `<Skeleton variant="card" />` (Req 5.4, 20.1).
 *
 *  - В success-состоянии — заголовок `t('dashboard.progress.title')`,
 *    `<ProgressBar value={fraction} label={...} />` (Req 5.3) и краткая
 *    детализация по вопросам и задачам. Все строки через `t()`
 *    (Req 24.2). Инлайн-стили на токенах Design_System (Req 1.8).
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

import {
    ErrorState,
    GlassCard,
    ProgressBar,
    Skeleton,
} from '@/components/ui'
import { t } from '@/lib/i18n'

import { CardErrorBoundary } from './CardErrorBoundary'

// ── Public prop type ────────────────────────────────────────────────────

export interface ProgressCardProps {
    /**
     * Endpoint с данными прогресса. По умолчанию `null` — mock-путь.
     * Реального эндпоинта `/api/profile/progress` в проекте пока нет,
     * поэтому mock-стаб используется как безопасный дефолт. Тесты
     * могут передавать реальный URL, чтобы вывести карточку в
     * error-ветку через моканный `fetch`.
     */
    endpoint?: string | null
    /** Дополнительный className на корневую `GlassCard`. */
    className?: string
}

// ── Internal data contract ──────────────────────────────────────────────

interface ProgressData {
    questionsSolved: number
    questionsTotal: number
    tasksSolved: number
    tasksTotal: number
}

const MOCK_PROGRESS: ProgressData = {
    questionsSolved: 42,
    questionsTotal: 120,
    tasksSolved: 18,
    tasksTotal: 60,
}

const MOCK_DELAY_MS = 400

function parseProgress(input: unknown): ProgressData | null {
    if (!input || typeof input !== 'object') return null
    const o = input as Record<string, unknown>
    const keys: (keyof ProgressData)[] = [
        'questionsSolved',
        'questionsTotal',
        'tasksSolved',
        'tasksTotal',
    ]
    for (const key of keys) {
        const v = o[key]
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
    }
    return {
        questionsSolved: o.questionsSolved as number,
        questionsTotal: o.questionsTotal as number,
        tasksSolved: o.tasksSolved as number,
        tasksTotal: o.tasksTotal as number,
    }
}

/**
 * Loader прогресса.
 *
 *   - `endpoint === null` → mock с `setTimeout`. Сигнал `signal.abort()`
 *     корректно отменяет таймаут через `addEventListener('abort', ...)`.
 *   - иначе — стандартный `fetch` с прокинутым AbortSignal + JSON-parse +
 *     валидация через `parseProgress`. Любой сбой — throw.
 */
async function loadProgress(
    endpoint: string | null,
    signal: AbortSignal,
): Promise<ProgressData> {
    if (endpoint === null) {
        return new Promise<ProgressData>((resolve, reject) => {
            const timer = setTimeout(() => {
                if (signal.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'))
                    return
                }
                resolve({ ...MOCK_PROGRESS })
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
        throw new Error(`progress endpoint returned ${response.status}`)
    }
    const json: unknown = await response.json()
    const parsed = parseProgress(json)
    if (!parsed) {
        throw new Error('progress endpoint returned invalid payload')
    }
    return parsed
}

// ── Presentation helpers ────────────────────────────────────────────────

function clamp01(v: number): number {
    if (!Number.isFinite(v)) return 0
    if (v < 0) return 0
    if (v > 1) return 1
    return v
}

/**
 * Совокупный прогресс `[0..1]` как `(questionsSolved + tasksSolved) /
 * (questionsTotal + tasksTotal)`. Нулевой total даёт 0 — чтобы
 * ProgressBar получил валидный `aria-valuenow`.
 */
function computeFraction(data: ProgressData): number {
    const solved = data.questionsSolved + data.tasksSolved
    const total = data.questionsTotal + data.tasksTotal
    if (total <= 0) return 0
    return clamp01(solved / total)
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

const DETAILS_LIST_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    margin: 0,
    padding: 0,
    listStyle: 'none',
}

const DETAIL_ITEM_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    color: 'var(--border-700)',
    lineHeight: 1.4,
    fontVariantNumeric: 'tabular-nums',
}

function ProgressContent({ data }: { data: ProgressData }) {
    const fraction = useMemo(() => computeFraction(data), [data])
    return (
        <>
            <h2 style={TITLE_STYLE}>{t('dashboard.progress.title')}</h2>
            <ProgressBar
                value={fraction}
                label={t('dashboard.progress.label')}
                data-testid="progress-card-bar"
            />
            <ul
                style={DETAILS_LIST_STYLE}
                data-testid="progress-card-details"
            >
                <li style={DETAIL_ITEM_STYLE}>
                    {t('dashboard.progress.questions', {
                        solved: data.questionsSolved,
                        total: data.questionsTotal,
                    })}
                </li>
                <li style={DETAIL_ITEM_STYLE}>
                    {t('dashboard.progress.tasks', {
                        solved: data.tasksSolved,
                        total: data.tasksTotal,
                    })}
                </li>
            </ul>
        </>
    )
}

// ── Inner (inside boundary) ─────────────────────────────────────────────

interface ProgressCardInnerProps {
    endpoint: string | null
    /**
     * Монотонно растущее значение: инкремент → полный реlaunch
     * `useEffect`-загрузки. Родитель обновляет его при retry.
     */
    reloadNonce: number
    /** Retry-коллбек для inline ErrorState. */
    onRetry: () => void
}

function ProgressCardInner({
    endpoint,
    reloadNonce,
    onRetry,
}: ProgressCardInnerProps): ReactNode {
    // Три изолированных локальных state — прямой контракт задачи 14.2.
    const [data, setData] = useState<ProgressData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Храним AbortController в ref, чтобы следующий эффект отменил
    // предыдущий запрос даже в StrictMode-double-invoke окружении.
    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        abortRef.current = controller

        setIsLoading(true)
        setError(null)

        loadProgress(endpoint, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return
                setData(result)
                setIsLoading(false)
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return
                // AbortError — результат cleanup-а, не ошибка UI. Оставляем
                // loading=true, т.к. следующий effect немедленно перезапустит
                // загрузку (reloadNonce++).
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
                data-testid="progress-card-skeleton"
            />
        )
    }

    return <ProgressContent data={data} />
}

// ── Public component ────────────────────────────────────────────────────

export function ProgressCard({
    endpoint = null,
    className,
}: ProgressCardProps = {}) {
    const [reloadNonce, setReloadNonce] = useState(0)

    const handleRetry = useCallback(() => {
        setReloadNonce((n) => n + 1)
    }, [])

    return (
        <GlassCard
            className={className}
            style={CARD_ROOT_STYLE}
            data-dashboard-card="progress"
        >
            <CardErrorBoundary retry={handleRetry}>
                <ProgressCardInner
                    endpoint={endpoint}
                    reloadNonce={reloadNonce}
                    onRetry={handleRetry}
                />
            </CardErrorBoundary>
        </GlassCard>
    )
}

export default ProgressCard
