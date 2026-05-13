import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

import { t } from '@/lib/i18n'

/**
 * Behavioural contract tests for `<TrainerLevelUp />` (task 19.2).
 *
 * Validates Requirements 12.8, 16.3, 16.4, 10.8, 10.9:
 *   - Dynamic import of `confetti-js` (Req 12.8): module is loaded on-demand
 *     and its constructor is invoked when the overlay opens on the animated
 *     path (mock below captures the call and verifies init + teardown).
 *   - Animation budget ≤ 3 seconds (Req 16.3): the `onClose` callback fires
 *     at 2500ms of fake-timer advance and not before.
 *   - Reduced-motion substitution (Req 10.8, 10.9, 16.4): when
 *     `useReducedMotion()` returns `true`, confetti is never requested and
 *     the canvas layer is not mounted — only the static GlassCard remains.
 *   - Title + level rendering via `t('trainer.levelUp.title')` (Req 24.2).
 */

// --- Confetti mock ----------------------------------------------------------
// `confetti-js` ships a default-exported constructor. The mock records each
// construction and its `render`/`clear` lifecycle so assertions can verify
// the dynamic-import wiring without touching a real canvas context.
const confettiCalls: Array<{
  rendered: boolean
  cleared: boolean
  target: unknown
}> = []

vi.mock('confetti-js', () => {
  class MockConfettiGenerator {
    private state: { rendered: boolean; cleared: boolean; target: unknown }
    constructor(settings: { target: unknown }) {
      this.state = { rendered: false, cleared: false, target: settings.target }
      confettiCalls.push(this.state)
    }
    render() {
      this.state.rendered = true
    }
    clear() {
      this.state.cleared = true
    }
  }
  return { default: MockConfettiGenerator }
})

// --- Reduced-motion hook mock ----------------------------------------------
// Swapping the implementation per test lets us exercise both the animated
// and the static (Req 16.4) paths without juggling matchMedia mocks.
let reducedMotionValue = false
vi.mock('@/lib/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotionValue,
}))

import TrainerLevelUp from './TrainerLevelUp'

beforeEach(() => {
  confettiCalls.length = 0
  reducedMotionValue = false
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

/**
 * Flush enough microtasks for a dynamic `import()` of a mocked module to
 * resolve and for its subsequent `.then()` to run. We wait for Vitest's
 * `dynamicImportSettled()` (which drains the dynamic-import queue), then
 * yield a macro-task so the `.then(mod => …)` continuation that invokes
 * the mocked constructor also gets a chance to execute.
 */
async function flushDynamicImport() {
  // Settle any pending dynamic import() calls queued by the render phase.
  await vi.dynamicImportSettled()
  // Extra macro-task boundaries: the resolved module still has to flow
  // through the `.then()` chain inside the component effect.
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  await Promise.resolve()
}

describe('TrainerLevelUp', () => {
  it('renders nothing when `show` is false', () => {
    render(<TrainerLevelUp show={false} level={3} onClose={() => {}} />)
    expect(
      document.querySelector('[data-ds="trainer-level-up"]'),
    ).toBeNull()
  })

  it('portals the overlay to document.body and shows title + level', () => {
    render(<TrainerLevelUp show level={7} onClose={() => {}} />)
    const overlay = document.querySelector(
      '[data-ds="trainer-level-up"]',
    ) as HTMLElement
    expect(overlay).not.toBeNull()
    // Portal target: parent chain ends at <body>.
    expect(overlay.parentElement).toBe(document.body)
    // Title rendered from i18n dictionary (Req 24.2).
    expect(overlay.textContent).toContain(t('trainer.levelUp.title'))
    expect(overlay.textContent).toContain('7')
  })

  it('exposes role=status and aria-labelledby for screen readers', () => {
    render(<TrainerLevelUp show level={2} onClose={() => {}} />)
    const card = document.querySelector(
      '[data-testid="trainer-level-up-card"]',
    ) as HTMLElement
    expect(card.getAttribute('role')).toBe('status')
    expect(card.getAttribute('aria-live')).toBe('polite')
    const labelId = card.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const label = document.getElementById(labelId as string)
    expect(label?.textContent).toBe(t('trainer.levelUp.title'))
  })

  it('auto-closes after 2500ms (Req 16.3 — within 3s budget)', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<TrainerLevelUp show level={4} onClose={onClose} />)

    // Timer not yet elapsed.
    act(() => {
      vi.advanceTimersByTime(2499)
    })
    expect(onClose).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT exceed 3s — onClose has fired by t=3000ms', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<TrainerLevelUp show level={4} onClose={onClose} />)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cancels the auto-close timer when `show` flips to false', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { rerender } = render(
      <TrainerLevelUp show level={4} onClose={onClose} />,
    )
    rerender(<TrainerLevelUp show={false} level={4} onClose={onClose} />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('dynamically imports confetti-js and renders into the canvas (animated path)', async () => {
    render(<TrainerLevelUp show level={5} onClose={() => {}} />)

    await act(async () => {
      await flushDynamicImport()
    })

    expect(confettiCalls.length).toBe(1)
    expect(confettiCalls[0].rendered).toBe(true)

    const canvas = document.querySelector(
      '[data-testid="trainer-level-up-canvas"]',
    ) as HTMLCanvasElement
    expect(canvas).not.toBeNull()
    expect(confettiCalls[0].target).toBe(canvas)
  })

  it('tears down the confetti instance on unmount (clear() is called)', async () => {
    const { unmount } = render(
      <TrainerLevelUp show level={5} onClose={() => {}} />,
    )
    await act(async () => {
      await flushDynamicImport()
    })
    expect(confettiCalls[0].cleared).toBe(false)

    unmount()
    expect(confettiCalls[0].cleared).toBe(true)
  })

  it('omits confetti and canvas entirely when reduced motion is enabled (Req 16.4)', async () => {
    reducedMotionValue = true
    render(<TrainerLevelUp show level={9} onClose={() => {}} />)

    // Give any hypothetical dynamic-import microtasks a chance to flush;
    // nothing should have been scheduled on the reduced-motion path.
    await act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve()
    })

    expect(confettiCalls.length).toBe(0)
    expect(
      document.querySelector('[data-testid="trainer-level-up-canvas"]'),
    ).toBeNull()

    const overlay = document.querySelector(
      '[data-ds="trainer-level-up"]',
    ) as HTMLElement
    expect(overlay.getAttribute('data-reduced-motion')).toBe('true')
    // Static card still announces the level change.
    expect(overlay.textContent).toContain(t('trainer.levelUp.title'))
    expect(overlay.textContent).toContain('9')
  })

  it('still auto-closes after 2500ms on the reduced-motion path', () => {
    vi.useFakeTimers()
    reducedMotionValue = true
    const onClose = vi.fn()
    render(<TrainerLevelUp show level={9} onClose={onClose} />)
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
