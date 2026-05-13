import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    Sidebar,
    SIDEBAR_COLLAPSED_STORAGE_KEY,
    isSidebarLinkActive,
} from './Sidebar'

/**
 * Контролируемый мок `usePathname` — управляем им из тестов через
 * `setPathname()`. Экспортируем хелпер, чтобы не полагаться на перезапись
 * моков между describe-блоками.
 */
let currentPathname = '/'
function setPathname(p: string) {
    currentPathname = p
}

vi.mock('next/navigation', () => ({
    usePathname: () => currentPathname,
}))

describe('isSidebarLinkActive', () => {
    it('matches "/" only by strict equality', () => {
        expect(isSidebarLinkActive('/', '/')).toBe(true)
        expect(isSidebarLinkActive('/questions', '/')).toBe(false)
        expect(isSidebarLinkActive('/tasks/123', '/')).toBe(false)
    })

    it('matches non-root route and its sub-routes', () => {
        expect(isSidebarLinkActive('/questions', '/questions')).toBe(true)
        expect(isSidebarLinkActive('/questions/abc', '/questions')).toBe(true)
        expect(isSidebarLinkActive('/questions/abc/edit', '/questions')).toBe(true)
    })

    it('does not confuse similar-looking sibling routes', () => {
        // /tasks SHOULD NOT match /task-graph or /tasksuffix
        expect(isSidebarLinkActive('/task-graph', '/tasks')).toBe(false)
        expect(isSidebarLinkActive('/tasksuffix', '/tasks')).toBe(false)
    })

    it('handles empty pathname defensively', () => {
        expect(isSidebarLinkActive('', '/')).toBe(false)
        expect(isSidebarLinkActive('', '/questions')).toBe(false)
    })
})

describe('Sidebar', () => {
    beforeEach(() => {
        setPathname('/')
        window.localStorage.clear()
    })

    it('renders exactly seven navigation links in spec order', () => {
        render(<Sidebar />)
        // All 7 sections from Req 6.2.
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(7)
        expect(links.map((a) => a.getAttribute('href'))).toEqual([
            '/',
            '/questions',
            '/tasks',
            '/trainer',
            '/mock',
            '/profile',
            '/status',
        ])
    })

    it('marks exactly one link as active via data-active="true"', () => {
        setPathname('/questions/abc')
        render(<Sidebar />)
        const active = screen
            .getAllByRole('link')
            .filter((a) => a.getAttribute('data-active') === 'true')
        expect(active).toHaveLength(1)
        expect(active[0]).toHaveAttribute('href', '/questions')
        expect(active[0]).toHaveAttribute('aria-current', 'page')
    })

    it('"/" is active only on strict root match', () => {
        setPathname('/tasks')
        render(<Sidebar />)
        const dashboard = screen
            .getAllByRole('link')
            .find((a) => a.getAttribute('href') === '/')!
        expect(dashboard).toHaveAttribute('data-active', 'false')
    })

    it('reads collapsed state from localStorage on mount', () => {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, '1')
        const { container } = render(<Sidebar />)
        // Effect runs synchronously inside React.act via testing-library render.
        const aside = container.querySelector('aside')!
        expect(aside.getAttribute('data-collapsed')).toBe('true')
    })

    it('toggle button writes "1"/"0" to localStorage', async () => {
        const user = userEvent.setup()
        const { container } = render(<Sidebar />)
        const aside = container.querySelector('aside')!
        expect(aside.getAttribute('data-collapsed')).toBe('false')

        const toggle = screen.getByRole('button', {
            name: /свернуть или развернуть боковую панель/i,
        })
        await user.click(toggle)
        expect(aside.getAttribute('data-collapsed')).toBe('true')
        expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('1')

        await user.click(toggle)
        expect(aside.getAttribute('data-collapsed')).toBe('false')
        expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('0')
    })

    it('swallows localStorage failures without throwing', () => {
        const setItem = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('QuotaExceeded')
            })
        const getItem = vi
            .spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => {
                throw new Error('SecurityError')
            })

        expect(() => render(<Sidebar />)).not.toThrow()

        setItem.mockRestore()
        getItem.mockRestore()
    })

    it('honours defaultCollapsed over storage', () => {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, '0')
        const { container } = render(<Sidebar defaultCollapsed={true} />)
        const aside = container.querySelector('aside')!
        expect(aside.getAttribute('data-collapsed')).toBe('true')
    })

    it('calls onCollapsedChange when toggled', async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<Sidebar onCollapsedChange={onChange} />)
        const toggle = screen.getByRole('button', {
            name: /свернуть или развернуть боковую панель/i,
        })
        await act(async () => {
            await user.click(toggle)
        })
        expect(onChange).toHaveBeenCalledWith(true)
    })
})
