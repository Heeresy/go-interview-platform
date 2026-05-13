import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import Drawer from './Drawer'

/**
 * Drawer — shares the focus-trap / portal / Esc / backdrop contract with
 * Dialog, adds `position` prop ('left' | 'right' | 'bottom'). These tests
 * cover the drawer-specific surface (position default, data attributes,
 * portal target) and re-verify the shared contract on one position to
 * keep the suite minimal. Full focus-trap coverage lives in Dialog.test.tsx
 * because both components delegate to the same focusTrap.ts module.
 *
 * Requirements: 11.7, 22.1
 */

afterEach(() => {
  cleanup()
})

function Harness({ position }: { position?: 'left' | 'right' | 'bottom' }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>
        open
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Menu"
        position={position}
      >
        <button data-testid="first">first</button>
        <button data-testid="last">last</button>
      </Drawer>
    </div>
  )
}

describe('Drawer', () => {
  it('renders nothing when open=false', () => {
    render(<Drawer open={false} onClose={() => {}}>x</Drawer>)
    expect(document.querySelector('[data-ds="drawer"]')).toBeNull()
  })

  it('renders to document.body via portal when open=true', () => {
    render(
      <Drawer open onClose={() => {}}>
        <button>x</button>
      </Drawer>,
    )
    const drawer = document.querySelector('[data-ds="drawer"]')
    expect(drawer).not.toBeNull()
    expect(drawer?.parentElement?.parentElement).toBe(document.body)
  })

  it('defaults to position="right"', () => {
    render(
      <Drawer open onClose={() => {}}>
        <button>x</button>
      </Drawer>,
    )
    const drawer = document.querySelector('[data-ds="drawer"]') as HTMLElement
    expect(drawer.getAttribute('data-position')).toBe('right')
  })

  it.each(['left', 'right', 'bottom'] as const)(
    'reflects position="%s" via data-position',
    (position) => {
      render(
        <Drawer open onClose={() => {}} position={position}>
          <button>x</button>
        </Drawer>,
      )
      const drawer = document.querySelector('[data-ds="drawer"]') as HTMLElement
      expect(drawer.getAttribute('data-position')).toBe(position)
    },
  )

  it('uses role="dialog", aria-modal="true", aria-labelledby when title given', () => {
    render(
      <Drawer open onClose={() => {}} title="Side menu">
        <button>x</button>
      </Drawer>,
    )
    const drawer = document.querySelector('[data-ds="drawer"]') as HTMLElement
    expect(drawer.getAttribute('role')).toBe('dialog')
    expect(drawer.getAttribute('aria-modal')).toBe('true')
    const labelId = drawer.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    expect(
      document.getElementById(labelId as string)?.textContent,
    ).toBe('Side menu')
  })

  it('applies the `.glass` class', () => {
    render(
      <Drawer open onClose={() => {}}>
        <button>x</button>
      </Drawer>,
    )
    const drawer = document.querySelector('[data-ds="drawer"]') as HTMLElement
    expect(drawer.classList.contains('glass')).toBe(true)
  })

  it('Esc calls onClose', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <button>x</button>
      </Drawer>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('saves and restores focus across open/close', async () => {
    const { getByTestId } = render(<Harness />)
    const trigger = getByTestId('trigger') as HTMLButtonElement
    trigger.focus()
    fireEvent.click(trigger)
    await act(async () => {
      await new Promise(r => requestAnimationFrame(() => r(null)))
    })
    const first = document.querySelector(
      '[data-testid="first"]',
    ) as HTMLButtonElement
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(document, { key: 'Escape' })
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })
    expect(document.querySelector('[data-ds="drawer"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('Tab from last wraps to first; Shift+Tab from first wraps to last', async () => {
    render(
      <Drawer open onClose={() => {}}>
        <button data-testid="first">first</button>
        <button data-testid="mid">mid</button>
        <button data-testid="last">last</button>
      </Drawer>,
    )
    await act(async () => {
      await new Promise(r => requestAnimationFrame(() => r(null)))
    })
    const first = document.querySelector(
      '[data-testid="first"]',
    ) as HTMLButtonElement
    const last = document.querySelector(
      '[data-testid="last"]',
    ) as HTMLButtonElement

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('backdrop click closes by default', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <button>x</button>
      </Drawer>,
    )
    const backdrop = document.querySelector(
      '[data-ds="drawer-backdrop"]',
    ) as HTMLElement
    fireEvent.mouseDown(backdrop, { target: backdrop })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('backdrop click does NOT close when closeOnBackdropClick=false', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} closeOnBackdropClick={false}>
        <button>x</button>
      </Drawer>,
    )
    const backdrop = document.querySelector(
      '[data-ds="drawer-backdrop"]',
    ) as HTMLElement
    fireEvent.mouseDown(backdrop, { target: backdrop })
    expect(onClose).not.toHaveBeenCalled()
  })
})
