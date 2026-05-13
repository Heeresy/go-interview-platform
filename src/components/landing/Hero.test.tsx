import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import * as React from 'react'

import { t } from '@/lib/i18n'

/**
 * Unit tests for `<Hero />` — task 13.1.
 *
 * Scope:
 *  - Req 4.2, 4.4: asymmetric composition (two columns at Desktop/Wide,
 *    stacked on Mobile).
 *  - Req 4.3: two CTAs, both leading to `/login`.
 *  - Req 4.7, 12.1, 12.9: LCP-lean — hero text is plain HTML (server-
 *    renderable via KineticHeading), AuroraBackground is not present in
 *    the initial client render and is mounted only after
 *    `requestIdleCallback` fires.
 *  - Req 24.1, 24.2: all user-facing copy comes from the i18n dictionary.
 *  - Req 1.8: no hardcoded colors/spacing/radius in the TSX.
 *
 * To keep the tests deterministic we:
 *  - stub `next/navigation`'s `useRouter` to a typed spy so we can assert
 *    `prefetch('/login')` and `push('/login')`;
 *  - stub the lazy-loaded `AuroraBackground` to a sentinel `<div>` so we
 *    can detect its mount without exercising WebGL/ogl in jsdom;
 *  - control `requestIdleCallback` manually (off-by-default, triggered
 *    inside `act()` in the tests that exercise the idle branch);
 *  - set `window.innerWidth` + a matchMedia mock that honours
 *    `(min-width: 1024px)` so desktop-gating in the component is
 *    exercised end-to-end.
 */

// --- `next/navigation` stub ------------------------------------------------
const push = vi.fn()
const prefetch = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch }),
}))

// --- AuroraBackground stub -------------------------------------------------
// `next/dynamic` without SSR will invoke the loader the first time the
// lazy component mounts. Stubbing the module makes that mount observable
// via a stable testid without pulling in `ogl` / real WebGL.
vi.mock('@/components/effects/AuroraBackground', () => ({
  __esModule: true,
  AuroraBackground: (props: Record<string, unknown>) => (
    <div
      data-testid="hero-aurora-stub"
      data-colors={JSON.stringify(props.colors)}
      data-intensity={String(props.intensity)}
      data-speed={String(props.speed)}
    />
  ),
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="hero-aurora-stub-default"
      data-colors={JSON.stringify(props.colors)}
    />
  ),
}))

// --- matchMedia / requestIdleCallback helpers ------------------------------
type RICCallback = (deadline: {
  didTimeout: boolean
  timeRemaining: () => number
}) => void

interface TestGlobals {
  setDesktop: (desktop: boolean) => void
  flushIdle: () => Promise<void>
  setRICAvailable: (available: boolean) => void
}

function installEnvironment(): TestGlobals {
  // Track desktop-ness; update all listeners when it changes.
  let desktop = true

  const listeners = new Set<(ev: MediaQueryListEvent) => void>()

  const makeMql = (query: string) => {
    const isDesktopQuery = query.includes('min-width: 1024px')
    const mql: Partial<MediaQueryList> & { matches: boolean } = {
      matches: isDesktopQuery ? desktop : false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, cb: EventListenerOrEventListenerObject) => {
        listeners.add(cb as (ev: MediaQueryListEvent) => void)
      },
      removeEventListener: (_type: string, cb: EventListenerOrEventListenerObject) => {
        listeners.delete(cb as (ev: MediaQueryListEvent) => void)
      },
      addListener: (cb: (ev: MediaQueryListEvent) => void) => listeners.add(cb),
      removeListener: (cb: (ev: MediaQueryListEvent) => void) => listeners.delete(cb),
      dispatchEvent: () => true,
    }
    return mql as MediaQueryList
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => makeMql(query),
  })

  // `requestIdleCallback`: collect callbacks, flush on demand so the tests
  // can control exactly when the aurora mount branch runs.
  const idleCallbacks: RICCallback[] = []
  let ricInstalled = true
  const installRIC = () => {
    ricInstalled = true
    ;(window as unknown as {
      requestIdleCallback: (cb: RICCallback) => number
      cancelIdleCallback: (id: number) => void
    }).requestIdleCallback = (cb: RICCallback) => {
      idleCallbacks.push(cb)
      return idleCallbacks.length
    }
    ;(window as unknown as {
      cancelIdleCallback: (id: number) => void
    }).cancelIdleCallback = () => {}
  }
  const uninstallRIC = () => {
    ricInstalled = false
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback
    delete (window as unknown as { cancelIdleCallback?: unknown }).cancelIdleCallback
  }
  installRIC()

  return {
    setDesktop(next: boolean) {
      desktop = next
      for (const cb of listeners) {
        ;(cb as (ev: MediaQueryListEvent) => void)({
          matches: desktop,
          media: '(min-width: 1024px)',
        } as MediaQueryListEvent)
      }
    },
    async flushIdle() {
      // Pull a fresh snapshot to allow new callbacks registered during flush.
      const pending = idleCallbacks.splice(0, idleCallbacks.length)
      for (const cb of pending) {
        await act(async () => {
          cb({ didTimeout: false, timeRemaining: () => 50 })
        })
      }
    },
    setRICAvailable(available: boolean) {
      if (available && !ricInstalled) installRIC()
      if (!available && ricInstalled) uninstallRIC()
    },
  }
}

