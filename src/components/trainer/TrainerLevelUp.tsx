'use client'

/**
 * `<TrainerLevelUp />` — celebratory overlay shown when the user reaches a
 * new trainer level (task 19.2, UI Redesign 2026).
 *
 * Contract (Requirements 12.8, 16.3, 16.4, 10.8, 10.9):
 *
 *  - **Props:** `{ show: boolean; level: number; onClose: () => void }`.
 *  - **Reduced motion (Req 10.8, 10.9, 16.4):** when `useReducedMotion()` is
 *    true, the component renders a static celebratory indicator — a
 *    `GlassCard` with `t('trainer.levelUp.title')` and the level number —
 *    and **does not** import or run confetti at all. No cursor-following
 *    glow, no parallax, no kinetic animations are triggered. Auto-close
 *    still fires after 2500ms so the overlay dismisses itself on its own.
 *  - **Animated path (Req 16.3, 12.8):** when reduced motion is disabled,
 *    the component dynamically imports `confetti-js` via a bare
 *    `await import('confetti-js')` inside an effect. The confetti module
 *    exports a constructor function rather than a React component, so
 *    `next/dynamic` (which wraps modules in a React loader) would not be
 *    a cleaner fit than a direct dynamic import; the runtime behaviour —
 *    chunk split + first-load bundle excluded — is identical, which is
 *    what Req 12.8 actually requires. The generator renders into a
 *    dedicated full-viewport `<canvas>` layer; on unmount / hide the
 *    generator's `clear()` method is invoked to stop the animation loop.
 *  - **Duration budget (Req 16.3):** the overlay auto-closes after
 *    `AUTO_CLOSE_MS = 2500` milliseconds via `setTimeout`, which
 *    guarantees the celebratory animation does not exceed the 3-second
 *    hard ceiling required by Req 16.3. The timer is armed whenever
 *    `show === true` and cleared when `show` flips to `false`, when
 *    `onClose` identity changes, or when the component unmounts — so
 *    re-showing the overlay resets the window, and a caller-driven close
 *    cancels the timer cleanly.
 *  - **Portal:** rendered into `document.body` via `createPortal` so the
 *    canvas layer is not clipped by ancestor `overflow: hidden` (e.g.
 *    `AppShell`'s max-width container). SSR-safe: `createPortal` is only
 *    invoked after mount, and the component returns `null` on the server
 *    regardless of `show`.
 *  - **Accessibility:** the overlay is labelled by the heading inside
 *    the card via `aria-labelledby`, announces the level-up via
 *    `role="status"` + `aria-live="polite"` on the content container so
 *    screen readers hear the transition without stealing focus.
 *  - **Design System (Req 1.8, 22.1):** all visual values come from DS v2
 *    CSS custom properties — `--space-*`, `--radius-*`, `--z-modal`,
 *    `--fs-*`, `--fw-*`, `--accent-*`, `--border-*`, `--dur-*`,
 *    `--ease-*`. No hex / rgb / px literals live in this file.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'

import { GlassCard } from '@/components/ui/Card'
import { t } from '@/lib/i18n'
import { useReducedMotion } from '@/lib/useReducedMotion'

export interface TrainerLevelUpProps {
  /**
   * When `true`, the overlay is visible and side-effects (confetti render,
   * auto-close timer) are armed. When `false`, the component renders
   * nothing and any running confetti instance is torn down.
   */
  show: boolean
  /**
   * The new trainer level the user has just reached. Rendered as a large
   * numeric indicator inside the card. No formatting is applied — callers
   * pass already-display-ready integers from `src/lib/trainer.ts`.
   */
  level: number
  /**
   * Invoked exactly once after `AUTO_CLOSE_MS` elapses while `show`
   * remained `true`. Callers typically flip the parent `show` state to
   * `false` from this handler. Also invoked by no other mechanism — the
   * component does not render a close button to keep the overlay purely
   * celebratory and dismiss-on-timer.
   */
  onClose: () => void
}

/**
 * Auto-close delay in milliseconds. Chosen strictly under the 3000ms
 * hard ceiling from Requirement 16.3 (`≤ 3 секунд`); the 500ms headroom
 * absorbs React scheduling jitter so even on slow devices the overlay
 * never visibly exceeds 3 seconds.
 */
const AUTO_CLOSE_MS = 2500

/**
 * Shape of a `confetti-js` instance returned by its default-exported
 * constructor. Declared locally because `confetti-js` ships no types,
 * and a local interface keeps the dynamic-import boundary typed without
 * pulling an implicit-any into our codebase.
 */
interface ConfettiInstance {
  render: () => void
  clear: () => void
}

/**
 * Shape of the `confetti-js` constructor. Matches the library's actual
 * runtime contract (see `node_modules/confetti-js/dist/index.es.js`):
 * a plain function that returns a `{ render, clear }` object when called
 * with `new`.
 */
type ConfettiCtor = new (settings: {
  target: HTMLCanvasElement | string
  max?: number
  size?: number
  animate?: boolean
  respawn?: boolean
  clock?: number
  rotate?: boolean
  start_from_edge?: boolean
  props?: unknown[]
  colors?: number[][]
  width?: number
  height?: number
}) => ConfettiInstance

/**
 * Accent confetti palette — RGB tuples required by `confetti-js`.
 * The hues approximate DS v2 `--accent-*` and semantic tokens (cyan,
 * purple, green, amber) so that even though `confetti-js` cannot read
 * CSS custom properties at runtime, the palette stays visually aligned
 * with the rest of Design System v2.
 *
 * Note (Req 1.8 scope): these literals live *inside* confetti-lib
 * initialisation, not inside CSS/style declarations of this component.
 * The DS v2 token rule forbids hex/rgb literals in component **styling**;
 * they are unavoidable here because the third-party canvas library
 * accepts only numeric RGB triples and ignores CSS variables entirely.
 */
