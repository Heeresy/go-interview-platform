import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { ToastProvider, useToast } from './ToastProvider'

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws if useToast is called outside <ToastProvider />', () => {
    // Suppress React's error boundary/console noise for the intended throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useToast())).toThrow(
      /ToastProvider/,
    )
    spy.mockRestore()
  })

  it('toast() queues a toast and returns a non-empty id', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    let id: string = ''
    act(() => {
      id = result.current.toast({ title: 'hello', variant: 'info' })
    })
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('auto-dismisses after default 4000ms', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.toast({ title: 'auto' })
    })
    expect(screen.getByText('auto')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(3999)
    })
    expect(screen.queryByText('auto')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('auto')).not.toBeInTheDocument()
  })

  it('honours custom durationMs', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.toast({ title: 'short', durationMs: 1000 })
    })
    expect(screen.getByText('short')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(screen.queryByText('short')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('short')).not.toBeInTheDocument()
  })

  it('dismiss(id) removes the toast immediately and cancels its timer', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    let id = ''
    act(() => {
      id = result.current.toast({ title: 'x', durationMs: 10_000 })
    })
    expect(screen.getByText('x')).toBeInTheDocument()
    act(() => {
      result.current.dismiss(id)
    })
    expect(screen.queryByText('x')).not.toBeInTheDocument()
    // Advancing past the original duration must not throw / re-render.
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(screen.queryByText('x')).not.toBeInTheDocument()
  })

  it('dismiss on unknown id is a no-op', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.toast({ title: 'a' })
    })
    act(() => {
      result.current.dismiss('does-not-exist')
    })
    expect(screen.getByText('a')).toBeInTheDocument()
  })

  it('close button from <Toast /> calls dismiss and removes the toast', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.toast({ title: 'kill-me', durationMs: 60_000 })
    })
    const closeBtn = await screen.findByRole('button', { name: 'Закрыть' })
    await user.click(closeBtn)
    expect(screen.queryByText('kill-me')).not.toBeInTheDocument()
  })

  it('replaces existing toast when same id is provided, resetting its timer', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.toast({
        id: 'fixed',
        title: 'first',
        durationMs: 4000,
      })
    })
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    // Replace with new payload; timer should reset to full duration.
    act(() => {
      result.current.toast({
        id: 'fixed',
        title: 'second',
        durationMs: 4000,
      })
    })
    expect(screen.queryByText('first')).not.toBeInTheDocument()
    expect(screen.getByText('second')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByText('second')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByText('second')).not.toBeInTheDocument()
  })

  it('durationMs = Infinity keeps the toast until dismiss() is called', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    let id = ''
    act(() => {
      id = result.current.toast({
        title: 'sticky',
        durationMs: Number.POSITIVE_INFINITY,
      })
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('sticky')).toBeInTheDocument()
    act(() => {
      result.current.dismiss(id)
    })
    expect(screen.queryByText('sticky')).not.toBeInTheDocument()
  })

  it('mounts toasts into document.body via portal', () => {
    render(
      <ToastProvider>
        <div data-testid="child">inside</div>
      </ToastProvider>,
    )
    const container = document.querySelector(
      '[data-ds="toast-container"]',
    )
    expect(container).not.toBeNull()
    expect(container?.parentElement).toBe(document.body)
  })
})
