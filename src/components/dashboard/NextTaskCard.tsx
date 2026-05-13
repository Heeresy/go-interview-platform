'use client'

/**
 * `<NextTaskCard />` — Dashboard-карточка «следующая рекомендованная
 * задача» (Requirements 5.3, 5.4, 5.5, 5.6, 20.1, 20.3, 22.4).
 *
 * Контракт:
 *
 *  - Обёрнута в собственный `<CardErrorBoundary retry={handleRetry}>`.
 *    Изолирует runtime-throw от сиблингов (Req 5.6).
 *
 *  - Локальное состояние `{ data, isLoading, error }` внутри
 *    `NextTaskCardInner` — не разделяется с другими карточками
 *    Dashboard (Req 5.6, инвариант Property 15).
 *
 *  - Fetch-стратегия:
 *      * `endpoint === null` — mock-стаб, возвращает фиксированную
 *        задачу («Two Sum», difficulty 2). Используется по умолчанию,
 *        т.к. реального эндпоинта `/api/tasks/next` в схеме ещё нет —
 *        постановка задачи 14.2 разрешает mock, если endpoint неясен.
 *      * иначе — `fetch(endpoint)` с AbortSignal; payload принимает
 *        `{ id, title, difficulty }` либо явный `null` / `204` (empty).
 *
 *  - Во время загрузки — `<Skeleton variant="card" />` (Req 5.4, 20.1).
 *
 *  - В success-состоянии — заголовок, название задачи, метка сложности,
 *    link-кнопка на `/tasks/[id]`. В empty-состоянии — заголовок,
 *    подсказка и кнопка в общий список задач. Паттерн link-вокруг-
 *    Button повторяет `LandingCTA.tsx` и `TrainerQuickCard.tsx`.
 *
 *  - Все строки через `t()` (Req 24.2). Токены Design_System (Req 1.8).
 */

import Link from 'next/link'
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react'

import {
    Button,
    ErrorState,
    GlassCard,
    Skeleton,
} from '@/components/ui'
import { t } from '@/lib/i18n'

import { CardErrorBoundary } from './CardErrorBoundary'

// ── Public prop type ────────────────────────────────────────────────────

export interface NextTaskCardProps {
    /**
     * Endpoint, возвращающий `{ id, title, difficulty }` либо `null`
     * (если рекомендаций нет). По умолчанию `null` — mock-путь.
     */
    endpoint?: string | null
    /** Дополнительный className на корневую `GlassCard`. */
    className?: string
}

// ── Internal data contract ──────────────────────────────────────────────

interface NextTaskData {
    id: string
    title: string
    /** 1..5 по существующей шкале Difficulty. */
    difficulty: number
}

/**
 * Union `NextTaskData | null` кодирует «empty-state»:
 *   - объект — задача найдена;
 *   - null   — рекомендации нет; покажем CTA в список задач.
 */
type NextTaskState = NextTaskData | null

const MOCK_NEXT_TASK: NextTaskData = {
    id: 'mock-task-two-sum',
    title: 'Two Sum',
    difficulty: 2,
}

const MOCK_DELAY_MS = 400

const DIFFICULTY_LABELS: Record<number, string> = {
    1: 'Лёгкий',
    2: 'Средний',
    3: 'Выше среднего',
    4: 'Сложный',
    5: 'Экспертный',
}

function parseTask(input: unknown): NextTaskData | null {
    if (input === null) return null
    if (!input || typeof input !== 'object') return null
    const o = input as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id) return null
    if (typeof o.title !== 'string' || !o.title) return null
    if (
        typeof o.difficulty !== 'number' ||
        !Number.isFinite(o.difficulty) ||
        o.difficulty < 1 ||
        o.difficulty > 5
    ) {
        return null
    }
    return {
        id: o.id,
        title: o.title,
        difficulty: Math.floor(o.difficulty),
    }
}

/**
 * Loader следующей задачи.
 *
 *   - `endpoint === null` → mock (после MOCK_DELAY_MS, с корректной
 *     поддержкой AbortSignal).
 *   - `204 No Content` или payload `null` → empty (`null`).
 *   - HTTP !ok / невалидный payload → throw (ErrorState с retry).
 *   - сетевой throw → прокидывается как есть.
 */
