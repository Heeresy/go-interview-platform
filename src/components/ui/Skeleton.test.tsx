import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Skeleton } from './Skeleton'

/**
 * Skeleton — DS v2 primitive (task 7.2).
 *
 * Validates:
 *  - Requirement 20.1 (loading placeholder with role="status"
 *    aria-busy=true so screen readers announce loading).
 *  - Requirement 22.1 (lives in `src/components/ui/`, supports
 *    variants `card | line | avatar`).
 *  - Requirement 1.8 (token-only inline styles — no hex/rgb/px literals).
 */

afterEach(() => cleanup())

describe('Skeleton', () => {
  it('renders role="status" with aria-busy="true" for AT', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('role')).toBe('status')
    expect(el.getAttribute('aria-busy')).toBe('true')
  })

  it('defaults to variant="line"', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('data-variant')).toBe('line')
  })

  it.each(['card', 'line', 'avatar'] as const)(
    'exposes data-variant="%s"',
    (variant) => {
      const { container } = render(<Skeleton variant={variant} />)
      const el = container.firstChild as HTMLElement
      expect(el.getAttribute('data-variant')).toBe(variant)
    },
  )

  it('passes label to aria-label when provided', () => {
    const { container } = render(<Skeleton label="Загружаем" />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('aria-label')).toBe('Загружаем')
  })

  it('uses token-based inline styles (no hex/rgb literals)', () => {
    const { container } = render(<Skeleton variant="card" />)
    const el = container.firstChild as HTMLElement
    // Width/height/borderRadius are pulled from CSS variables.
    expect(el.style.height.startsWith('var(')).toBe(true)
    expect(el.style.borderRadius.startsWith('var(')).toBe(true)
  })
})
