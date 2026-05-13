import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'

import { LeaderboardCard } from './LeaderboardCard'
import { t } from '@/lib/i18n'

/**
 * `<LeaderboardCard />` — unit tests (task 14.3, Req 5.3, 5.4, 5.5, 20.1,
 * 20.3, 22.4).
 *
 * Контракт покрытия:
 *
 *   - Начальный рендер показывает Skeleton (role=status, aria-busy=true)
 *     — `useCardData` стартует в isLoading=true (Req 5.4, 20.1).
 *   - После резолва mock loader-а рендерится заголовок из i18n и
 *     список топ-5 (Req 5.3).
 *   - При сетевом throw — inline ErrorState с retry (Req 5.5, 20.3);
 *     при !ok или невалидном payload loader тихо деградирует на mock —
 *     без ErrorState.
 *   - Retry перезапускает loader (Req 20.3).
 */

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('<LeaderboardCard />', () => {
    it('renders a Skeleton on first render', () => {
        const { getByRole } = render(<LeaderboardCard endpoint={null} />)
        const skeleton = getByRole('status')
        expect(skeleton.getAttribute('aria-busy')).toBe('true')
    })

    it('renders the top-5 list with localized title after the mock loader resolves', async () => {
        const { findByTestId } = render(<LeaderboardCard endpoint={null} />)

        const list = await findByTestId('leaderboard-list')
        expect(list).toBeTruthy()

        // Ровно 5 строк (топ-N).
        expect(list.querySelectorAll('li')).toHaveLength(5)

        // Mock первый элемент — «Анна / 2450».
        const first = list.querySelector(
            '[data-testid="leaderboard-row-u1"]',
        ) as HTMLElement
        expect(first).toBeTruthy()
        expect(first.textContent).toContain('Анна')
        expect(first.textContent).toContain('2450')

        // Заголовок рендерится из i18n.
        expect(list.parentElement?.textContent).toContain(
            t('dashboard.leaderboard.title'),
        )
    })

    it('degrades to mock data when fetch returns !ok (no ErrorState)', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockResolvedValueOnce(
            new Response('nope', { status: 404 }),
        )

        const { findByTestId, queryByRole } = render(
            <LeaderboardCard endpoint="/api/leaderboard" />,
        )
        const list = await findByTestId('leaderboard-list')
        expect(list.querySelectorAll('li')).toHaveLength(5)
        expect(queryByRole('alert')).toBeNull()
    })

    it('shows inline ErrorState with retry when fetch throws', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValue(new Error('net down'))

        const { findByRole } = render(
            <LeaderboardCard endpoint="/api/leaderboard" />,
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
        fetchSpy.mockRejectedValueOnce(new Error('boom'))
        fetchSpy.mockResolvedValueOnce(
            new Response(
                JSON.stringify([
                    { id: 'a', name: 'A', score: 10 },
                    { id: 'b', name: 'B', score: 9 },
                    { id: 'c', name: 'C', score: 8 },
                ]),
                {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                },
            ),
        )

        const { findByRole, findByTestId } = render(
            <LeaderboardCard endpoint="/api/leaderboard" />,
        )
        const alert = await findByRole('alert')
        const retryBtn = alert.querySelector('button') as HTMLButtonElement
        fireEvent.click(retryBtn)

        const list = await findByTestId('leaderboard-list')
        expect(list.querySelectorAll('li')).toHaveLength(3)
    })
})
