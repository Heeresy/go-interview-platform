import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, fireEvent, render, cleanup } from '@testing-library/react'
import TaskSplitLayout from './TaskSplitLayout'

/**
 * TaskSplitLayout — three-pane resizable layout (Req 15.1, 15.4).
 *
 * Tests cover:
 *  - Desktop horizontal layout rendering with two drag handles.
 *  - Mobile vertical stacking (no handles).
 *  - Resize via pointerdown/pointermove/pointerup with percentage math.
 *  - Minimum width clamp (no pane < 15%).
 *  - Persistence to `localStorage["tasks:splitLayout"]` with try/catch.
 *  - Hydration from a previously stored value.
 */

type MatchMediaListener = (e: MediaQueryListEvent) => void

interface MatchMediaMock extends MediaQueryList {
  trigger: (matches: boolean) => void
}

function installMatchMedia(desktop: boolean): MatchMediaMock {
  let matches = desktop
  const listeners = new Set<MatchMediaListener>()

  const mql: Partial<MatchMediaMock> = {
    get matches() {
      return matches
    },
    media: '(min-width: 1024px)',
    onchange: null,
    addListener: (cb: MatchMediaListener) => listeners.add(cb),
    removeListener: (cb: MatchMediaListener) => listeners.delete(cb),
    addEventListener: (
      _type: 'change',
      cb: MatchMediaListener,
    ) => listeners.add(cb),
    removeEventListener: (
      _type: 'change',
      cb: MatchMediaListener,
    ) => listeners.delete(cb),
    dispatchEvent: () => false,
    trigger: (next: boolean) => {
      matches = next
      const ev = { matches: next, media: '(min-width: 1024px)' } as MediaQueryListEvent
      for (const cb of listeners) cb(ev)
    },
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      if (query === '(min-width: 1024px)') return mql as MatchMediaMock
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }
    },
  })

  return mql as MatchMediaMock
}

