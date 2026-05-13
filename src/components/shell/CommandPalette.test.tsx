import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    render,
    cleanup,
    screen,
    fireEvent,
    act,
} from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import CommandPalette from './CommandPalette'

/**
 * Behavioural contract for <CommandPalette /> (task 11.4).
 *
 * Covers:
 *   - Req 7.1: Ctrl/Cmd+K opens the palette.
 *   - Req 7.2: Esc closes and restores focus.
 *   - Req 7.3: Two groups "nav" / "action".
 *   - Req 7.6: ArrowUp/Down + Enter navigation.
 *   - Req 7.7: confirm closes unconditionally, even if navigation no-ops.
 *   - Req 7.8: no render / no hotkey for unauthenticated user.
 *   - Req 25.4: `command_palette_opened` fires exactly once per open.
 */

// --- mocks ------------------------------------------------------------------

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
        replace: vi.fn(),
        back: vi.fn(),
        prefetch: vi.fn(),
        refresh: vi.fn(),
    }),
}))

const signOutMock = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: { signOut: signOutMock },
    }),
}))

const trackEventMock = vi.fn()
vi.mock('@/lib/analytics', () => ({
    trackEvent: (...args: unknown[]) => trackEventMock(...args),
}))

// --- helpers ----------------------------------------------------------------

const fakeUser: User = {
    id: 'u1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
} as unknown as User

/** Flush microtasks + a single RAF frame (enough for our side-effects). */
async function flush() {
    await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
        await new Promise((r) => requestAnimationFrame(() => r(null)))
        await new Promise((r) => setTimeout(r, 0))
    })
}

function openViaHotkey() {
    fireEvent.keyDown(window, {
        key: 'k',
        ctrlKey: true,
        cancelable: true,
    })
}

beforeEach(() => {
    pushMock.mockReset()
    signOutMock.mockClear()
    trackEventMock.mockReset()
})

afterEach(() => {
    cleanup()
})

describe('CommandPalette — guest (Req 7.8)', () => {
    it('does not render anything when user === null', () => {
        render(<CommandPalette user={null} />)
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).toBeNull()
    })

    it('does not open on Ctrl+K when user === null', async () => {
        render(<CommandPalette user={null} />)
        openViaHotkey()
        await flush()
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).toBeNull()
        expect(trackEventMock).not.toHaveBeenCalled()
    })
})

describe('CommandPalette — authenticated', () => {
    it('opens on Ctrl+K and emits `command_palette_opened` once (Req 7.1, 25.4)', async () => {
        render(<CommandPalette user={fakeUser} />)
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).toBeNull()
        openViaHotkey()
        await flush()
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).not.toBeNull()
        expect(trackEventMock).toHaveBeenCalledTimes(1)
        expect(trackEventMock).toHaveBeenCalledWith('command_palette_opened')
    })

    it('shows two groups labelled nav + action (Req 7.3)', async () => {
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        const groups = document.querySelectorAll(
            '[data-ds="command-palette-group"]',
        )
        const groupKeys = Array.from(groups).map((g) =>
            g.getAttribute('data-group'),
        )
        expect(groupKeys).toContain('nav')
        expect(groupKeys).toContain('action')
    })

    it('Esc closes the palette and restores focus (Req 7.2)', async () => {
        // Set up a pre-focused trigger to restore focus to.
        const trigger = document.createElement('button')
        trigger.textContent = 'trigger'
        document.body.appendChild(trigger)
        trigger.focus()
        expect(document.activeElement).toBe(trigger)

        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).not.toBeNull()

        fireEvent.keyDown(document, { key: 'Escape' })
        await flush()
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).toBeNull()
        expect(document.activeElement).toBe(trigger)

        trigger.remove()
    })

    it('toggles open→close→open (hotkey)', async () => {
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).not.toBeNull()

        openViaHotkey()
        await flush()
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).toBeNull()

        openViaHotkey()
        await flush()
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).not.toBeNull()
        // exactly 2 opens → 2 events.
        expect(trackEventMock).toHaveBeenCalledTimes(2)
    })

    it('ArrowDown + Enter confirms the next item (Req 7.6)', async () => {
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()

        const input = document.querySelector(
            'input[role="combobox"]',
        ) as HTMLInputElement
        expect(input).not.toBeNull()

        // Default activeIndex = 0 → NAV_ITEMS[0] = "/"
        fireEvent.keyDown(input, { key: 'ArrowDown' })
        fireEvent.keyDown(input, { key: 'Enter' })

        await flush()

        // NAV_ITEMS[1] = "/questions"
        expect(pushMock).toHaveBeenCalledWith('/questions')
    })

    it('Enter on first item fires router.push("/") and closes (Req 7.7)', async () => {
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        const input = document.querySelector(
            'input[role="combobox"]',
        ) as HTMLInputElement

        fireEvent.keyDown(input, { key: 'Enter' })
        await flush()

        // Palette closed first, then navigation.
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).toBeNull()
        expect(pushMock).toHaveBeenCalledWith('/')
    })

    it('close is unconditional even when router.push throws (Req 7.7)', async () => {
        pushMock.mockImplementationOnce(() => {
            throw new Error('middleware reject')
        })
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        const input = document.querySelector(
            'input[role="combobox"]',
        ) as HTMLInputElement

        fireEvent.keyDown(input, { key: 'Enter' })
        await flush()

        // Even though router.push threw, the palette MUST be closed (Req 7.7).
        expect(
            document.querySelector('[data-ds="command-palette"]'),
        ).toBeNull()
    })

    it('filters items fuzzy on input, and Enter confirms top match', async () => {
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        const input = document.querySelector(
            'input[role="combobox"]',
        ) as HTMLInputElement

        // "Задачи" (/tasks) — RU title. We can match it via "Зад".
        fireEvent.change(input, { target: { value: 'Зад' } })
        await flush()

        fireEvent.keyDown(input, { key: 'Enter' })
        await flush()
        expect(pushMock).toHaveBeenCalledWith('/tasks')
    })

    it('Enter on "Выйти из аккаунта" action calls signOut (Req 7.3)', async () => {
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        const input = document.querySelector(
            'input[role="combobox"]',
        ) as HTMLInputElement

        fireEvent.change(input, { target: { value: 'Выйти' } })
        await flush()

        fireEvent.keyDown(input, { key: 'Enter' })
        await flush()
        expect(signOutMock).toHaveBeenCalledTimes(1)
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('ArrowDown wraps around at the end of the flat list', async () => {
        render(<CommandPalette user={fakeUser} />)
        openViaHotkey()
        await flush()
        const input = document.querySelector(
            'input[role="combobox"]',
        ) as HTMLInputElement

        // Press ArrowDown many times — should wrap via modulo and still confirm
        // a valid item.
        for (let i = 0; i < 100; i++) {
            fireEvent.keyDown(input, { key: 'ArrowDown' })
        }
        fireEvent.keyDown(input, { key: 'Enter' })
        await flush()

        // Either router.push or signOut should be called exactly once.
        const totalCalls = pushMock.mock.calls.length + signOutMock.mock.calls.length
        expect(totalCalls).toBe(1)
    })
})
