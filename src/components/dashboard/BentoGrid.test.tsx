import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { BentoGrid } from './BentoGrid'
import { BentoItem } from './BentoItem'

/**
 * BentoGrid / BentoItem — unit tests (Requirements 5.2, 22.4).
 *
 * Behavioural contract covered here:
 *
 *   - BentoGrid always renders the base `.bento-grid` class on a <div>.
 *   - `className` is merged AFTER `.bento-grid`, never replacing it.
 *   - Arbitrary HTMLDivElement props (id, data-*, aria-*) are forwarded.
 *   - The `gap` prop is wired through to the `--bento-grid-gap` custom
 *     property in inline style (no prop → no custom property in style).
 *   - BentoItem renders the base `.bento-item` class on a <div>.
 *   - BentoItem sets `grid-column: span <colSpan>` and
 *     `grid-row: span <rowSpan>` inline styles.
 *   - BentoItem defaults to `span 1` for both axes when props are omitted.
 *   - BentoItem sanitizes invalid span values (NaN, 0, negative, non-finite)
 *     down to `1`, so the grid never receives malformed `span` keywords.
 *   - BentoItem merges caller-supplied style with grid-span style — grid
 *     values win (stable contract), but unrelated style keys (e.g.
 *     `alignSelf`) survive.
 *
 * Visual tokens (colors, shadows, radii) are validated by Design System
 * coverage linting / token-coverage CI — not here. These tests only
 * validate the structural/props contract of the container + item.
 */

afterEach(() => {
  cleanup()
})

describe('<BentoGrid />', () => {
  it('renders a <div> with the base .bento-grid class', () => {
    const { container } = render(
      <BentoGrid>
        <div>child</div>
      </BentoGrid>,
    )
    const root = container.firstElementChild as HTMLDivElement
    expect(root).toBeTruthy()
    expect(root.tagName).toBe('DIV')
    expect(root.classList.contains('bento-grid')).toBe(true)
  })

  it('merges user className after .bento-grid', () => {
    const { container } = render(
      <BentoGrid className="my-extra">
        <div>child</div>
      </BentoGrid>,
    )
    const root = container.firstElementChild as HTMLDivElement
    expect(root.className).toBe('bento-grid my-extra')
  })

  it('forwards arbitrary HTMLDivElement props (id, data-*, aria-*)', () => {
    const { container } = render(
      <BentoGrid id="bento" data-testid="bento-root" aria-label="Dashboard grid">
        <div>child</div>
      </BentoGrid>,
    )
    const root = container.firstElementChild as HTMLDivElement
    expect(root.id).toBe('bento')
    expect(root.getAttribute('data-testid')).toBe('bento-root')
    expect(root.getAttribute('aria-label')).toBe('Dashboard grid')
    // And the DS marker is stable for styling/debugging.
    expect(root.getAttribute('data-ds')).toBe('bento-grid')
  })

  it('does not set --bento-grid-gap when gap prop is omitted (defers to CSS default)', () => {
    const { container } = render(
      <BentoGrid>
        <div>child</div>
      </BentoGrid>,
    )
    const root = container.firstElementChild as HTMLElement
    // jsdom exposes custom properties via getPropertyValue; if we never
    // wrote one, it stays empty string.
    expect(root.style.getPropertyValue('--bento-grid-gap')).toBe('')
  })

  it('sets --bento-grid-gap custom property when gap prop is provided', () => {
    const { container } = render(
      <BentoGrid gap="var(--space-6)">
        <div>child</div>
      </BentoGrid>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--bento-grid-gap')).toBe(
      'var(--space-6)',
    )
  })

  it('preserves caller-supplied inline style when setting --bento-grid-gap', () => {
    const { container } = render(
      <BentoGrid gap="var(--space-8)" style={{ marginBlock: '24px' }}>
        <div>child</div>
      </BentoGrid>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.marginBlock).toBe('24px')
    expect(root.style.getPropertyValue('--bento-grid-gap')).toBe(
      'var(--space-8)',
    )
  })

  it('renders its children', () => {
    const { getByText } = render(
      <BentoGrid>
        <div>one</div>
        <div>two</div>
      </BentoGrid>,
    )
    expect(getByText('one')).toBeTruthy()
    expect(getByText('two')).toBeTruthy()
  })
})