async function loadNextTask(
    endpoint: string | null,
    signal: AbortSignal,
): Promise<NextTaskState> {
    if (endpoint === null) {
        return new Promise<NextTaskState>((resolve, reject) => {
            const timer = setTimeout(() => {
                if (signal.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'))
                    return
                }
                resolve({ ...MOCK_NEXT_TASK })
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
    if (response.status === 204) return null
    if (!response.ok) {
        throw new Error(`next-task endpoint returned ${response.status}`)
    }
    const json: unknown = await response.json()
    if (json === null) return null
    const parsed = parseTask(json)
    if (!parsed) {
        throw new Error('next-task endpoint returned invalid payload')
    }
    return parsed
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

const TASK_NAME_STYLE: CSSProperties = {
    fontSize: 'var(--fs-md)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-900)',
    lineHeight: 1.3,
    margin: 0,
}

const META_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    color: 'var(--border-700)',
    lineHeight: 1.4,
    margin: 0,
}

const EMPTY_BODY_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
}

const CTA_ROW_STYLE: CSSProperties = {
    marginTop: 'auto',
    display: 'flex',
    gap: 'var(--space-3)',
}

const CTA_LINK_STYLE: CSSProperties = {
    textDecoration: 'none',
}

function NextTaskContent({ task }: { task: NextTaskData }) {
    const difficultyLabel =
        DIFFICULTY_LABELS[task.difficulty] ?? String(task.difficulty)

    // Only link to the specific task page if the ID looks like a valid UUID.
    // Mock/placeholder IDs (e.g. 'mock-task-two-sum') would lead to a 404,
    // so fall back to the general tasks list.
    const isValidUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.id)
    const ctaHref = isValidUuid ? `/tasks/${task.id}` : '/tasks'

    return (
        <>
            <h2 style={TITLE_STYLE}>{t('dashboard.nextTask.title')}</h2>
            <div>
                <p style={TASK_NAME_STYLE} data-testid="next-task-title">
                    {task.title}
                </p>
                <p style={META_STYLE} data-testid="next-task-difficulty">
                    {t('dashboard.nextTask.difficulty', {
                        level: difficultyLabel,
                    })}
                </p>
            </div>
            <div style={CTA_ROW_STYLE}>
                <Link
                    href={ctaHref}
                    style={CTA_LINK_STYLE}
                    data-testid="next-task-cta"
                    data-cta="next-task"
                    aria-label={t('dashboard.nextTask.cta')}
                >
                    <Button variant="primary" size="md" tabIndex={-1}>
                        {t('dashboard.nextTask.cta')}
                    </Button>
                </Link>
            </div>
        </>
    )
}

function NextTaskEmpty() {
    return (
        <>
            <h2 style={TITLE_STYLE}>{t('dashboard.nextTask.title')}</h2>
            <div style={EMPTY_BODY_STYLE}>
                <p style={TASK_NAME_STYLE}>
                    {t('dashboard.nextTask.empty.title')}
                </p>
                <p style={META_STYLE}>
                    {t('dashboard.nextTask.empty.description')}
                </p>
            </div>
            <div style={CTA_ROW_STYLE}>
                <Link
                    href="/tasks"
                    style={CTA_LINK_STYLE}
                    data-testid="next-task-cta-empty"
                    data-cta="next-task-empty"
                    aria-label={t('nav.tasks')}
                >
                    <Button variant="secondary" size="md" tabIndex={-1}>
                        {t('nav.tasks')}
                    </Button>
                </Link>
            </div>
        </>
    )
}

// ── Inner (inside boundary) ─────────────────────────────────────────────

interface NextTaskCardInnerProps {
    endpoint: string | null
    reloadNonce: number
    onRetry: () => void
}

function NextTaskCardInner({
    endpoint,
    reloadNonce,
    onRetry,
}: NextTaskCardInnerProps): ReactNode {
    // Для корректного различения «ещё не грузилось» и «пришёл null»
    // держим два независимых state-а: `data` и `hasLoaded`. Пока
    // `hasLoaded === false`, рендерим skeleton; после резолва loader-а
    // (успех или empty) ставим true, и дальше `data` уже трактуется
    // как источник истины для success/empty ветвлений.
    const [data, setData] = useState<NextTaskState>(null)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        abortRef.current = controller

        setIsLoading(true)
        setError(null)
        setHasLoaded(false)

        loadNextTask(endpoint, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return
                setData(result)
                setHasLoaded(true)
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

    if (isLoading || !hasLoaded) {
        return (
            <Skeleton
                variant="card"
                label={t('state.loading')}
                data-testid="next-task-skeleton"
            />
        )
    }

    if (!data) {
        return <NextTaskEmpty />
    }

    return <NextTaskContent task={data} />
}

// ── Public component ────────────────────────────────────────────────────

export function NextTaskCard({
    endpoint = null,
    className,
}: NextTaskCardProps = {}) {
    const [reloadNonce, setReloadNonce] = useState(0)

    const handleRetry = useCallback(() => {
        setReloadNonce((n) => n + 1)
    }, [])

    return (
        <GlassCard
            className={className}
            style={CARD_ROOT_STYLE}
            data-dashboard-card="next-task"
        >
            <CardErrorBoundary retry={handleRetry}>
                <NextTaskCardInner
                    endpoint={endpoint}
                    reloadNonce={reloadNonce}
                    onRetry={handleRetry}
                />
            </CardErrorBoundary>
        </GlassCard>
    )
}

export default NextTaskCard
