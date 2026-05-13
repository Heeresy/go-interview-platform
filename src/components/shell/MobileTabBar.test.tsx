import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import {
    MobileTabBar,
    MOBILE_TAB_BAR_MAX_ITEMS,
    isMobileTabBarItemActive,
} from './MobileTabBar'

/**
 * Контролируемый мок `usePathname` — симметрично Sidebar.test.tsx,
 * управляем pathname через локальную переменную, чтобы не
 * пересобирать модуль между describe-блоками.
 */
let currentPathname = '/'
function setPathname(p: string) {
    currentPathname = p
}

vi.mock('next/navigation', () => ({
    usePathname: () => currentPathname,
}))

/**
 * MobileTabBar — App_Shell примитив (задача 10.4).
 *
 * Проверяет Requirements 8.1, 8.2, 8.3, 8.4, 11.8, 22.2:
 *  - рендер пустой оболочки при `items.length === 0` (Req 8.2);
 *  - `aria-current="page"` на активном табе через `usePathname` (Req 6.3 ∩ 8.1);
 *  - ограничение на 5 табов (Req 8.3, `.slice(0, 5)`);
 *  - Glass-поверхность через класс `.glass` (Req 8.4);
 *  - корректные href и метки.
 */

function TestIcon({ name }: { name: string }) {
    return <svg data-icon={name} aria-hidden="true" />
}

const sampleItems = [
    { href: '/', label: 'Home', icon: <TestIcon name="home" /> },
    { href: '/questions', label: 'Questions', icon: <TestIcon name="q" /> },
    { href: '/tasks', label: 'Tasks', icon: <TestIcon name="t" /> },
    { href: '/trainer', label: 'Trainer', icon: <TestIcon name="tr" /> },
    { href: '/mock', label: 'Mock', icon: <TestIcon name="m" /> },
]

describe('isMobileTabBarItemActive', () => {
    it('matches "/" only by strict equality', () => {
        expect(isMobileTabBarItemActive('/', '/')).toBe(true)
        expect(isMobileTabBarItemActive('/questions', '/')).toBe(false)
    })

    it('matches non-root route and its sub-routes', () => {
        expect(isMobileTabBarItemActive('/tasks', '/tasks')).toBe(true)
        expect(isMobileTabBarItemActive('/tasks/42', '/tasks')).toBe(true)
        expect(isMobileTabBarItemActive('/tasks/42/edit', '/tasks')).toBe(true)
    })

    it('does not confuse similar-looking sibling routes', () => {
        expect(isMobileTabBarItemActive('/task-graph', '/tasks')).toBe(false)
        expect(isMobileTabBarItemActive('/tasksuffix', '/tasks')).toBe(false)
    })

    it('handles empty pathname defensively', () => {
        expect(isMobileTabBarItemActive('', '/')).toBe(false)
        expect(isMobileTabBarItemActive('', '/questions')).toBe(false)
    })
})

describe('MobileTabBar', () => {
    beforeEach(() => {
        setPathname('/')
        cleanup()
    })

    it('renders empty <nav aria-hidden /> shell when items is empty (Req 8.2)', () => {
        const { container } = render(<MobileTabBar items={[]} />)
        const nav = container.querySelector('nav')
        expect(nav).not.toBeNull()
        // aria-hidden запрещает объявление скринридерами.
        expect(nav?.getAttribute('aria-hidden')).toBe('true')
        // Glass-поверхность присутствует даже в пустом состоянии — это всё
        // ещё та же оболочка tab-bar, просто без содержимого.
        expect(nav?.classList.contains('glass')).toBe(true)
        expect(nav?.classList.contains('mobile-tab-bar')).toBe(true)
        // Никаких <a>/<li> внутри пустой оболочки.
        expect(container.querySelector('a')).toBeNull()
        expect(container.querySelector('li')).toBeNull()
    })

    it('renders a non-empty nav with glass class and items', () => {
        const { container } = render(<MobileTabBar items={sampleItems} />)
        const nav = container.querySelector('nav')
        expect(nav).not.toBeNull()
        expect(nav?.getAttribute('aria-hidden')).toBeNull()
        expect(nav?.classList.contains('glass')).toBe(true)
        expect(nav?.classList.contains('mobile-tab-bar')).toBe(true)

        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(5)
        // Порядок сохранён.
        expect(links[0]).toHaveAttribute('href', '/')
        expect(links[1]).toHaveAttribute('href', '/questions')
        expect(links[4]).toHaveAttribute('href', '/mock')
    })

    it(`limits rendered items to ${MOBILE_TAB_BAR_MAX_ITEMS} (Req 8.3)`, () => {
        const extra = [
            ...sampleItems,
            { href: '/profile', label: 'Profile', icon: <TestIcon name="p" /> },
            { href: '/status', label: 'Status', icon: <TestIcon name="s" /> },
        ]
        render(<MobileTabBar items={extra} />)
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(MOBILE_TAB_BAR_MAX_ITEMS)
        // Шестой и далее отброшены — `/profile` не должен быть в DOM.
        expect(screen.queryByRole('link', { name: /profile/i })).toBeNull()
    })

    it('marks active tab with aria-current="page" and data-active="true" based on usePathname', () => {
        setPathname('/tasks/42')
        render(<MobileTabBar items={sampleItems} />)
        const links = screen.getAllByRole('link')

        const activeLinks = links.filter(
            (a) => a.getAttribute('aria-current') === 'page',
        )
        expect(activeLinks).toHaveLength(1)
        expect(activeLinks[0]).toHaveAttribute('href', '/tasks')
        expect(activeLinks[0].getAttribute('data-active')).toBe('true')

        // Все неактивные — без aria-current, data-active="false".
        for (const link of links) {
            if (link === activeLinks[0]) continue
            expect(link.getAttribute('aria-current')).toBeNull()
            expect(link.getAttribute('data-active')).toBe('false')
        }
    })

    it('activates root "/" tab only when pathname is exactly "/"', () => {
        setPathname('/')
        render(<MobileTabBar items={sampleItems} />)
        const home = screen.getByRole('link', { name: /home/i })
        expect(home.getAttribute('aria-current')).toBe('page')

        cleanup()
        setPathname('/questions')
        render(<MobileTabBar items={sampleItems} />)
        const homeAfter = screen.getByRole('link', { name: /home/i })
        expect(homeAfter.getAttribute('aria-current')).toBeNull()
    })

    it('each link contains both the icon and the label (touch-target shape)', () => {
        render(<MobileTabBar items={sampleItems} />)
        // Иконки помечены aria-hidden, чтобы не дублировать метку в AT.
        const icons = document.querySelectorAll('.mobile-tab-bar__icon')
        expect(icons.length).toBe(sampleItems.length)
        for (const icon of Array.from(icons)) {
            expect(icon.getAttribute('aria-hidden')).toBe('true')
        }
        // Метки видимы и несут текст.
        const labels = document.querySelectorAll('.mobile-tab-bar__label')
        expect(labels.length).toBe(sampleItems.length)
        expect(labels[0].textContent).toBe('Home')
    })
})