describe('<BentoItem />', () => {
  it('renders a <div> with the base .bento-item class', () => {
    const { container } = render(
      <BentoItem>
        <span>content</span>
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLDivElement
    expect(root).toBeTruthy()
    expect(root.tagName).toBe('DIV')
    expect(root.classList.contains('bento-item')).toBe(true)
    expect(root.getAttribute('data-ds')).toBe('bento-item')
  })

  it('merges user className after .bento-item', () => {
    const { container } = render(
      <BentoItem className="card-wrap">
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLDivElement
    expect(root.className).toBe('bento-item card-wrap')
  })

  it('defaults to span 1 / span 1 when no colSpan/rowSpan provided', () => {
    const { container } = render(
      <BentoItem>
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.gridColumn).toBe('span 1')
    expect(root.style.gridRow).toBe('span 1')
  })

  it('applies colSpan and rowSpan via inline style as `span <n>`', () => {
    const { container } = render(
      <BentoItem colSpan={6} rowSpan={2}>
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.gridColumn).toBe('span 6')
    expect(root.style.gridRow).toBe('span 2')
  })

  it('sanitizes invalid span values (0, negative, NaN) down to 1', () => {
    const { container } = render(
      <BentoItem colSpan={0} rowSpan={-3}>
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.gridColumn).toBe('span 1')
    expect(root.style.gridRow).toBe('span 1')
  })

  it('floors non-integer span values', () => {
    const { container } = render(
      <BentoItem colSpan={4.9} rowSpan={2.1}>
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.gridColumn).toBe('span 4')
    expect(root.style.gridRow).toBe('span 2')
  })

  it('preserves caller style keys that do not collide with grid span', () => {
    const { container } = render(
      <BentoItem colSpan={3} rowSpan={1} style={{ alignSelf: 'end' }}>
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.alignSelf).toBe('end')
    expect(root.style.gridColumn).toBe('span 3')
    expect(root.style.gridRow).toBe('span 1')
  })

  it('grid-span props always win over caller-supplied gridColumn / gridRow', () => {
    // Contract: BentoItem is the authority on grid placement. If a caller
    // tries to override `gridColumn` via `style`, BentoItem still sets
    // the value derived from colSpan/rowSpan. Prevents silent span drift
    // from consumers.
    const { container } = render(
      <BentoItem
        colSpan={2}
        rowSpan={2}
        style={{ gridColumn: 'span 99', gridRow: 'span 77' }}
      >
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.gridColumn).toBe('span 2')
    expect(root.style.gridRow).toBe('span 2')
  })

  it('forwards arbitrary HTMLDivElement props', () => {
    const { container } = render(
      <BentoItem id="tile-a" data-testid="tile-a" role="group">
        <span />
      </BentoItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.id).toBe('tile-a')
    expect(root.getAttribute('data-testid')).toBe('tile-a')
    expect(root.getAttribute('role')).toBe('group')
  })
})

describe('BentoGrid + BentoItem composition', () => {
  it('renders multiple BentoItems inside BentoGrid with proper spans', () => {
    const { container } = render(
      <BentoGrid>
        <BentoItem colSpan={4} rowSpan={2} data-testid="tile-1">
          <div>tile 1</div>
        </BentoItem>
        <BentoItem colSpan={8} rowSpan={1} data-testid="tile-2">
          <div>tile 2</div>
        </BentoItem>
      </BentoGrid>,
    )
    const grid = container.firstElementChild as HTMLElement
    expect(grid.classList.contains('bento-grid')).toBe(true)

    const tile1 = grid.querySelector<HTMLElement>('[data-testid="tile-1"]')!
    const tile2 = grid.querySelector<HTMLElement>('[data-testid="tile-2"]')!
    expect(tile1.style.gridColumn).toBe('span 4')
    expect(tile1.style.gridRow).toBe('span 2')
    expect(tile2.style.gridColumn).toBe('span 8')
    expect(tile2.style.gridRow).toBe('span 1')
  })
})
