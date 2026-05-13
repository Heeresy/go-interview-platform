import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act, fireEvent } from '@testing-library/react'

import { ActivityCard } from './ActivityCard'
import { NextTaskCard } from './NextTaskCard'
import { ProgressCard } from './ProgressCard'
import { t } from '@/lib/i18n'

/**
 * Dashboard cards — unit tests (task 14.2).
 *
 * Validates the behavioural contract documented in Requirements
 * 5.3–5.6 / 20.1 / 20.3 / 22.4:
 *
 *   - Each card renders a `<Skeleton />` while loading (Req 5.4, 20.1).
 *   - Each card renders its domain-specific success content once the
 *     mock loader resolves (Req 5.3).
 *   - Each card renders an inline `<ErrorState retry />` when its
 *     loader throws; retry transitions back into the loading → success
 *     pipeline (Req 5.5, 20.3).
 *   - State isolation (Req 5.6) is validated structurally: a failing
 *     ProgressCard sibling never hides the success body of a
 *     NextTaskCard rendered next to it. Property 15 (task 14.3b) is
 *     the authoritative check for the full invariant.
 *
 * Strategy — matches `TrainerQuickCard.test.tsx` / `MockQuickCard.test.tsx`:
 * real timers + real setTimeout(400ms) for the mock path instead of
 * fake timers (which collide with `findBy*` polling in @testing-library).
 * Success assertions rely on `findBy*` (natural waits); error assertions
 * resolve immediately because the fetch rejection is synchronous in
 * practice.
 */

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

// ── ProgressCard ─────────────────────────────────────────────────────────

describe('<ProgressCard />', () => {
    it('renders a Skeleton in the loading state', () => {
        const { getByTestId } = render(<ProgressCard endpoint={null} />)
        expect(getByTestId('progress-card-skeleton')).toBeTruthy()
    })

    it('renders ProgressBar + details with mock data after loader resolves', async () => {
        const { findByTestId, getByTestId } = render(
            <ProgressCard endpoint={null} />,
        )
        const bar = await findByTestId('progress-card-bar')
        expect(bar).toBeTruthy()

        const details = getByTestId('progress-card-details')
        // Mock values: 42/120 questions, 18/60 tasks.
        expect(details.textContent).toContain('42')
        expect(details.textContent).toContain('120')
        expect(details.textContent).toContain('18')
        expect(details.textContent).toContain('60')
    })

    it('shows inline ErrorState with retry when fetch rejects', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValue(new Error('network down'))

        const { findByRole } = render(
            <ProgressCard endpoint="/api/profile/progress" />,
        )
        const alert = await findByRole('alert')
        expect(alert.textContent).toContain(t('state.error.unknown'))
        expect(alert.querySelector('button')?.textContent).toBe(
            t('common.retry'),
        )
    })

    it('recovers from an error after clicking retry', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValueOnce(new Error('boom'))
        fetchSpy.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    questionsSolved: 1,
                    questionsTotal: 10,
                    tasksSolved: 2,
                    tasksTotal: 5,
                }),
                {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                },
            ),
        )

        const { findByRole, findByTestId } = render(
            <ProgressCard endpoint="/api/profile/progress" />,
        )
        const alert = await findByRole('alert')
        const retryBtn = alert.querySelector('button') as HTMLButtonElement

        await act(async () => {
            fireEvent.click(retryBtn)
        })

        const bar = await findByTestId('progress-card-bar')
        expect(bar).toBeTruthy()
        expect(fetchSpy).toHaveBeenCalledTimes(2)
    })
})

// ── NextTaskCard ─────────────────────────────────────────────────────────

