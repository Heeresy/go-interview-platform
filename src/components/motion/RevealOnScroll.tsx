'use client'

/**
 * RevealOnScroll — framer-motion wrapper for scroll-triggered reveal
 * animations used by Public_Landing and other marketing surfaces.
 *
 * Behavior (UI Redesign 2026, Req 4.5 / 4.6 / 10.5 / 10.8):
 *
 *   1. Uses `motion.div` with `whileInView` and
 *      `viewport={{ once: true, margin: "-10%" }}`, plus
 *      `staggerChildren: stagger.normal` on the parent so nested
 *      `<RevealItem>` children (or any `motion.*` with `variants`)
 *      fade-in in sequence.
 *
 *   2. When `prefers-reduced-motion: reduce` is active, the `motion.*`
 *      nodes stay technically active — we do NOT swap them for a
 *      static `<div>`. Instead, transform/opacity transition durations
 *      and the stagger delay are forced to 0 via `reduced(...)`, which
 *      yields an identical visual result with no intermediate frames
 *      (Req 10.8).
 *
 *   3. With the documented prop `fallback="immediate"` (the default),
 *      the component wraps framer-motion initialization in a
 *      try/catch + error-boundary and proactively probes for
 *      `IntersectionObserver` at mount. If the animation, the
 *      observer, or the framer-motion chunk fails, the component
 *      flips into fallback mode: sections are rendered immediately
 *      in their final visible state (`opacity: 1; transform: none`)
 *      and a non-invasive inline alert (`role="status"`, text from
 *      `t("motion.revealFallback")`) is shown. Base page functionality
 *      (navigation, CTAs, content) remains intact (Req 4.6).
 *
 * Tokens are pulled from `@/lib/motion` (`duration`, `easing`,
 * `stagger`, `reduced`) and copy from `@/lib/i18n` (`t`).
 */

import * as React from 'react'
import {
  Component,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { motion, type Variants } from 'framer-motion'

import { duration, easing, reduced, stagger } from '@/lib/motion'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { t } from '@/lib/i18n'

// ── Prop types ─────────────────────────────────────────────────────────────

/**
 * Fallback strategy when framer-motion / IntersectionObserver / the
 * containing chunk fails. Only `"immediate"` is currently defined —
 * sections render at their final state and a status alert is surfaced.
 */
export type RevealFallback = 'immediate'

export interface RevealOnScrollProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragEnd' | 'onDragStart'
  > {
  /** Sections or motion-variant children. */
  children: ReactNode
  /**
   * Fallback strategy if animation init fails. Defaults to `"immediate"`
   * so failures are always recoverable without explicit wiring.
   */
  fallback?: RevealFallback
  /**
   * Stagger delay between children (seconds). Defaults to
   * `stagger.normal` (80ms). At reduced-motion, forced to 0.
   */
  staggerChildren?: number
  /**
   * IntersectionObserver `rootMargin` used by framer-motion's
   * `viewport` prop. Defaults to `-10%` per design.
   */
  viewportMargin?: string
  /**
   * Toggle the non-invasive fallback alert. Enabled by default when
   * fallback activates. Disable only for nested usage where a parent
   * alert is already shown.
   */
  showFallbackAlert?: boolean
}

export interface RevealItemProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragEnd' | 'onDragStart'
  > {
  children: ReactNode
}

// ── Variants ───────────────────────────────────────────────────────────────

/**
 * Container variants. `staggerChildren` is computed per-render against
 * the active reduced-motion state so toggling the OS preference takes
 * effect without a remount.
 */
function buildContainerVariants(staggerDelay: number): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }
}

/**
 * Item variants. Transform (y) and opacity transitions honor the
 * reduced-motion preference by forcing `duration` to 0 via
 * `reduced(duration.base, 0)` while keeping the motion node active.
 */
function buildItemVariants(animatedDuration: number): Variants {
  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        // Req 10.8: when reduced motion is active, duration === 0,
        // so the node snaps to the final state without intermediate
        // frames. The motion.* node itself stays active.
        duration: animatedDuration,
        ease: easing.standard,
      },
    },
  }
}

// ── Error boundary ─────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  onError: () => void
  fallback: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches runtime errors thrown during framer-motion initialization,
 * IntersectionObserver hookup, or any child render. Once an error is
 * caught, notifies the parent so it can lock the tree into
 * fallback mode and keep the page usable (Req 4.6).
 */
class RevealErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Notify parent outside of render so it can flip its own state
    // synchronously. Wrapped in try/catch so a faulty callback can
    // never cascade back through the boundary.
    try {
      this.props.onError()
    } catch {
      /* no-op — fallback UI is already mounted below */
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ── IntersectionObserver probe ─────────────────────────────────────────────

/**
 * Returns `true` when `IntersectionObserver` is available on `window`.
 * Wrapped in try/catch because some locked-down environments throw on
 * property access.
 */
function hasIntersectionObserver(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.IntersectionObserver === 'function'
    )
  } catch {
    return false
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────

/**
 * Inline style for the fallback alert. Non-invasive — uses semantic
 * tokens only, doesn't break page flow, doesn't steal focus.
 */
const FALLBACK_ALERT_STYLE: CSSProperties = {
  marginTop: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-3)',
  fontSize: 'var(--fs-sm)',
  fontFamily: 'var(--font-sans)',
  color: 'var(--info-strong)',
  background: 'var(--info-soft)',
  border: '1px solid var(--info-soft)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-1)',
}

