'use client'

/**
 * `<MockQuickCard />` — Bento-плитка быстрого входа в мок-интервью
 * (Requirements 5.3, 5.4, 5.5, 5.6, 20.1, 20.3, 22.4).
 *
 * Контракт симметричен остальным dashboard-карточкам task 14.2:
 *
 *   - Собственный `<CardErrorBoundary />` + собственный `useCardData` →
 *     state изолирован к инстансу (Req 5.6).
 *
 *   - Skeleton при загрузке (Req 5.4, 20.1), inline ErrorState при
 *     ошибке (Req 5.5, 20.3). В success-состоянии — опциональный блок
 *     ближайшего upcoming-мока и CTA «Создать мок-интервью» на
 *     `/mock/create`. Если upcoming отсутствует, блок не рендерится,
 *     остаётся только CTA — штатный empty-state (Req 20.2 эквивалент).
 *
 *   - Loader пытается обратиться к эндпоинту `/api/mock/upcoming`;
 *     пока реального эндпоинта расписания нет, loader тихо деградирует
 *     на mock `{ upcoming: null }` при !ok / невалидном payload-е.
 *     Сетевой throw пробрасывается в ErrorState.
 *
 *   - Все строки через `t()` (Req 24.2). Для CTA используется ключ
 *     `commandPalette.action.createMock` = «Создать мок-интервью» —
 *     это устраняет дублирование строк в словаре.
 *
 *   - Токены Design_System (Req 1.8). Переход — через `next/link`,
 *     оборачивающий DS `Button`.
 */

import Link from 'next/link'
import {
    useCallback,
    type CSSProperties,
    type ReactElement,
} from 'react'

import {
    Button,
    ErrorState,
    GlassCard,
    Skeleton,
} from '@/components/ui'
import { t } from '@/lib/i18n'

import { CardErrorBoundary } from './CardErrorBoundary'
import { useCardData } from './useCardData'

// ── Public prop type ────────────────────────────────────────────────────

export interface MockQuickCardProps {
    /**
     * Endpoint, возвращающий `{ upcoming: UpcomingMock | null }`
     * (или явный `null`). `null` значение пропа — принудительно mock.
     * По умолчанию `/api/mock/upcoming` — реального эндпоинта нет,
     * loader тихо деградирует на mock.
     */
    endpoint?: string | null
}

// ── Data contract ───────────────────────────────────────────────────────

interface UpcomingMock {
    id: string
    title: string
    /** ISO-строка даты начала мок-интервью. */
    startsAt: string
}

interface MockState {
    upcoming: UpcomingMock | null
}

const MOCK_STATE: MockState = { upcoming: null }

function parseUpcoming(raw: unknown): UpcomingMock | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id) return null
    if (typeof o.title !== 'string' || !o.title) return null
    if (typeof o.startsAt !== 'string' || !o.startsAt) return null
    return { id: o.id, title: o.title, startsAt: o.startsAt }
}

function parseMockState(input: unknown): MockState | null {
    if (input === null) return { upcoming: null }
    if (!input || typeof input !== 'object') return null
    const o = input as Record<string, unknown>
    if (!('upcoming' in o)) return null
    const upcomingRaw = o.upcoming
    if (upcomingRaw === null) return { upcoming: null }
    const upcoming = parseUpcoming(upcomingRaw)
    if (!upcoming) return null
    return { upcoming }
}

/**
 * Loader состояния мок-интервью.
 *
 *   - `endpoint === null` → mock после минимального delay.
 *   - fetch !ok → тихо mock.
 *   - payload невалиден → тихо mock.
 *   - сетевой throw → пробрасываем, ErrorState с retry.
 */
async function loadMockState(endpoint: string | null): Promise<MockState> {
    if (endpoint === null) {
        await new Promise<void>((resolve) => setTimeout(resolve, 16))
        return { ...MOCK_STATE }
    }

    const response = await fetch(endpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) return { ...MOCK_STATE }

    let json: unknown
    try {
        json = await response.json()
    } catch {
        return { ...MOCK_STATE }
    }
    return parseMockState(json) ?? { ...MOCK_STATE }
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

const BODY_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
}

const UPCOMING_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface-200)',
    color: 'var(--border-800)',
}

const UPCOMING_TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--border-900)',
    margin: 0,
}

const UPCOMING_TIME_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-regular)',
    color: 'var(--border-700)',
    fontVariantNumeric: 'tabular-nums',
    margin: 0,
}

const LINK_STYLE: CSSProperties = {
    textDecoration: 'none',
    alignSelf: 'flex-start',
}

/**
 * Форматирует дату upcoming-мока. Невалидный ISO возвращаем как есть —
 * безопаснее, чем throw.
 */
function formatWhen(iso: string): string {
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return iso
        return d.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return iso
    }
}

function MockQuickCardInner({
    endpoint,
}: {
    endpoint: string | null
}): ReactElement {
    const loader = useCallback(() => loadMockState(endpoint), [endpoint])
    const { data, isLoading, error, retry } =
        useCardData<MockState>(loader)

    return (
        <GlassCard style={CARD_STYLE} data-ds="mock-quick-card">
            <h3 style={TITLE_STYLE}>{t('dashboard.mock.title')}</h3>

            {isLoading ? (
                <Skeleton variant="card" label={t('state.loading')} />
            ) : error ? (
                <ErrorState messageKey="state.error.unknown" retry={retry} />
            ) : (
                <div style={BODY_STYLE} data-testid="mock-quick-body">
                    {data?.upcoming ? (
                        <div
                            style={UPCOMING_STYLE}
                            data-testid="mock-upcoming"
                        >
                            <p style={UPCOMING_TITLE_STYLE}>
                                {data.upcoming.title}
                            </p>
                            <p
                                style={UPCOMING_TIME_STYLE}
                                data-testid="mock-upcoming-time"
                            >
                                {formatWhen(data.upcoming.startsAt)}
                            </p>
                        </div>
                    ) : null}
                    <Link
                        href="/mock/create"
                        style={LINK_STYLE}
                        data-testid="mock-create-link"
                        aria-label={t(
                            'commandPalette.action.createMock',
                        )}
                    >
                        <Button variant="primary" size="md">
                            {t('commandPalette.action.createMock')}
                        </Button>
                    </Link>
                </div>
            )}
        </GlassCard>
    )
}

/**
 * Публичный компонент. Inner-рендер обёрнут в собственный
 * `<CardErrorBoundary />`.
 */
export function MockQuickCard({
    endpoint = '/api/mock/upcoming',
}: MockQuickCardProps = {}): ReactElement {
    return (
        <CardErrorBoundary>
            <MockQuickCardInner endpoint={endpoint} />
        </CardErrorBoundary>
    )
}

export default MockQuickCard
