import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('renders with required aria-label and default type="button"', () => {
    render(<IconButton icon={<svg data-testid="i" />} aria-label="close" />)
    const btn = screen.getByRole('button', { name: 'close' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
    expect(btn).toHaveClass('ds-icon-btn', 'ds-icon-btn--secondary', 'ds-icon-btn--md')
  })

  it('applies variant and size classes', () => {
    const { rerender } = render(
      <IconButton icon={<svg />} aria-label="x" variant="primary" size="sm" />,
    )
    expect(screen.getByRole('button')).toHaveClass(
      'ds-icon-btn--primary',
      'ds-icon-btn--sm',
    )

    rerender(
      <IconButton icon={<svg />} aria-label="x" variant="danger" size="lg" />,
    )
    expect(screen.getByRole('button')).toHaveClass(
      'ds-icon-btn--danger',
      'ds-icon-btn--lg',
    )

    rerender(<IconButton icon={<svg />} aria-label="x" variant="ghost" />)
    expect(screen.getByRole('button')).toHaveClass('ds-icon-btn--ghost')
  })

  it('forwards ref to the underlying button', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<IconButton ref={ref} icon={<svg />} aria-label="x" />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('invokes onClick on user click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IconButton icon={<svg />} aria-label="x" onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('honours `disabled`', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <IconButton icon={<svg />} aria-label="x" disabled onClick={onClick} />,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('passes through custom className without dropping DS classes', () => {
    render(
      <IconButton
        icon={<svg />}
        aria-label="x"
        className="custom-extra"
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('ds-icon-btn', 'custom-extra')
  })
})
