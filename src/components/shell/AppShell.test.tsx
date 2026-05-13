import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

/**
 * AppShell — App_Shell композиция Sidebar + Topbar + Main + MobileTabBar.
 *
 * Behavioural contract (Requirements 6.1, 6.8, 8.1, 8.2, 8.5, 9.1, 9.2, 9.3, 22.2).
 */

// --- mocks ------------------------------------------------------------------

let currentPathname = '/'
function setPathname(p: string) {
    currentPathname = p
}

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
    usePathname: () => currentPathname,
    useRouter: () => ({
        push: pushMock,
        replace: vi.fn(),
        back: vi.fn(),
        prefetch: vi.fn(),
        refresh: vi.fn(),
    }),
}))

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: { signOut: vi.fn(async () => ({ error: null })) },
    }),
}))

vi.mock('@/lib/analytics', () => ({
    trackEvent: vi.fn(),
}))

// --- helpers ----------------------------------------------------------------

// Imported after mocks so vi.mock is applied to the module graph.
import { AppShell } from './AppShell'
import { ThemeProvider } from './ThemeProvider'

const fakeUser: User = {
    id: 'u1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
} as unknown as User

function renderShell(props: Parameters<typeof AppShell>[0]) {
    return render(
        <ThemeProvider>
            <AppShell {...props} />
        </ThemeProvider>,
    )
}

beforeEach(() => {
    setPathname('/')
    pushMock.mockReset()
    window.localStorage.clear()
})

afterEach(() => {
    cleanup()
})

describe('AppShell — guest (Req 6.8)', () => {
    it('returns null when user === null', () => {
        const { container } = render(
            <ThemeProvider>
                <AppShell user={null}>
                    <div data-testid="page-content">Hello</div>
                </AppShell>
            </ThemeProvider>,
        )
        // ThemeProvider does not render visible children when AppShell is null.
        // Its wrapper is a Fragment, so children are directly inside container.
        expect(container.querySelector('[data-ds="app-shell"]')).toBeNull()
        expect(screen.queryByTestId('page-content')).toBeNull()
    })

    it('does not mount CommandPalette or Sidebar for guests', () => {
        render(
            <ThemeProvider>
                <AppShell user={null}>
                    <div />
                </AppShell>
            </ThemeProvider>,
        )
        // No aside (Sidebar), no banner (Topbar), no nav (tab-bar).
        expect(document.querySelector('aside')).toBeNull()
        expect(document.querySelector('[data-ds="topbar"]')).toBeNull()
        expect(document.querySelector('[data-ds="app-shell"]')).toBeNull()
    })
})

describe('AppShell — authenticated', () => {
    it('renders Sidebar (both instances), Topbar, main, and MobileTabBar', () => {
        renderShell({
            user: fakeUser,
            children: <div data-testid="page-content">Content</div>,
        })

        // Root shell container
        expect(
            document.querySelector('[data-ds="app-shell"]'),
        ).not.toBeNull()

        // Topbar (role=banner) is mounted
        expect(screen.getByRole('banner')).toBeInTheDocument()

        // Both sidebar instances (desktop + tablet) are in DOM, toggled by CSS.
        const sidebars = document.querySelectorAll('aside.sidebar')
        expect(sidebars.length).toBe(2)

        // User's child content is rendered inside main section.
        expect(screen.getByTestId('page-content')).toBeInTheDocument()

        // MobileTabBar (glass nav with 5 items by default).
        const tabBar = document.querySelector('.mobile-tab-bar')
        expect(tabBar).not.toBeNull()
    })

    it('renders exactly 5 tabs in MobileTabBar with correct order (Req 8.3)', () => {
        renderShell({ user: fakeUser, children: <div /> })
        const tabLinks = document.querySelectorAll(
            '.mobile-tab-bar__link',
        )
        expect(tabLinks.length).toBe(5)
        const hrefs = Array.from(tabLinks).map((a) => a.getAttribute('href'))
        expect(hrefs).toEqual([
            '/',
            '/questions',
            '/tasks',
            '/trainer',
            '/mock',
        ])
    })

    it('tablet sidebar instance is collapsed by default (Req 8.5)', () => {
        renderShell({ user: fakeUser, children: <div /> })
        const tabletSidebar = document.querySelector(
            '.app-shell__sidebar--tablet',
        )
        expect(tabletSidebar).not.toBeNull()
        expect(tabletSidebar?.getAttribute('data-collapsed')).toBe('true')
    })

    it('desktop sidebar instance honors localStorage (expanded by default)', () => {
        renderShell({ user: fakeUser, children: <div /> })
        const desktopSidebar = document.querySelector(
            '.app-shell__sidebar--desktop',
        )
        expect(desktopSidebar).not.toBeNull()
        // When localStorage is empty, Sidebar default is expanded (collapsed=false).
        expect(desktopSidebar?.getAttribute('data-collapsed')).toBe('false')
    })

    it('renders a content wrapper that caps max-width (Req 9.2)', () => {
        renderShell({
            user: fakeUser,
            children: <div data-testid="page-content">Content</div>,
        })
        const inner = document.querySelector('.app-shell__main-inner')
        expect(inner).not.toBeNull()
        // Children are rendered inside the inner capped container.
        expect(inner?.contains(screen.getByTestId('page-content'))).toBe(true)
    })
})
