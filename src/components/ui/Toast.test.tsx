import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from './Toast'

describe('Toast', () => {
  it('renders title and description', () => {
    render(
      <Toast
        id="t1"
        variant="info"
        title="Привет"
        description="Подробности"
        onDismiss={() => undefined}
      />,
    )
    expect(screen.getByText('Привет')).toBeInTheDocument()
    expect(screen.getByText('Подробности')).toBeInTheDocument()
  })

  it('uses role="status" for info/success and role="alert" for error/warning', () => {
    const { rerender } = render(
      <Toast id="t" variant="success" title="ok" onDismiss={() => undefined} />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <Toast id="t" variant="info" title="ok" onDismiss={() => undefined} />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <Toast id="t" variant="error" title="bad" onDismiss={() => undefined} />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(
      <Toast
        id="t"
        variant="warning"
        title="warn"
        onDismiss={() => undefined}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('sets aria-live polite for info/success and assertive for error/warning', () => {
    const { rerender } = render(
      <Toast id="t" variant="success" title="a" onDismiss={() => undefined} />,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')

    rerender(
      <Toast id="t" variant="error" title="a" onDismiss={() => undefined} />,
    )
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })

  it('exposes id and variant via data attributes', () => {
    render(
      <Toast
        id="t-42"
        variant="warning"
        title="x"
        onDismiss={() => undefined}
      />,
    )
    const root = screen.getByRole('alert')
    expect(root).toHaveAttribute('data-toast-id', 't-42')
    expect(root).toHaveAttribute('data-toast-variant', 'warning')
  })

  it('close button has localized aria-label and invokes onDismiss with id', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <Toast
        id="toast-x"
        variant="info"
        title="hi"
        onDismiss={onDismiss}
      />,
    )
    const close = screen.getByRole('button', { name: 'Закрыть' })
    await user.click(close)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledWith('toast-x')
  })
})
