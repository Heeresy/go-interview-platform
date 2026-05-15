import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'

import { TrainerQuickCard } from './TrainerQuickCard'
import { t } from '@/lib/i18n'

/**
 * `<TrainerQuickCard />` — unit tests (task 14.3, Req 5.3, 5.4, 5.5, 20.1,
 * 20.3, 22.4).
 *
 * Паттерн тест-суита идентичен `LeaderboardCard.test.tsx` и
 * `DashboardCards.test.tsx` для task 14.2.
 */

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('<TrainerQuickCard />', () => {
    it('renders a Skeleton on first render', () => {
        const { getByRole } = render(<TrainerQuickCard endpoint={null} />)
        const skeleton = getByRole('status')
        expect(skeleton.getAttribute('aria-busy')).toBe('true')
    })

    it('renders current level + "Продолжить" link to /trainer after mock resolves', async () => {
        const { findByTestId } = render(<TrainerQuickCard endpoint={null} />)

        // Уровень (mock = 1).
        const level = await findByTestId('trainer-current-level')
        expect(level.textContent).toMatch(/Уровень\s*2/)

        // CTA.
        const link = (await findByTestId(
            'trainer-continue-link',
        )) as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/trainer?level=2')
        expect(link.textContent).toContain(t('common.continue'))
    })

    it('degrades to mock data when fetch returns !ok (no ErrorState)', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockResolvedValueOnce(
            new Response('nope', { status: 404 }),
        )

        const { findByTestId, queryByRole } = render(
            <TrainerQuickCard endpoint="/api/trainer/state" />,
        )
        const level = await findByTestId('trainer-current-level')
        expect(level.textContent).toMatch(/Уровень\s*2/)
        expect(queryByRole('alert')).toBeNull()
    })

    it('shows inline ErrorState with retry when fetch throws', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValue(new Error('net down'))

        const { findByRole } = render(
            <TrainerQuickCard endpoint="/api/trainer/state" />,
        )
        const alert = await findByRole('alert')
        expect(alert.textContent).toContain(t('state.error.unknown'))
        expect(alert.querySelector('button')?.textContent).toBe(
            t('common.retry'),
        )
    })

    it('retry re-enters the loading → success pipeline', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValueOnce(new Error('net down'))
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify({ currentLevel: 3 }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const { findByRole, findByTestId } = render(
            <TrainerQuickCard endpoint="/api/trainer/state" />,
        )
        const alert = await findByRole('alert')
        const retryBtn = alert.querySelector('button') as HTMLButtonElement
        fireEvent.click(retryBtn)

        const level = await findByTestId('trainer-current-level')
        expect(level.textContent).toMatch(/Уровень\s*3/)
    })
})
