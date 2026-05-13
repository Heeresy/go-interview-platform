import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import Dialog from './Dialog'

/**
 * Dialog — behavioural contract (Requirements 11.7, 22.1).
 *
 *   - Rendered in a portal to document.body.
 *   - On open: saves document.activeElement, focuses first focusable inside.
 *   - On close: restores saved focus.
 *   - Esc closes (calls onClose).
 *   - Tab / Shift+Tab cycles focus inside.
 *   - Backdrop click closes when `closeOnBackdropClick` is not false.
 *   - role="dialog", aria-modal="true", aria-labelledby when title given.
 *   - Root is `.glass` card.
 */

afterEach(() => {
  cleanup()
})

function Harness({
  closeOnBackdropClick,
  title,
}: {
  closeOnBackdropClick?: boolean
  title?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
        open
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeOnBackdropClick={closeOnBackdropClick}
      >
        <button type="button" data-testid="item-a">
          A
        </button>
        <button type="button" data-testid="item-b">
          B
        </button>
        <button type="button" data-testid="item-c">
          C
        </button>
      </Dialog>
    </div>
  )
}

describe('Dialog', () => {
  it('renders nothing when open=false', () => {
    render(<Dialog open={false} onClose={() => {}}>body</Dialog>)
    expect(document.querySelector('[data-ds="dialog"]')).toBeNull()
  })

  it('renders to document.body via portal when open=true', async () => {
    render(
      <Dialog open onClose={() => {}} title="T">
        <button data-testid="x">x</button>
      </Dialog>,
    )
    const dialog = document.querySelector('[data-ds="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.parentElement?.parentElement).toBe(document.body)
  })

  it('uses role="dialog", aria-modal="true", aria-labelledby when title is given', () => {
    render(
      <Dialog open onClose={() => {}} title="Delete item">
        <button>ok</button>
      </Dialog>,
    )
    const dialog = document.querySelector('[data-ds="dialog"]') as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const label = document.getElementById(labelId as string)
    expect(label?.textContent).toBe('Delete item')
  })

  it('omits aria-labelledby when title is not given', () => {
    render(
      <Dialog open onClose={() => {}}>
        <button>ok</button>
      </Dialog>,
    )
    const dialog = document.querySelector('[data-ds="dialog"]') as HTMLElement
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
  })

  it('applies the `.glass` class to the container', () => {
    render(
      <Dialog open onClose={() => {}}>
        <button>ok</button>
      </Dialog>,
    )
    const dialog = document.querySelector('[data-ds="dialog"]') as HTMLElement
    expect(dialog.classList.contains('glass')).toBe(true)
  })

  it('saves previously-focused element on open and restores it on close', async () => {
    const { getByTestId } = render(<Harness />)
    const trigger = getByTestId('trigger') as HTMLButtonElement
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    // Let requestAnimationFrame fire (JSDOM: usually sync microtask).
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
      await new Promise(r => requestAnimationFrame(() => r(null)))
    })
    const dialog = document.querySelector('[data-ds="dialog"]')
    expect(dialog).not.toBeNull()
    // first focusable = item-a
    const itemA = document.querySelector(
      '[data-testid="item-a"]',
    ) as HTMLButtonElement
    expect(document.activeElement).toBe(itemA)

    // close via Esc
    fireEvent.keyDown(document, { key: 'Escape' })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })
    expect(document.querySelector('[data-ds="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('Esc calls onClose', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="t">
        <button data-testid="x">x</button>
      </Dialog>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Tab from last focusable wraps to first', async () => {
    render(
      <Dialog open onClose={() => {}}>
        <button data-testid="a">A</button>
        <button data-testid="b">B</button>
        <button data-testid="c">C</button>
      </Dialog>,
    )
    await act(async () => {
      await new Promise(r => requestAnimationFrame(() => r(null)))
    })
    const a = document.querySelector('[data-testid="a"]') as HTMLButtonElement
    const c = document.querySelector('[data-testid="c"]') as HTMLButtonElement
    c.focus()
    expect(document.activeElement).toBe(c)
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(a)
  })

  it('Shift+Tab from first focusable wraps to last', async () => {
    render(
      <Dialog open onClose={() => {}}>
        <button data-testid="a">A</button>
        <button data-testid="b">B</button>
        <button data-testid="c">C</button>
      </Dialog>,
    )
    await act(async () => {
      await new Promise(r => requestAnimationFrame(() => r(null)))
    })
    const a = document.querySelector('[data-testid="a"]') as HTMLButtonElement
    const c = document.querySelector('[data-testid="c"]') as HTMLButtonElement
    a.focus()
    expect(document.activeElement).toBe(a)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(c)
  })

  it('backdrop click closes dialog by default', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose}>
        <button>x</button>
      </Dialog>,
    )
    const backdrop = document.querySelector(
      '[data-ds="dialog-backdrop"]',
    ) as HTMLElement
    fireEvent.mouseDown(backdrop, { target: backdrop })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('backdrop click does NOT close when closeOnBackdropClick=false', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} closeOnBackdropClick={false}>
        <button>x</button>
      </Dialog>,
    )
    const backdrop = document.querySelector(
      '[data-ds="dialog-backdrop"]',
    ) as HTMLElement
    fireEvent.mouseDown(backdrop, { target: backdrop })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('click inside card does NOT close, even when backdrop-close is enabled', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose}>
        <button data-testid="inside">x</button>
      </Dialog>,
    )
    const inside = screen.getByTestId('inside')
    fireEvent.mouseDown(inside)
    expect(onClose).not.toHaveBeenCalled()
  })
})
