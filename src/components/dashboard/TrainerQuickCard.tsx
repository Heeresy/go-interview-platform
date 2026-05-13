'use client'

/**
 * `<TrainerQuickCard />` — Bento-плитка быстрого входа в тренажёр
 * (Requirements 5.3, 5.4, 5.5, 5.6, 20.1, 20.3, 22.4).
 *
 * Контракт симметричен остальным dashboard-карточкам task 14.2:
 *
 *   - Собственный `<CardErrorBoundary />` + собственный `useCardData` →
 *     state изолирован к инстансу (Req 5.6).
 *
 *   - Skeleton при загрузке (Req 5.4, 20.1), inline ErrorState при
 *     ошибке (Req 5.5, 20.3). В success-состоянии — текущий уровень
 *     пользователя и кнопка «Продолжить» со ссылкой на `/trainer`.
 *
 *   - Loader пытается обратиться к эндпоинту `/api/trainer/state`;
 *     пока эндпоинт не поднят, loader тихо деградирует на mock
 *     (safe-default `currentLevel: 1`). Поведение эквивалентно
 *     `NextTaskCard` и `ProgressCard` — fallback только при !ok или
 *     невалидном payload-е, но сетевой throw пробрасывается в
 *     ErrorState.
 *
 *   - Все строки через `t()` (Req 24.2), токены Design_System (Req 1.8),
 *     переход — через `next/link`, оборачивающий DS `Button`.
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

export interface TrainerQuickCardProps {
    /**
     * Endpoint, возвращающий `{ currentLevel: 1..5 }`. `null` — mock.
     * По умолчанию `/api/trainer/state` — реальный ещё не поднят,
     * loader тихо деградирует на mock.
     */
    endpoint?: string | null
}

// ── Data contract ───────────────────────────────────────────────────────

interface TrainerState {
    currentLevel: number
}

/**
 * Safe-default: уровень 1, совместимо с `lib/trainer.ts` (старт с 1).
 */
const MOCK_TRAINER: TrainerState = { currentLevel: 1 }

function parseTrainerState(input: unknown): TrainerState | null {
    if (!input || typeof input !== 'object') return null
    const o = input as Record<string, unknown>
    const v = o.currentLevel
    if (
        typeof v !== 'number' ||
        !Number.isFinite(v) ||
        v < 1 ||
        v > 5
    ) {
        return null
    }
    return { currentLevel: Math.floor(v) }
}

/**
 * Loader текущего уровня тренажёра.
 *
 *   - `endpoint === null` → mock после минимального delay.
 *   - fetch !ok → тихо mock (эндпоинт не реализован).
 *   - payload невалиден → тихо mock.
 *   - сетевой throw → пробрасываем, ErrorState с retry.
 */
async function loadTrainerState(
    endpoint: string | null,
): Promise<TrainerState> {
    if (endpoint === null) {
        await new Promise<void>((resolve) => setTimeout(resolve, 16))
        return { ...MOCK_TRAINER }
    }

    const response = await fetch(endpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) return { ...MOCK_TRAINER }

    let json: unknown
    try {
        json = await response.json()
    } catch {
        return { ...MOCK_TRAINER }
    }
    return parseTrainerState(json) ?? { ...MOCK_TRAINER }
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

const LEVEL_VALUE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xl)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--accent-600)',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    margin: 0,
}

const LINK_STYLE: CSSProperties = {
    textDecoration: 'none',
    alignSelf: 'flex-start',
}

function TrainerQuickCardInner({
    endpoint,
}: {
    endpoint: string | null
}): ReactElement {
    const loader = useCallback(() => loadTrainerState(endpoint), [endpoint])
    const { data, isLoading, error, retry } =
        useCardData<TrainerState>(loader)

    return (
        <GlassCard style={CARD_STYLE} data-ds="trainer-quick-card">
            <h3 style={TITLE_STYLE}>{t('dashboard.trainer.title')}</h3>

            {isLoading ? (
                <Skeleton variant="card" label={t('state.loading')} />
            ) : error ? (
                <ErrorState messageKey="state.error.unknown" retry={retry} />
            ) : (
                <div style={BODY_STYLE} data-testid="trainer-quick-body">
                    <p
                        style={LEVEL_VALUE_STYLE}
                        data-testid="trainer-current-level"
                    >
                        {t('trainer.header.level', {
                            level: data?.currentLevel ?? 1,
                        })}
                    </p>
                    <Link
                        href="/trainer"
                        style={LINK_STYLE}
                        data-testid="trainer-continue-link"
                        aria-label={t('common.continue')}
                    >
                        <Button variant="primary" size="md">
                            {t('common.continue')}
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
export function TrainerQuickCard({
    endpoint = '/api/trainer/state',
}: TrainerQuickCardProps = {}): ReactElement {
    return (
        <CardErrorBoundary>
            <TrainerQuickCardInner endpoint={endpoint} />
        </CardErrorBoundary>
    )
}

export default TrainerQuickCard
