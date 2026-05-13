import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import * as React from 'react'
import GlassPanel, { GlassPanel as NamedGlassPanel } from './Panel'

/**
 * GlassPanel — same behavioural contract as GlassCard (Requirements 3.4,
 * 3.5, 10.4, 22.1). Kept as a separate test file to document the distinct
 * semantic role (container / section wrapper) while validating the shared
 * CursorGlow slot contract.
 */

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

describe('GlassPanel', () => {
  beforeEach(() => {
    setDesktopMedia(false)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a div with the `.glass` class (Req 3.4, 3.5)', () => {
    const { container } = render(<GlassPanel>content</GlassPanel>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('DIV')
    expect(el.classList.contains('glass')).toBe(true)
  })

  it('merges user-supplied className after `.glass`', () => {
    const { container } = render(<GlassPanel className="p-6">x</GlassPanel>)
    const el = container.firstChild as HTMLElement
    expect(el.classList.contains('glass')).toBe(true)
    expect(el.classList.contains('p-6')).toBe(true)
  })

  it('forwards arbitrary HTMLDivElement props', () => {
    const { container } = render(
      <GlassPanel id="sidebar" role="complementary" data-testid="gp">
        content
      </GlassPanel>
    )
    const el = container.firstChild as HTMLElement
    expect(el.id).toBe('sidebar')
    expect(el.getAttribute('role')).toBe('complementary')
    expect(el.getAttribute('data-testid')).toBe('gp')
  })

  it('forwards ref to the underlying div', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<GlassPanel ref={ref}>x</GlassPanel>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.classList.contains('glass')).toBe(true)
  })

  it('does NOT mount CursorGlow by default', () => {
    const { container } = render(<GlassPanel>x</GlassPanel>)
    expect(container.querySelector('[data-cursor-glow]')).toBeNull()
  })

  it('mounts CursorGlow slot when `cursorGlow={true}` on Viewport_Desktop (Req 10.4)', () => {
    setDesktopMedia(false)
    const { container } = render(<GlassPanel cursorGlow>content</GlassPanel>)
    const glow = container.querySelector('[data-cursor-glow]')
    expect(glow).not.toBeNull()
  })

  it('CursorGlow slot self-disables when `prefers-reduced-motion: reduce` (Req 10.9)', () => {
    setDesktopMedia(true)
    const { container } = render(<GlassPanel cursorGlow>content</GlassPanel>)
    expect(container.querySelector('[data-cursor-glow]')).toBeNull()
    expect(container.textContent).toBe('content')
  })

  it('exports both named and default exports pointing to the same component', () => {
    expect(NamedGlassPanel).toBe(GlassPanel)
  })
})
