import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { useGlobalHotkey } from './useGlobalHotkey'

/**
 * Contract for `useGlobalHotkey(combo, handler, enabled?)`:
 *   - Listens `keydown` on window.
 *   - `mod` maps to metaKey on macOS, ctrlKey elsewhere.
 *   - Calls `e.preventDefault()` on match.
 *   - Calls handler exactly once per matching keydown.
 *   - Does nothing when `enabled === false`.
 *   - Cleans up on unmount.
 */

function Harness({
    combo,
    handler,
    enabled,
}: {
    combo: string
    handler: () => void
    enabled?: boolean
}) {
    useGlobalHotkey(combo, handler, enabled)
    return null
}

const originalPlatform = Object.getOwnPropertyDescriptor(
    window.navigator,
    'platform',
)

function mockPlatform(platform: string) {
    Object.defineProperty(window.navigator, 'platform', {
        value: platform,
        configurable: true,
    })
}

function restorePlatform() {
    if (originalPlatform) {
        Object.defineProperty(window.navigator, 'platform', originalPlatform)
    }
}

describe('useGlobalHotkey', () => {
    beforeEach(() => {
        // Default: non-mac → mod == ctrl
        mockPlatform('Win32')
    })

    afterEach(() => {
        cleanup()
        restorePlatform()
    })

    it('fires on ctrl+k on non-mac for combo "mod+k"', () => {
        const handler = vi.fn()
        render(<Harness combo="mod+k" handler={handler} />)
        const e = new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            cancelable: true,
        })
        window.dispatchEvent(e)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(e.defaultPrevented).toBe(true)
    })

    it('does not fire on meta+k on non-mac (mod = ctrl only)', () => {
        const handler = vi.fn()
        render(<Harness combo="mod+k" handler={handler} />)
        window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
        )
        expect(handler).not.toHaveBeenCalled()
    })

    it('fires on meta+k on mac for combo "mod+k"', () => {
        mockPlatform('MacIntel')
        const handler = vi.fn()
        render(<Harness combo="mod+k" handler={handler} />)
        window.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                cancelable: true,
            }),
        )
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('does not fire on plain "k"', () => {
        const handler = vi.fn()
        render(<Harness combo="mod+k" handler={handler} />)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
        expect(handler).not.toHaveBeenCalled()
    })

    it('is case-insensitive for the key letter', () => {
        const handler = vi.fn()
        render(<Harness combo="mod+k" handler={handler} />)
        window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'K', ctrlKey: true }),
        )
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it('respects `enabled=false` — handler is never called', () => {
        const handler = vi.fn()
        render(<Harness combo="mod+k" handler={handler} enabled={false} />)
        window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }),
        )
        expect(handler).not.toHaveBeenCalled()
    })

    it('removes listener on unmount', () => {
        const handler = vi.fn()
        const { unmount } = render(<Harness combo="mod+k" handler={handler} />)
        unmount()
        window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }),
        )
        expect(handler).not.toHaveBeenCalled()
    })

    it('requires exact modifier match — shift+ctrl+k not triggering "mod+k"', () => {
        const handler = vi.fn()
        render(<Harness combo="mod+k" handler={handler} />)
        window.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                shiftKey: true,
            }),
        )
        expect(handler).not.toHaveBeenCalled()
    })

    it('supports explicit modifier "ctrl+shift+k"', () => {
        const handler = vi.fn()
        render(<Harness combo="ctrl+shift+k" handler={handler} />)
        window.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                shiftKey: true,
                cancelable: true,
            }),
        )
        expect(handler).toHaveBeenCalledTimes(1)
    })
})