function mockContainerWidth(container: HTMLElement, width: number) {
  // TaskSplitLayout measures the wrapper via getBoundingClientRect().
  const wrapper = container.querySelector('[data-ds="task-split-layout"]') as HTMLElement
  wrapper.getBoundingClientRect = () =>
    ({
      width,
      height: 600,
      top: 0,
      left: 0,
      right: width,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

function stubRAF() {
  const spy = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => {
      cb(0)
      return 1 as unknown as number
    })
  return spy
}

beforeEach(() => {
  localStorage.clear()
  installMatchMedia(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('TaskSplitLayout — desktop layout', () => {
  it('renders three panes and two drag handles on desktop', () => {
    const { container } = render(
      <TaskSplitLayout
        description={<div data-testid="desc">D</div>}
        editor={<div data-testid="ed">E</div>}
        execution={<div data-testid="ex">X</div>}
      />,
    )

    const wrapper = container.querySelector('[data-ds="task-split-layout"]')
    expect(wrapper?.getAttribute('data-orientation')).toBe('horizontal')

    expect(container.querySelector('[data-pane="description"]')).not.toBeNull()
    expect(container.querySelector('[data-pane="editor"]')).not.toBeNull()
    expect(container.querySelector('[data-pane="execution"]')).not.toBeNull()

    const handles = container.querySelectorAll('[role="separator"]')
    expect(handles.length).toBe(2)
  })

  it('uses default sizes 30 / 40 / 30 when no storage value is present', () => {
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    const left = container.querySelector('[data-pane="description"]') as HTMLElement
    const middle = container.querySelector('[data-pane="editor"]') as HTMLElement
    const right = container.querySelector('[data-pane="execution"]') as HTMLElement
    expect(left.style.flex).toBe('0 0 30%')
    expect(middle.style.flex).toBe('0 0 40%')
    expect(right.style.flex).toBe('0 0 30%')
  })
})

describe('TaskSplitLayout — mobile layout', () => {
  it('stacks vertically and omits drag handles when viewport < 1024px', () => {
    installMatchMedia(false)
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    const wrapper = container.querySelector('[data-ds="task-split-layout"]')
    expect(wrapper?.getAttribute('data-orientation')).toBe('vertical')
    expect(container.querySelectorAll('[role="separator"]').length).toBe(0)
  })

  it('switches from desktop to vertical when media query changes', () => {
    const mql = installMatchMedia(true)
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    expect(
      container
        .querySelector('[data-ds="task-split-layout"]')
        ?.getAttribute('data-orientation'),
    ).toBe('horizontal')

    act(() => {
      mql.trigger(false)
    })
    expect(
      container
        .querySelector('[data-ds="task-split-layout"]')
        ?.getAttribute('data-orientation'),
    ).toBe('vertical')
  })
})

describe('TaskSplitLayout — resize', () => {
  it('updates pane widths as the left handle is dragged to the right', () => {
    stubRAF()
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    mockContainerWidth(container as HTMLElement, 1000)

    const leftHandle = container.querySelector(
      '[data-handle="left"]',
    ) as HTMLElement

    fireEvent.pointerDown(leftHandle, {
      pointerId: 1,
      clientX: 300,
      button: 0,
      pointerType: 'mouse',
    })
    // Move +100px → +10% on a 1000px container.
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 400,
    })

    const left = container.querySelector('[data-pane="description"]') as HTMLElement
    const middle = container.querySelector('[data-pane="editor"]') as HTMLElement
    const right = container.querySelector('[data-pane="execution"]') as HTMLElement
    expect(left.style.flex).toBe('0 0 40%')
    expect(middle.style.flex).toBe('0 0 30%')
    // Right pane is not touched by the left handle.
    expect(right.style.flex).toBe('0 0 30%')

    fireEvent.pointerUp(window, { pointerId: 1, clientX: 400 })
  })

  it('clamps panes to a 15% minimum width', () => {
    stubRAF()
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    mockContainerWidth(container as HTMLElement, 1000)

    const rightHandle = container.querySelector(
      '[data-handle="right"]',
    ) as HTMLElement
    fireEvent.pointerDown(rightHandle, {
      pointerId: 1,
      clientX: 700,
      button: 0,
      pointerType: 'mouse',
    })
    // Huge negative drag should collapse the middle pane; clamp to 15%.
    fireEvent.pointerMove(window, { pointerId: 1, clientX: -10000 })

    const middle = container.querySelector('[data-pane="editor"]') as HTMLElement
    const right = container.querySelector('[data-pane="execution"]') as HTMLElement
    // middle hits MIN_PCT = 15; right absorbs the remaining delta.
    expect(middle.style.flex).toBe('0 0 15%')
    // right can grow up to 100 - (30 left + 15 middle) = 55%
    expect(right.style.flex).toBe('0 0 55%')

    fireEvent.pointerUp(window, { pointerId: 1, clientX: -10000 })
  })

  it('persists sizes to localStorage on pointerup', () => {
    stubRAF()
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    mockContainerWidth(container as HTMLElement, 1000)

    const leftHandle = container.querySelector(
      '[data-handle="left"]',
    ) as HTMLElement
    fireEvent.pointerDown(leftHandle, {
      pointerId: 1,
      clientX: 300,
      button: 0,
      pointerType: 'mouse',
    })
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 350 })
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 350 })

    const raw = localStorage.getItem('tasks:splitLayout')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as { left: number; middle: number; right: number }
    expect(parsed.left).toBeCloseTo(35, 5)
    expect(parsed.middle).toBeCloseTo(35, 5)
    expect(parsed.right).toBeCloseTo(30, 5)
  })

  it('hydrates from a valid stored value on mount', () => {
    localStorage.setItem(
      'tasks:splitLayout',
      JSON.stringify({ left: 25, middle: 50, right: 25 }),
    )
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    const left = container.querySelector('[data-pane="description"]') as HTMLElement
    const middle = container.querySelector('[data-pane="editor"]') as HTMLElement
    const right = container.querySelector('[data-pane="execution"]') as HTMLElement
    expect(left.style.flex).toBe('0 0 25%')
    expect(middle.style.flex).toBe('0 0 50%')
    expect(right.style.flex).toBe('0 0 25%')
  })

  it('falls back to defaults when the stored value is corrupt JSON', () => {
    localStorage.setItem('tasks:splitLayout', '{not-json')
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    const left = container.querySelector('[data-pane="description"]') as HTMLElement
    expect(left.style.flex).toBe('0 0 30%')
  })

  it('falls back to defaults when stored sizes violate MIN_PCT', () => {
    localStorage.setItem(
      'tasks:splitLayout',
      JSON.stringify({ left: 5, middle: 90, right: 5 }),
    )
    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    const left = container.querySelector('[data-pane="description"]') as HTMLElement
    const middle = container.querySelector('[data-pane="editor"]') as HTMLElement
    expect(left.style.flex).toBe('0 0 30%')
    expect(middle.style.flex).toBe('0 0 40%')
  })

  it('swallows localStorage write errors (try/catch)', () => {
    stubRAF()
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota')
      })

    const { container } = render(
      <TaskSplitLayout description="d" editor="e" execution="x" />,
    )
    mockContainerWidth(container as HTMLElement, 1000)

    const leftHandle = container.querySelector(
      '[data-handle="left"]',
    ) as HTMLElement

    expect(() => {
      fireEvent.pointerDown(leftHandle, {
        pointerId: 1,
        clientX: 300,
        button: 0,
        pointerType: 'mouse',
      })
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 350 })
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 350 })
    }).not.toThrow()

    expect(setItem).toHaveBeenCalled()
  })
})
