import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

/**
 * ProgressBar — DS v2 primitive (task 7.2).
 *
 * Validates:
 *  - Requirement 1.8 (no hardcoded values — ensured via token-only inline styles).
 *  - Requirement 11.6 / 20.1 (semantic ARIA: role="progressbar",
 *    aria-valuenow/min/max present with correct ranges).
 *  - Requirement 24.2 (label is consumer-supplied and rendered verbatim).
 */

afterEach(() => cleanup())

describe('ProgressBar', () => {
  it('renders a role="progressbar" with aria-valuemin/max/now', () => {
    const { getByRole } = render(<ProgressBar value={0.5} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('aria-valuenow')).toBe('50')
  })

  it('clamps values > 1 to 100%', () => {
    const { getByRole } = render(<ProgressBar value={2.5} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('100')
  })

  it('clamps values < 0 to 0%', () => {
    const { getByRole } = render(<ProgressBar value={-0.3} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
  })

  it('treats NaN as 0%', () => {
    const { getByRole } = render(<ProgressBar value={Number.NaN} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
  })

  it('rounds fractional percentages to the nearest integer', () => {
    const { getByRole } = render(<ProgressBar value={0.123} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('12')
  })

  it('renders a visible label and wires aria-labelledby to it', () => {
    const { getByText, getByRole } = render(
      <ProgressBar value={0.75} label="Загрузка профиля" />,
    )
    const label = getByText('Загрузка профиля')
    const bar = getByRole('progressbar')
    expect(label.id).toBeTruthy()
    expect(bar.getAttribute('aria-labelledby')).toBe(label.id)
  })

  it('does not render a label element when label is omitted', () => {
    const { container } = render(
      <ProgressBar value={0.2} aria-label="prog" />,
    )
    expect(container.querySelector('p')).toBeNull()
  })

  it('sets fill width proportional to clamped value', () => {
    const { container } = render(<ProgressBar value={0.4} />)
    const fill = container.querySelector(
      '[data-ds="progress-bar-fill"]',
    ) as HTMLElement | null
    expect(fill).not.toBeNull()
    expect(fill!.style.width).toBe('40%')
  })

  it('exposes aria-valuetext as a percent string', () => {
    const { getByRole } = render(<ProgressBar value={0.33} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuetext')).toBe('33%')
  })
})