const CONFETTI_COLORS_RGB: number[][] = [
  [0, 212, 255], // accent-600 — cyan
  [168, 85, 247], // accent-purple
  [16, 185, 129], // success
  [245, 158, 11], // warning
]

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--z-modal)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-4)',
  // Subtle scrim so the celebratory card reads on busy trainer screens.
  background:
    'color-mix(in oklch, var(--bg-0) 40%, transparent)',
  // Do not block interaction with the page behind: the overlay is a
  // self-dismissing celebratory announcement, not a modal that traps
  // focus. `pointer-events: none` on the backdrop + auto on the card
  // lets the learner keep interacting with the page underneath.
  pointerEvents: 'none',
}

const CANVAS_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
}

const CARD_STYLE: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-4)',
  padding: 'var(--space-8) var(--space-10)',
  textAlign: 'center',
  // Re-enable interaction on the card itself so focus/tap works on the
  // level indicator without blocking the rest of the page.
  pointerEvents: 'auto',
  animation:
    'ds-trainer-level-up-in var(--dur-base) var(--ease-emphasised)',
}

const TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-xl)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
  color: 'var(--border-900)',
  margin: 0,
}

const LEVEL_STYLE: CSSProperties = {
  fontSize: 'var(--fs-3xl)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1,
  letterSpacing: '-0.02em',
  color: 'var(--accent-600)',
  margin: 0,
  fontVariantNumeric: 'tabular-nums',
}

export function TrainerLevelUp({ show, level, onClose }: TrainerLevelUpProps) {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const confettiRef = useRef<ConfettiInstance | null>(null)

  const reactId = useId()
  const titleId = `trainer-level-up-title-${reactId}`

  // Portal is safe to use only after the component has mounted on the
  // client — otherwise SSR would attempt to touch `document.body`.
  useEffect(() => {
    setMounted(true)
  }, [])

  // --- Auto-close (Req 16.3) ------------------------------------------------
  // Arms a 2500ms timer whenever `show` flips to `true`; cancels cleanly on
  // hide / unmount / `onClose` identity change. Keeping this in its own
  // effect (separate from the confetti effect) guarantees that the timer
  // also works on the reduced-motion static path.
  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => {
      onClose()
    }, AUTO_CLOSE_MS)
    return () => {
      clearTimeout(id)
    }
  }, [show, onClose])

  // --- Confetti (Req 12.8, 16.3) -------------------------------------------
  // Dynamic import happens *inside* the effect body, so the confetti chunk
  // is never part of the first-load bundle (Req 12.8). The effect only runs
  // when the overlay is visible *and* motion is not reduced (Req 16.4), and
  // it tears down the generator on any dependency change — including a
  // reduced-motion preference toggle mid-session.
  //
  // `mounted` is part of the dependency list because the canvas is only
  // rendered after the component has mounted on the client (the portal
  // gate below). Without this dep, the effect would fire once on the
  // initial pass while `canvasRef.current` is still `null`, early-return,
  // and never re-run — leaving confetti disabled on the real-app path.
  useEffect(() => {
    if (!show || reduced || !mounted) return

    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false

    void import('confetti-js')
      .then((mod) => {
        if (cancelled) return
        // `confetti-js` is a CJS module with a single default export; both
        // shapes (`mod.default` and the module object itself) have been
        // observed across bundlers/runtimes, so we pick the callable one.
        const maybeCtor = (mod as { default?: unknown }).default ?? mod
        if (typeof maybeCtor !== 'function') return
        const Ctor = maybeCtor as ConfettiCtor

        try {
          const instance = new Ctor({
            target: canvas,
            max: 120,
            clock: 30,
            rotate: true,
            respawn: false,
            colors: CONFETTI_COLORS_RGB,
          })
          instance.render()
          confettiRef.current = instance
        } catch {
          // Canvas init can fail in environments without a real WebGL/2D
          // context (jsdom tests, older browsers). Swallow: the static
          // card remains visible and the auto-close timer still fires.
        }
      })
      .catch(() => {
        // Network chunk load failure — e.g. user is offline mid-session.
        // Again: no user-facing error, the static card + timer are the
        // graceful degradation.
      })

    return () => {
      cancelled = true
      const inst = confettiRef.current
      if (inst) {
        try {
          inst.clear()
        } catch {
          // Ignore — confetti-js `clear` occasionally throws when the
          // canvas has already been torn down by React before the effect
          // cleanup ran. Nothing actionable remains.
        }
        confettiRef.current = null
      }
    }
  }, [show, reduced, mounted])

  if (!show) return null
  if (!mounted || typeof document === 'undefined') return null

  const title = t('trainer.levelUp.title')

  return createPortal(
    <div
      data-ds="trainer-level-up"
      data-reduced-motion={reduced ? 'true' : 'false'}
      style={OVERLAY_STYLE}
      aria-hidden={false}
    >
      {reduced ? null : (
        <canvas
          ref={canvasRef}
          data-testid="trainer-level-up-canvas"
          style={CANVAS_STYLE}
          aria-hidden="true"
        />
      )}
      <GlassCard
        role="status"
        aria-live="polite"
        aria-labelledby={titleId}
        data-testid="trainer-level-up-card"
        style={CARD_STYLE}
      >
        <h2 id={titleId} style={TITLE_STYLE}>
          {title}
        </h2>
        <p style={LEVEL_STYLE} aria-label={`${title} ${level}`}>
          {level}
        </p>
      </GlassCard>
    </div>,
    document.body,
  )
}

export default TrainerLevelUp
