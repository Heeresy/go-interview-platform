import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import * as React from 'react'
import GlassCard, { GlassCard as NamedGlassCard } from './Card'

/**
 * GlassCard — behavioural contract (Requirements 3.4, 3.5, 10.4, 22.1).
 *
 *   - Always applies the `.glass` class (visual tokens come from globals.css).
 *   - Forwards arbitrary HTMLDivElement props (id, role, data-*, ref, onClick, style).
 *   - Merges user-supplied className after `.glass`, never dropping it.
 *   - Renders <CursorGlow /> slot only when `cursorGlow={true}`.
 *     CursorGlow itself returns null on Viewport_Mobile/Tablet / reduced motion,
 *     so from GlassCard's perspective we only verify the slot is or isn't mounted.
 */

// Default matchMedia: Viewport_Desktop/Wide + reduced motion disabled — makes
// the CursorGlow slot actually render a `[data-cursor-glow]` layer.
function setDesktopMedia(reduced: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches:
        query === '(hover: hover) and (pointer: fine)'
          ? true
          : query === '(prefers-reduced-motion: reduce)'
            ? reduced
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

describe('GlassCard', () => {
  beforeEach(() => {
    setDesktopMedia(false)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a div with the `.glass` class (Req 3.4, 3.5)', () => {
    const { container } = render(<GlassCard>content</GlassCard>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('DIV')
    expect(el.classList.contains('glass')).toBe(true)
    expect(el.textContent).toBe('content')
  })

  it('merges user-supplied className after `.glass`', () => {
    const { container } = render(<GlassCard className="p-4 custom">x</GlassCard>)
    const el = container.firstChild as HTMLElement
    expect(el.classList.contains('glass')).toBe(true)
    expect(el.classList.contains('p-4')).toBe(true)
    expect(el.classList.contains('custom')).toBe(true)
  })

  it('forwards arbitrary HTMLDivElement props', () => {
    const { container } = render(
      <GlassCard id="hero" role="region" aria-label="hero" data-testid="gc">
        content
      </GlassCard>
    )
    const el = container.firstChild as HTMLElement
    expect(el.id).toBe('hero')
    expect(el.getAttribute('role')).toBe('region')
    expect(el.getAttribute('aria-label')).toBe('hero')
    expect(el.getAttribute('data-testid')).toBe('gc')
  })

  it('forwards ref to the underlying div', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<GlassCard ref={ref}>x</GlassCard>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.classList.contains('glass')).toBe(true)
  })

  it('does NOT mount CursorGlow when `cursorGlow` is omitted', () => {
    const { container } = render(<GlassCard>x</GlassCard>)
    expect(container.querySelector('[data-cursor-glow]')).toBeNull()
  })

  it('does NOT mount CursorGlow when `cursorGlow={false}`', () => {
    const { container } = render(<GlassCard cursorGlow={false}>x</GlassCard>)
    expect(container.querySelector('[data-cursor-glow]')).toBeNull()
  })

  it('mounts CursorGlow slot when `cursorGlow={true}` on Viewport_Desktop (Req 10.4)', () => {
    setDesktopMedia(false)
    const { container } = render(<GlassCard cursorGlow>content</GlassCard>)
    const glow = container.querySelector('[data-cursor-glow]')
    expect(glow).not.toBeNull()
    expect(glow).toHaveAttribute('aria-hidden', 'true')
  })

  it('CursorGlow slot self-disables on Viewport_Mobile/Tablet (Req 10.5) even when opt-in', () => {
    // Simulate coarse-pointer viewport — CursorGlow must return null.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches:
          query === '(hover: hover) and (pointer: fine)'
            ? false
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
    const { container } = render(<GlassCard cursorGlow>content</GlassCard>)
    expect(container.querySelector('[data-cursor-glow]')).toBeNull()
    // Content still rendered.
    expect(container.textContent).toBe('content')
  })

  it('exports both named and default exports pointing to the same component', () => {
    expect(NamedGlassCard).toBe(GlassCard)
  })
})
