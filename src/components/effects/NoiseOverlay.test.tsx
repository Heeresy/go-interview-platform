import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NoiseOverlay } from './NoiseOverlay'

describe('NoiseOverlay', () => {
  it('renders a fixed, full-viewport, non-interactive, a11y-hidden overlay', () => {
    const { getByTestId } = render(<NoiseOverlay />)
    const el = getByTestId('noise-overlay') as HTMLElement

    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.position).toBe('fixed')
    expect(el.style.pointerEvents).toBe('none')
    // Full-viewport cover via `inset: 0` shorthand.
    expect(el.style.inset).toBe('0px')
  })

  it('uses the --noise-opacity token with 0.05 fallback (Requirement 3.3)', () => {
    const { getByTestId } = render(<NoiseOverlay />)
    const el = getByTestId('noise-overlay') as HTMLElement

    expect(el.style.opacity).toContain('var(--noise-opacity')
    expect(el.style.opacity).toContain('0.05')
  })

  it('layers exactly one step above --z-bg (task 8.1 composition)', () => {
    const { getByTestId } = render(<NoiseOverlay />)
    const el = getByTestId('noise-overlay') as HTMLElement

    expect(el.style.zIndex).toBe('calc(var(--z-bg) + 1)')
  })

  it('uses an inline SVG data URL for the noise texture (no network, no JS)', () => {
    const { getByTestId } = render(<NoiseOverlay />)
    const el = getByTestId('noise-overlay') as HTMLElement

    expect(el.style.backgroundImage).toContain('data:image/svg+xml')
    expect(el.style.backgroundImage).toContain('feTurbulence')
    // baseFrequency + numOctaves per task 5.3 spec
    expect(el.style.backgroundImage).toContain('baseFrequency=')
    expect(el.style.backgroundImage).toContain('numOctaves=')
  })
})
