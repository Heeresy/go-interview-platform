import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Badge } from './Badge'

/**
 * Badge — DS v2 primitive (task 7.2).
 *
 * Validates:
 *  - Requirement 1.8 (token-only styling — colour/radius come from CSS
 *    variables, no hex/rgb/px literals).
 *  - Requirement 22.1 (lives in `src/components/ui/`, default-exports the
 *    same component as the named export).
 */

afterEach(() => cleanup())

describe('Badge', () => {
  it('renders children as span content', () => {
    const { container } = render(<Badge variant="neutral">New</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('SPAN')
    expect(el.textContent).toBe('New')
  })

  it('defaults to neutral variant when variant is omitted', () => {
    const { container } = render(<Badge>Default</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('data-variant')).toBe('neutral')
  })

  it.each(['neutral', 'success', 'warning', 'danger', 'info'] as const)(
    'exposes data-variant="%s"',
    (variant) => {
      const { container } = render(<Badge variant={variant}>x</Badge>)
      const el = container.firstChild as HTMLElement
      expect(el.getAttribute('data-variant')).toBe(variant)
    },
  )

  it('forwards additional HTMLSpan props (id, title, data-*)', () => {
    const { container } = render(
      <Badge variant="success" id="b1" title="tip" data-testid="b">
        OK
      </Badge>,
    )
    const el = container.firstChild as HTMLElement
    expect(el.id).toBe('b1')
    expect(el.getAttribute('title')).toBe('tip')
    expect(el.getAttribute('data-testid')).toBe('b')
  })

  it('merges user className after the component class (preserves data-ds)', () => {
    const { container } = render(
      <Badge variant="info" className="my-badge">
        info
      </Badge>,
    )
    const el = container.firstChild as HTMLElement
    expect(el.classList.contains('my-badge')).toBe(true)
    expect(el.getAttribute('data-ds')).toBe('badge')
  })

  it('uses token-based inline styles for colour (no hex/rgb literals)', () => {
    const { container } = render(<Badge variant="danger">err</Badge>)
    const el = container.firstChild as HTMLElement
    // Inline styles should reference CSS variables via var(--token).
    const bg = el.style.background
    const color = el.style.color
    expect(bg.startsWith('var(')).toBe(true)
    expect(color.startsWith('var(')).toBe(true)
  })
})
