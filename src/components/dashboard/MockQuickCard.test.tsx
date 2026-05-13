import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'

import { MockQuickCard } from './MockQuickCard'
import { t } from '@/lib/i18n'

/**
 * `<MockQuickCard />` — unit tests (task 14.3, Req 5.3, 5.4, 5.5, 20.1,
 * 20.3, 22.4).
 *
 * Контракт deg-to-CTA пути: когда upcoming = null, карточка показывает
 * CTA «Создать мок-интервью» без блока upcoming.
 */

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('<MockQuickCard />', () => {
    it('renders a Skeleton on first render', () => {
        const { getByRole } = render(<MockQuickCard endpoint={null} />)
        const skeleton = getByRole('status')
        expect(skeleton.getAttribute('aria-busy')).toBe('true')
    })

    it('renders CTA to /mock/create and no upcoming block when mock resolves to null', async () => {
        const { findByTestId, queryByTestId } = render(
            <MockQuickCard endpoint={null} />,
        )

        const link = (await findByTestId(
            'mock-create-link',
        )) as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/mock/create')
        expect(link.textContent).toContain(
            t('commandPalette.action.createMock'),
        )

        // upcoming отсутствует — блок не рендерится.
        expect(queryByTestId('mock-upcoming')).toBeNull()
    })

    it('renders the upcoming block when endpoint returns one', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    upcoming: {
                        id: 'm1',
                        title: 'System design mock',
                        startsAt: '2030-01-02T15:30:00Z',
                    },
                }),
                {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                },
            ),
        )

        const { findByTestId } = render(
            <MockQuickCard endpoint="/api/mock/upcoming" />,
        )

        const upcoming = await findByTestId('mock-upcoming')
        expect(upcoming.textContent).toContain('System design mock')

        // CTA виден всегда.
        const link = (await findByTestId(
            'mock-create-link',
        )) as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/mock/create')
    })

    it('degrades to mock data when fetch returns !ok (no ErrorState)', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockResolvedValueOnce(
            new Response('nope', { status: 404 }),
        )

        const { findByTestId, queryByRole, queryByTestId } = render(
            <MockQuickCard endpoint="/api/mock/upcoming" />,
        )
        // deg-to-CTA: upcoming=null, CTA виден.
        const link = (await findByTestId(
            'mock-create-link',
        )) as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/mock/create')
        expect(queryByTestId('mock-upcoming')).toBeNull()
        expect(queryByRole('alert')).toBeNull()
    })

    it('shows inline ErrorState with retry when fetch throws', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const fetchSpy = vi.spyOn(global, 'fetch')
        fetchSpy.mockRejectedValue(new Error('net down'))

        const { findByRole } = render(
            <MockQuickCard endpoint="/api/mock/upcoming" />,
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
            new Response(JSON.stringify({ upcoming: null }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const { findByRole, findByTestId } = render(
            <MockQuickCard endpoint="/api/mock/upcoming" />,
        )
        const alert = await findByRole('alert')
        const retryBtn = alert.querySelector('button') as HTMLButtonElement
        fireEvent.click(retryBtn)

        const link = (await findByTestId(
            'mock-create-link',
        )) as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/mock/create')
    })
})