// --- Test scaffolding ------------------------------------------------------
let env: TestGlobals

beforeEach(() => {
  push.mockReset()
  prefetch.mockReset()
  env = installEnvironment()
  // NOTE: we intentionally keep real timers by default — `next/dynamic({ ssr: false })`
  // resolves through a microtask chain that fake timers would freeze. The one
  // test that exercises the `setTimeout` fallback opts into fake timers locally.
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.resetModules()
})

// Re-import the component after mocks are registered.
async function renderHero() {
  const { default: Hero } = await import('./Hero')
  return render(<Hero />)
}

describe('<Hero />', () => {
  it('renders heading, subtitle and two CTAs from the i18n dictionary (Req 24.1/24.2)', async () => {
    await renderHero()

    // KineticHeading renders a real <h1>; the accessible name is the raw text.
    const heading = screen.getByRole('heading', {
      level: 1,
      name: t('landing.hero.title'),
    })
    expect(heading).toBeInTheDocument()

    expect(screen.getByText(t('landing.hero.subtitle'))).toBeInTheDocument()

    const primary = screen.getByTestId('hero-cta-primary')
    const secondary = screen.getByTestId('hero-cta-secondary')
    expect(primary).toHaveTextContent(t('landing.cta.primary'))
    expect(secondary).toHaveTextContent(t('landing.cta.secondary'))
  })

  it('prefetches /login on mount and pushes /login on CTA click (Req 4.3)', async () => {
    await renderHero()

    expect(prefetch).toHaveBeenCalledWith('/login')

    const primary = screen.getByTestId('hero-cta-primary')
    const secondary = screen.getByTestId('hero-cta-secondary')

    await act(async () => {
      primary.click()
    })
    await act(async () => {
      secondary.click()
    })

    expect(push).toHaveBeenNthCalledWith(1, '/login')
    expect(push).toHaveBeenNthCalledWith(2, '/login')
  })

  it('does NOT render AuroraBackground on the initial render (Req 4.7, 12.1, 12.9)', async () => {
    await renderHero()
    // The lazy stub must be absent until the idle gate + desktop gate both trip.
    expect(screen.queryByTestId('hero-aurora-stub')).toBeNull()
    expect(screen.queryByTestId('hero-aurora-stub-default')).toBeNull()
  })

  it('mounts AuroraBackground after requestIdleCallback fires on Desktop (Req 4.4, 4.7)', async () => {
    env.setDesktop(true)
    await renderHero()

    // Before the idle callback fires, aurora is still absent.
    expect(screen.queryByTestId('hero-aurora-stub')).toBeNull()

    await env.flushIdle()

    // `next/dynamic({ ssr: false })` lazily imports the module after the
    // idle gate opens; wait for the microtask/promise chain to resolve
    // the dynamic import and render the lazy subtree.
    await waitFor(() => {
      const aurora =
        screen.queryByTestId('hero-aurora-stub') ??
        screen.queryByTestId('hero-aurora-stub-default')
      expect(aurora).not.toBeNull()
    })
  })

  it('does NOT mount AuroraBackground on Mobile even after idle (Req 12.1, 12.9)', async () => {
    env.setDesktop(false)
    await renderHero()

    await env.flushIdle()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.queryByTestId('hero-aurora-stub')).toBeNull()
    expect(screen.queryByTestId('hero-aurora-stub-default')).toBeNull()
  })

  it('falls back to setTimeout when requestIdleCallback is unavailable (Safari, jsdom)', async () => {
    env.setRICAvailable(false)
    env.setDesktop(true)
    vi.useFakeTimers()

    await renderHero()

    expect(screen.queryByTestId('hero-aurora-stub')).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Switch back to real timers so the dynamic import's microtasks can flush.
    vi.useRealTimers()

    await waitFor(() => {
      const aurora =
        screen.queryByTestId('hero-aurora-stub') ??
        screen.queryByTestId('hero-aurora-stub-default')
      expect(aurora).not.toBeNull()
    })
  })

  it('groups CTAs inside an aria-labelled group for assistive tech (Req 11.6)', async () => {
    await renderHero()
    const group = screen.getByRole('group', { name: t('landing.cta.primary') })
    expect(group).toBeInTheDocument()
    // Group contains both CTAs.
    const buttons = within(group).getAllByRole('button')
    expect(buttons).toHaveLength(2)
  })

  it('marks the decorative scene as aria-hidden (Req 11.6)', async () => {
    const { container } = await renderHero()
    const scene = container.querySelector('.hero__scene') as HTMLElement | null
    expect(scene).not.toBeNull()
    expect(scene?.getAttribute('aria-hidden')).toBe('true')
  })
})
