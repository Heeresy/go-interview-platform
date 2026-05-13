import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import CursorGlow from './CursorGlow'

/**
 * Behaviour matrix for CursorGlow (Requirements 10.4, 10.5, 10.9).
 *
 * The matchMedia mock must be configurable per-test so we can simulate
 * Viewport_Desktop/Wide (`hover: hover` + `pointer: fine`) vs
 * Viewport_Mobile/Tablet (`hover: none` or `pointer: coarse`) and toggle
 * the Reduced_Motion_Flag independently.
 */

interface MediaState {
  hoverCapable: boolean
  reduced: boolean
}

function setMedia(state: MediaState) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches:
        query === '(hover: hover) and (pointer: fine)'
          ? state.hoverCapable
          : query === '(prefers-reduced-motion: reduce)'
            ? state.reduced
            : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('CursorGlow', () => {
  beforeEach(() => {
    // Default: desktop-capable, motion allowed
    setMedia({ hoverCapable: true, reduced: false })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a cursor-following glow layer on Viewport_Desktop/Wide (Req 10.4)', () => {
    setMedia({ hoverCapable: true, reduced: false })
    const { container } = render(<CursorGlow />)
    const glow = container.querySelector('[data-cursor-glow]')
    expect(glow).not.toBeNull()
    expect(glow).toHaveAttribute('aria-hidden', 'true')
  })

  it('returns null on Viewport_Mobile/Tablet — no touch analog is substituted (Req 10.5)', () => {
    setMedia({ hoverCapable: false, reduced: false })
    const { container } = render(<CursorGlow />)
    // No glow layer rendered.
    expect(container.querySelector('[data-cursor-glow]')).toBeNull()
    // And no touch-style ripple/press analog either — the component itself
    // must not emit ANY markup on coarse-pointer viewports.
    expect(container.firstChild).toBeNull()
  })

  it('returns null when `prefers-reduced-motion: reduce` is active (Req 10.9)', () => {
    setMedia({ hoverCapable: true, reduced: true })
    const { container } = render(<CursorGlow />)
    expect(container.querySelector('[data-cursor-glow]')).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('returns null when both coarse pointer and reduced motion apply', () => {
    setMedia({ hoverCapable: false, reduced: true })
    const { container } = render(<CursorGlow />)
    expect(container.firstChild).toBeNull()
  })

  it('throttles pointer updates through requestAnimationFrame', async () => {
    setMedia({ hoverCapable: true, reduced: false })

    // Collect rAF callbacks so we can drive them manually and verify that
    // many pointer events coalesce into exactly one frame update.
    const pending: FrameRequestCallback[] = []
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        pending.push(cb)
        return pending.length
      })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const Wrapper = () => (
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <CursorGlow />
      </div>
    )

    const { container } = render(<Wrapper />)
    const parent = container.firstChild as HTMLElement
    // Stub bounding rect so clientX/Y math is deterministic.
    parent.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 200,
        bottom: 200,
        width: 200,
        height: 200,
        toJSON: () => ({}),
      }) as DOMRect

    // Fire a burst of pointermove events — all within the same frame.
    for (let i = 0; i < 10; i++) {
      const ev = new PointerEvent('pointermove', {
        clientX: 10 + i,
        clientY: 20 + i,
        pointerType: 'mouse',
        bubbles: true,
      })
      parent.dispatchEvent(ev)
    }

    // Exactly one rAF scheduled despite 10 pointer events (coalesced).
    expect(rafSpy).toHaveBeenCalledTimes(1)
    expect(pending).toHaveLength(1)

    // Flush the frame — the glow should now reflect the last position.
    pending[0]?.(performance.now())

    const glow = container.querySelector('[data-cursor-glow]') as HTMLElement
    expect(glow.style.getPropertyValue('--cursor-glow-x')).toBe('19px')
    expect(glow.style.getPropertyValue('--cursor-glow-y')).toBe('29px')

    rafSpy.mockRestore()
  })
})