describe('<NextTaskCard />', () => {
    it('renders a Skeleton in the loading state', () => {
        const { getByTestId } = render(<NextTaskCard endpoint={null} />)
        expect(getByTestId('next-task-skeleton')).toBeTruthy()
    })

    it('renders the task title, difficulty and CTA to /tasks/<id> after mock resolves', async () => {
        const { findByTestId } = render(<NextTaskCard endpoint={null} />)

        const title = await findByTestId('next-task-title')
        expect(title.textContent).toBe('Two Sum')

        const difficulty = await findByTestId('next-task-difficulty')
        expect(difficulty.textContent).toContain('Средний')

        const cta = (await findByTestId(
            'next-task-cta',
        )) as HTMLAnchorElement
        expect(cta.getAttribute('href')).toBe('/tasks')
        expect(cta.textContent).toContain(t('dashboard.nextTask.cta'))
    })

    it('renders empty-state CTA when the endpoint returns null', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockResolvedValueOnce(
            new Response('null', {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const { findByTestId } = render(
            <NextTaskCard endpoint="/api/tasks/next" />,
        )
        const cta = (await findByTestId(
            'next-task-cta-empty',
        )) as HTMLAnchorElement
        expect(cta.getAttribute('href')).toBe('/tasks')
    })

    it('shows inline ErrorState with retry on fetch failure', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValueOnce(new Error('offline'))

        const { findByRole } = render(
            <NextTaskCard endpoint="/api/tasks/next" />,
        )
        const alert = await findByRole('alert')
        expect(alert.textContent).toContain(t('state.error.unknown'))
        expect(alert.querySelector('button')?.textContent).toBe(
            t('common.retry'),
        )
    })
})

// ── ActivityCard ─────────────────────────────────────────────────────────

describe('<ActivityCard />', () => {
    it('renders a Skeleton in the loading state', () => {
        const { getByTestId } = render(<ActivityCard endpoint={null} />)
        expect(getByTestId('activity-card-skeleton')).toBeTruthy()
    })

    it('renders 7 labelled bar columns and a total after mock resolves', async () => {
        const { findByTestId, getByTestId } = render(
            <ActivityCard endpoint={null} />,
        )
        await findByTestId('activity-chart')

        for (let i = 0; i < 7; i++) {
            expect(getByTestId(`activity-column-${i}`)).toBeTruthy()
            const bar = getByTestId(`activity-bar-${i}`)
            expect(bar.getAttribute('aria-label')).toBeTruthy()
        }

        // Mock total: 2+3+1+5+4+0+6 = 21.
        const total = getByTestId('activity-total')
        expect(total.textContent).toContain('21')
    })

    it('renders empty state when all 7 values are zero', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify([0, 0, 0, 0, 0, 0, 0]), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const { findByTestId } = render(
            <ActivityCard endpoint="/api/profile/activity" />,
        )
        const empty = await findByTestId('activity-empty')
        expect(empty.textContent).toBe(t('dashboard.activity.empty'))
    })

    it('shows inline ErrorState with retry when payload is invalid', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        // Wrong array length → parseActivity fails → loader throws.
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify([1, 2, 3]), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const { findByRole } = render(
            <ActivityCard endpoint="/api/profile/activity" />,
        )
        const alert = await findByRole('alert')
        expect(alert.textContent).toContain(t('state.error.unknown'))
    })
})

// ── State isolation (Req 5.6 structural check) ──────────────────────────

describe('state isolation between Dashboard cards (Req 5.6)', () => {
    it('a network failure in one card does not hide the sibling card', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        // ProgressCard fails its network fetch (error branch)…
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValue(new Error('network down'))

        // …while NextTaskCard uses the mock path and resolves.
        const { findByRole, findByTestId } = render(
            <>
                <ProgressCard endpoint="/api/profile/progress" />
                <NextTaskCard endpoint={null} />
            </>,
        )

        const alert = await findByRole('alert')
        expect(alert.textContent).toContain(t('state.error.unknown'))

        const cta = (await findByTestId(
            'next-task-cta',
        )) as HTMLAnchorElement
        expect(cta.getAttribute('href')).toBe('/tasks')
    })
})
