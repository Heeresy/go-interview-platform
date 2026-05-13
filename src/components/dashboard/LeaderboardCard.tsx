'use client'

/**
 * `<LeaderboardCard />` — Bento-плитка топ-5 пользователей по score
 * (Requirements 5.3, 5.4, 5.5, 5.6, 20.1, 20.3, 22.4).
 *
 * Контракт — симметричен остальным dashboard-карточкам task 14.2:
 *
 *   - Собственный `<CardErrorBoundary />` + собственный `useCardData` →
 *     state изолирован к инстансу (Req 5.6). Ошибка одной карточки
 *     никогда не перекрывает сиблингов.
 *
 *   - Skeleton при загрузке (Req 5.4, 20.1). Inline `<ErrorState retry>`
 *     при сетевой/парсинг-ошибке (Req 5.5, 20.3). Retry, отданный
 *     из `useCardData`, перезапускает useEffect без ремонта всей
 *     карточки; runtime-throw из рендера подхватывает CardErrorBoundary.
 *
 *   - Заголовок `t('dashboard.leaderboard.title')` — Req 24.2. Токены
 *     Design_System (Req 1.8).
 *
 *   - Реального эндпоинта лидерборда в проекте нет. По умолчанию
 *     `endpoint = null` → mock-путь с детерминированным топ-5.
 *     Постановка задачи 14.3 явно разрешает mock («Mock data if no
 *     endpoint»). Loader тихо деградирует на mock при 404/невалидном
 *     payload-е, чтобы UX не страдал до поднятия эндпоинта.
 */

import {
    useCallback,
    type CSSProperties,
    type ReactElement,
} from 'react'

import { ErrorState, GlassCard, Skeleton } from '@/components/ui'
import { t } from '@/lib/i18n'

import { CardErrorBoundary } from './CardErrorBoundary'
import { useCardData } from './useCardData'

// ── Public prop type ────────────────────────────────────────────────────

export interface LeaderboardCardProps {
    /**
     * Endpoint, возвращающий массив `{ id, name, score }`. По умолчанию
     * `null` — mock-путь с топ-5.
     */
    endpoint?: string | null
}

// ── Data contract ───────────────────────────────────────────────────────

interface LeaderboardEntry {
    id: string
    name: string
    score: number
}

const MOCK_LEADERBOARD: readonly LeaderboardEntry[] = [
    { id: 'u1', name: 'Анна', score: 2450 },
    { id: 'u2', name: 'Борис', score: 2180 },
    { id: 'u3', name: 'Вера', score: 1940 },
    { id: 'u4', name: 'Глеб', score: 1720 },
    { id: 'u5', name: 'Дарья', score: 1560 },
] as const

const TOP_N = 5

function parseLeaderboard(input: unknown): LeaderboardEntry[] | null {
    if (!Array.isArray(input)) return null
    const out: LeaderboardEntry[] = []
    for (const raw of input) {
        if (!raw || typeof raw !== 'object') return null
        const o = raw as Record<string, unknown>
        if (typeof o.id !== 'string' || !o.id) return null
        if (typeof o.name !== 'string' || !o.name) return null
        if (
            typeof o.score !== 'number' ||
            !Number.isFinite(o.score) ||
            o.score < 0
        ) {
            return null
        }
        out.push({ id: o.id, name: o.name, score: Math.floor(o.score) })
    }
    return out
}

/**
 * Loader топ-5.
 *
 *   - `endpoint === null` → mock после минимального delay (16ms ≈ 1
 *     кадр), чтобы Skeleton успел отрендериться.
 *   - fetch !ok → тихо mock (эндпоинт не реализован → UX не страдает).
 *   - payload невалиден → тихо mock.
 *   - сетевой throw → пробрасываем, ErrorState с retry.
 */
async function loadLeaderboard(
    endpoint: string | null,
): Promise<LeaderboardEntry[]> {
    if (endpoint === null) {
        await new Promise<void>((resolve) => setTimeout(resolve, 16))
        return [...MOCK_LEADERBOARD]
    }

    const response = await fetch(endpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) return [...MOCK_LEADERBOARD]

    let json: unknown
    try {
        json = await response.json()
    } catch {
        return [...MOCK_LEADERBOARD]
    }
    const parsed = parseLeaderboard(json)
    return parsed ?? [...MOCK_LEADERBOARD]
}

// ── Presentation ────────────────────────────────────────────────────────

const CARD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    padding: 'var(--space-5)',
    height: '100%',
    minHeight: 'var(--space-32)',
    borderRadius: 'var(--radius-lg)',
}

const TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-md)',
    fontWeight: 'var(--fw-semibold)',
    margin: 0,
    color: 'var(--border-900)',
}

const LIST_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    listStyle: 'none',
    padding: 0,
    margin: 0,
}

const ROW_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    paddingBlock: 'var(--space-2)',
    paddingInline: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface-200)',
    color: 'var(--border-800)',
    fontSize: 'var(--fs-sm)',
}

const RANK_STYLE: CSSProperties = {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--space-6)',
    height: 'var(--space-6)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--accent-600)',
    color: 'var(--bg-0)',
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1,
}

const NAME_STYLE: CSSProperties = {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 'var(--fw-medium)',
}

const SCORE_STYLE: CSSProperties = {
    flexShrink: 0,
    color: 'var(--accent-600)',
    fontWeight: 'var(--fw-semibold)',
    fontVariantNumeric: 'tabular-nums',
}

function LeaderboardCardInner({
    endpoint,
}: {
    endpoint: string | null
}): ReactElement {
    const loader = useCallback(() => loadLeaderboard(endpoint), [endpoint])
    const { data, isLoading, error, retry } =
        useCardData<LeaderboardEntry[]>(loader)

    return (
        <GlassCard style={CARD_STYLE} data-ds="leaderboard-card">
            <h3 style={TITLE_STYLE}>{t('dashboard.leaderboard.title')}</h3>

            {isLoading ? (
                <Skeleton variant="card" label={t('state.loading')} />
            ) : error ? (
                <ErrorState messageKey="state.error.unknown" retry={retry} />
            ) : (
                <ol style={LIST_STYLE} data-testid="leaderboard-list">
                    {(data ?? []).slice(0, TOP_N).map((entry, idx) => (
                        <li
                            key={entry.id}
                            style={ROW_STYLE}
                            data-testid={`leaderboard-row-${entry.id}`}
                        >
                            <span style={RANK_STYLE} aria-hidden="true">
                                {idx + 1}
                            </span>
                            <span style={NAME_STYLE}>{entry.name}</span>
                            <span style={SCORE_STYLE}>{entry.score}</span>
                        </li>
                    ))}
                </ol>
            )}
        </GlassCard>
    )
}

/**
 * Публичный компонент. Inner-рендер обёрнут в собственный
 * `<CardErrorBoundary />`.
 */
export function LeaderboardCard({
    endpoint = null,
}: LeaderboardCardProps = {}): ReactElement {
    return (
        <CardErrorBoundary>
            <LeaderboardCardInner endpoint={endpoint} />
        </CardErrorBoundary>
    )
}

export default LeaderboardCard