/**
 * Final-state style applied to the fallback wrapper. Matches the
 * `visible` variant so sections look the same as after a successful
 * reveal animation.
 */
const FALLBACK_CONTENT_STYLE: CSSProperties = {
  opacity: 1,
  transform: 'none',
}

// ── Fallback renderer ──────────────────────────────────────────────────────

interface ImmediateFallbackProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  children: ReactNode
  showAlert: boolean
  style?: CSSProperties
}

function ImmediateFallback({
  children,
  showAlert,
  style,
  ...rest
}: ImmediateFallbackProps) {
  return (
    <>
      <div
        {...rest}
        data-reveal-fallback="immediate"
        style={{ ...FALLBACK_CONTENT_STYLE, ...style }}
      >
        {children}
      </div>
      {showAlert ? (
        <div
          role="status"
          aria-live="polite"
          data-reveal-fallback-alert=""
          style={FALLBACK_ALERT_STYLE}
        >
          {t('motion.revealFallback')}
        </div>
      ) : null}
    </>
  )
}

// ── Public: RevealOnScroll ─────────────────────────────────────────────────

/**
 * Scroll-triggered reveal wrapper with staggered children support.
 * Use `RevealItem` (below) for individual items, or any other
 * `motion.*` component that consumes the `hidden`/`visible` variants.
 *
 * @example
 *   <RevealOnScroll fallback="immediate">
 *     <RevealItem><Hero /></RevealItem>
 *     <RevealItem><FeatureGrid /></RevealItem>
 *   </RevealOnScroll>
 */
export function RevealOnScroll({
  children,
  fallback = 'immediate',
  staggerChildren: staggerDelay = stagger.normal,
  viewportMargin = '-10%',
  showFallbackAlert = true,
  ...rest
}: RevealOnScrollProps) {
  const prefersReducedMotion = useReducedMotion()
  const [forceFallback, setForceFallback] = useState(false)

  // Probe for IntersectionObserver support once at mount. If missing,
  // framer-motion's `whileInView` would either no-op or throw
  // depending on the environment; flip to fallback defensively.
  useEffect(() => {
    if (!hasIntersectionObserver()) {
      setForceFallback(true)
    }
  }, [])

  // Variants are recomputed when reduced-motion / stagger change so
  // the OS preference toggle takes effect without a remount.
  const containerVariants = useMemo(
    () => buildContainerVariants(reduced(staggerDelay, 0)),
    // `reduced()` reads `matchMedia` internally; `prefersReducedMotion`
    // is the reactive signal that invalidates the memo.
    [staggerDelay, prefersReducedMotion],
  )

  // Render the fallback branch if support probe failed or the
  // boundary caught an error. `fallback` prop controls the *strategy*
  // (what to render); currently only `"immediate"` is supported.
  const shouldRenderFallback =
    forceFallback && fallback === 'immediate'

  if (shouldRenderFallback) {
    return (
      <ImmediateFallback showAlert={showFallbackAlert} {...rest}>
        {children}
      </ImmediateFallback>
    )
  }

  // Error boundary catches render-time framer-motion failures
  // (chunk failure in dev, observer errors, etc.) and flips the
  // parent into fallback mode.
  return (
    <RevealErrorBoundary
      onError={() => setForceFallback(true)}
      fallback={
        fallback === 'immediate' ? (
          <ImmediateFallback showAlert={showFallbackAlert} {...rest}>
            {children}
          </ImmediateFallback>
        ) : null
      }
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: viewportMargin }}
        variants={containerVariants}
        {...rest}
      >
        {children}
      </motion.div>
    </RevealErrorBoundary>
  )
}

// ── Public: RevealItem ─────────────────────────────────────────────────────

/**
 * A `motion.div` preconfigured with the default reveal item variants
 * (`opacity`/`y` transform, `duration` honoring reduced motion).
 *
 * Use this for direct children of `<RevealOnScroll>` to participate in
 * the stagger. Advanced callers can skip it and use their own
 * `motion.*` components with the same `hidden`/`visible` variant names.
 */
export function RevealItem({ children, ...rest }: RevealItemProps) {
  const prefersReducedMotion = useReducedMotion()

  const variants = useMemo(
    () => buildItemVariants(reduced(duration.base, 0)),
    // `prefersReducedMotion` is the reactive signal; `reduced()`
    // reads matchMedia on each call and returns 0 when active.
    [prefersReducedMotion],
  )

  return (
    <motion.div variants={variants} {...rest}>
      {children}
    </motion.div>
  )
}

export default RevealOnScroll
