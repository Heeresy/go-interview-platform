/**
 * Centralized Framer Motion animation presets for GOPrep platform.
 * Eliminates copy-pasted motion props across components.
 *
 * Usage:
 *   import { fadeInUp, staggerContainer, springTransition } from '@/lib/motion'
 *   <motion.div {...fadeInUp} transition={springTransition}>...</motion.div>
 */

import type { Variants, Transition } from 'framer-motion'

// ── Transition Presets ──────────────────────────────────────
export const springTransition: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
}

export const smoothTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 1, 0.5, 1], // expo-out
}

export const gentleTransition: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1], // circ-out
}

export const snappyTransition: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1], // expo-out fast
}

// ── Motion Props (spread directly onto motion.div) ──────────
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: smoothTransition,
}

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: smoothTransition,
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: gentleTransition,
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: smoothTransition,
}

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: smoothTransition,
}

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: smoothTransition,
}

// ── Variants (for parent-child stagger orchestration) ───────

/** Stagger container – spread on the parent <motion.div> */
export function staggerContainer(staggerDelay = 0.05): { variants: Variants } {
  return {
    variants: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    },
  }
}

/** Stagger item – spread on each child <motion.div> */
export const staggerItem: { variants: Variants } = {
  variants: {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: smoothTransition,
    },
  },
}

export const staggerItemScale: { variants: Variants } = {
  variants: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: springTransition,
    },
  },
}

// ── Exit Animations ─────────────────────────────────────────
export const exitFadeDown = {
  exit: { opacity: 0, y: 20, transition: gentleTransition },
}

export const exitFadeUp = {
  exit: { opacity: 0, y: -20, transition: gentleTransition },
}

export const exitFadeLeft = {
  exit: { opacity: 0, x: -20, transition: gentleTransition },
}

export const exitScaleOut = {
  exit: { opacity: 0, scale: 0.95, transition: gentleTransition },
}

// ── Page Transitions ────────────────────────────────────────
export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
}

// ── Hover / Tap helpers (for whileHover / whileTap) ─────────
export const hoverLift = {
  whileHover: { y: -3, transition: snappyTransition },
  whileTap: { scale: 0.97, transition: snappyTransition },
}

export const hoverScale = {
  whileHover: { scale: 1.02, transition: snappyTransition },
  whileTap: { scale: 0.98, transition: snappyTransition },
}

export const hoverGlow = {
  whileHover: {
    boxShadow: '0 0 20px oklch(76.5% 0.184 158.4 / 0.15)',
    transition: snappyTransition,
  },
}

// ── Utility: delay a motion preset ──────────────────────────
export function withDelay<T extends Record<string, unknown>>(
  preset: T,
  delay: number
): T {
  return {
    ...preset,
    transition: {
      ...(preset.transition as object),
      delay,
    },
  } as T
}

/** Generate staggered delay for list item index */
export function itemDelay(index: number, baseDelay = 0.05) {
  return { delay: index * baseDelay }
}

// ── Design System v2 Motion Tokens (UI Redesign 2026) ───────
// Requirement 10.1, 10.2: duration + easing scales exposed as tokens.
// Requirement 10.8: `reduced()` switches to the reduced-motion value
// when `prefers-reduced-motion: reduce` is active, keeping animations
// technically active with a 0ms duration for identical final visuals.

/**
 * Duration scale (seconds — framer-motion uses seconds for `transition.duration`).
 * Corresponds 1:1 to CSS tokens `--dur-*` (milliseconds) from Design_System.
 *   instant  = 80ms
 *   fast     = 160ms
 *   base     = 240ms
 *   slow     = 400ms
 *   dramatic = 720ms
 */
export const duration = {
  instant: 0.08,
  fast: 0.16,
  base: 0.24,
  slow: 0.4,
  dramatic: 0.72,
} as const

/**
 * Easing tokens. Cubic-bezier tuples are ready for framer-motion
 * `transition.ease`; spring configs are spread directly into
 * `transition` (type: 'spring').
 */
export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  emphasised: [0.3, 0, 0, 1] as const,
  springSoft: { type: 'spring', stiffness: 180, damping: 22 } as const,
  springSnappy: { type: 'spring', stiffness: 320, damping: 28 } as const,
} as const

/**
 * Stagger delay scale (seconds) for `transition.staggerChildren` on
 * parent motion containers.
 */
export const stagger = {
  tight: 0.04,
  normal: 0.08,
  loose: 0.12,
} as const

/**
 * Returns `reducedValue` when `prefers-reduced-motion: reduce` is active,
 * otherwise returns `v`. Safe to call during SSR — returns `v` when
 * `window` is unavailable.
 *
 * Used to inline reduced-motion swaps at component boundaries without
 * conditional branching, e.g.:
 *   transition={{ duration: reduced(duration.base, 0), ease: easing.standard }}
 */
export function reduced<T>(v: T, reducedValue: T): T {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return v
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? reducedValue
      : v
  } catch {
    return v
  }
}
