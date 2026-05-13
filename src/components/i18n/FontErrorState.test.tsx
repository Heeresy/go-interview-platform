import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FontErrorState } from './FontErrorState'
import { t } from '@/lib/i18n'

describe('FontErrorState', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders as a full-screen alertdialog blocking the page (Req 24.4)', () => {
    render(<FontErrorState />)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const style = (dialog as HTMLElement).style
    expect(style.position).toBe('fixed')
    expect(style.inset).toBe('0px')
  })

  it('shows the localized failure message and retry label', () => {
    render(<FontErrorState />)
    expect(
      screen.getByText(t('font.multiLangRenderFailed')),
    ).toBeInTheDocument()
    const button = screen.getByRole('button', { name: t('common.tryAgain') })
    expect(button).toBeInTheDocument()
  })

  it('falls back to the `var(--bg-500)` placeholder when no background slot is provided', () => {
    render(<FontErrorState />)
    const placeholder = screen.getByTestId('font-error-bg-placeholder')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder.style.backgroundColor).toBe('var(--bg-500)')
    expect(placeholder.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders a caller-supplied backgroundSlot instead of the placeholder', () => {
    render(
      <FontErrorState
        backgroundSlot={<div data-testid="custom-aurora">aurora</div>}
      />,
    )
    expect(screen.getByTestId('custom-aurora')).toBeInTheDocument()
    expect(
      screen.queryByTestId('font-error-bg-placeholder'),
    ).not.toBeInTheDocument()
  })

  it('invokes onRetry when the retry button is activated', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<FontErrorState onRetry={onRetry} />)
    await user.click(screen.getByTestId('font-error-retry'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('auto-focuses the retry button on mount for keyboard recovery', () => {
    render(<FontErrorState />)
    const button = screen.getByTestId('font-error-retry')
    expect(document.activeElement).toBe(button)
  })
})
