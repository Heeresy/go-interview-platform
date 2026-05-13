import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { ErrorState } from './ErrorState'
import { t } from '@/lib/i18n'

/**
 * ErrorState — DS v2 primitive (task 7.2).
 *
 * Validates:
 *  - Requirement 20.3 (inline error with short message + retry button).
 *  - Requirement 24.2 (message comes from `t(messageKey)`, no hardcoded
 *    strings in JSX).
 *  - Requirement 22.1 (lives in `src/components/ui/`).
 */

afterEach(() => cleanup())

describe('ErrorState', () => {
  it('renders the localized message for the given TranslationKey', () => {
    const { getByText } = render(
      <ErrorState messageKey="state.error.network" />,
    )
    expect(getByText(t('state.error.network'))).toBeTruthy()
  })

  it('does NOT render the retry button when `retry` is omitted', () => {
    const { queryByRole } = render(
      <ErrorState messageKey="state.error.unknown" />,
    )
    expect(queryByRole('button')).toBeNull()
  })

  it('renders a retry button and fires the callback on click', () => {
    const retry = vi.fn()
    const { getByRole } = render(
      <ErrorState messageKey="state.error.server" retry={retry} />,
    )
    const btn = getByRole('button')
    expect(btn.textContent).toBe(t('common.retry'))
    fireEvent.click(btn)
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('is announced as an assertive alert (role="alert")', () => {
    const { container } = render(
      <ErrorState messageKey="state.error.unknown" />,
    )
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('role')).toBe('alert')
    expect(el.getAttribute('aria-live')).toBe('assertive')
  })

  it('uses semantic --danger tokens for inline styles (no hex literals)', () => {
    const { container } = render(
      <ErrorState messageKey="state.error.unknown" />,
    )
    const el = container.firstChild as HTMLElement
    // Root uses --danger-soft background + --danger border/color.
    expect(el.style.background.includes('--danger')).toBe(true)
    expect(el.style.color.includes('--danger')).toBe(true)
  })
})
