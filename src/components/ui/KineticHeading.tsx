'use client'

/**
 * `<KineticHeading />` — Design System v2 heading primitive with split-text
 * reveal animation.
 *
 * Splits the given string into per-word `<motion.span>` nodes and animates
 * each of them from (`opacity: 0, y: var(--space-3)`) into (`opacity: 1,
 * y: 0`). Durations, stagger and easing come from `@/lib/motion` tokens
 * (Requirement 10.1, 10.2, 22.1).
 *
 * Reduced motion (Requirements 10.8, 10.9):
 *   - Per Req 10.9 (and the task description), `KineticHeading` is classed
 *     as "kinetic typography" and must be turned off when the user prefers
 *     reduced motion. We implement this by setting both the per-span
 *     duration and the parent `staggerChildren` to `0` via the `reduced()`
 *     helper — animations stay technically active (Req 10.8 inner
 *     invariant: `motion.*` nodes are not swapped for static elements),
 *     so the visual final state is identical, but nothing moves or fades.
 *
 * Props:
 *   - `as`         — heading level: `'h1' | 'h2' | 'h3'` (default `'h1'`).
 *   - `children`   — the heading text. Must be a plain string so we can
 *                    split it deterministically into per-word spans.
 *   - `staggerMs`  — optional stagger override between word reveals. When
 *                    omitted, falls back to `stagger.normal` (80ms). Treated
 *                    as milliseconds here to match the prop name; converted
 *                    to seconds internally for framer-motion.
 *   - `className`  — merged onto the outer heading element.
 *
 * Tokens used: `--space-3` (translate distance), duration/easing/stagger
 * from `@/lib/motion`. No hardcoded colors / px (Requirement 1.8).
 */

import { motion, type Variants } from 'framer-motion'
import type { CSSProperties } from 'react'
import {
  duration as motionDuration,
  easing as motionEasing,
  reduced as motionReduced,
  stagger as motionStagger,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

export type KineticHeadingLevel = 'h1' | 'h2' | 'h3'

export interface KineticHeadingProps {
  /** HTML heading level. Default `'h1'`. */
  as?: KineticHeadingLevel
  /**
   * Heading text. Must be a plain string — split-text can't safely operate
   * on arbitrary ReactNodes (nested components, images, etc.).
   */
  children: string
  /**
   * Delay between sibling word reveals, in **milliseconds**. When omitted,
   * falls back to `stagger.normal` (80ms). Set to `0` to reveal all words
   * together.
   */
  staggerMs?: number
  /** Optional className for the outer heading. */
  className?: string
}

const CONTAINER_STYLE: CSSProperties = {
  display: 'inline-block',
  // Guarantee wrapping behaviour works the same as for a plain `<h1>` — we
  // only change the *children* structure, not the block-level flow.
  margin: 0,
}

const WORD_STYLE: CSSProperties = {
  display: 'inline-block',
  // `whiteSpace: 'pre'` keeps the trailing space after each word so the
  // heading re-flows naturally. See how words are emitted below.
  whiteSpace: 'pre',
  willChange: 'transform, opacity',
}

// Regex preserves whitespace separators as their own tokens so spacing is
// reconstructed exactly. Each token is either a non-whitespace run (a word)
// or a whitespace run. We animate only the word tokens.
function splitPreservingSpaces(text: string): string[] {
  // Example: "Hello  world\n!" → ["Hello", "  ", "world", "\n", "!"]
  const matches = text.match(/\S+|\s+/g)
  return matches ?? []
}

export function KineticHeading({
  as = 'h1',
  children,
  staggerMs,
  className,
}: KineticHeadingProps) {
  // Convert stagger: prop is ms, framer-motion expects seconds.
  const defaultStaggerSec = motionStagger.normal
  const staggerSec =
    typeof staggerMs === 'number'
      ? Math.max(0, staggerMs) / 1000
      : defaultStaggerSec

  // Reduced-motion swaps: duration and stagger both collapse to 0. Easing is
  // kept unchanged (irrelevant at duration 0, but harmless to leave so the
  // `motion.*` node is not visibly "simpler" than the normal case).
  const effectiveDuration = motionReduced(motionDuration.base, 0)
  const effectiveStagger = motionReduced(staggerSec, 0)

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: effectiveStagger,
        // Slight lead-in so the first word doesn't start precisely at t=0 —
        // feels more intentional. Also reduced-safe (scales with stagger).
        delayChildren: effectiveStagger,
      },
    },
  }

  const wordVariants: Variants = {
    hidden: {
      opacity: 0,
      // Translate by a small spacing token so the motion reads as "kinetic"
      // without overshooting the baseline.
      y: 'var(--space-3)' as unknown as number,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: effectiveDuration,
        ease: motionEasing.standard,
      },
    },
  }

  const tokens = splitPreservingSpaces(children)

  const Tag = as

  // We render a single `<h1|h2|h3>` that hosts a `<motion.span>` container
  // for the word-stagger. This keeps the semantic heading intact for SEO
  // and screen readers — the heading's accessible name is exactly `children`
  // (recovered via normal concatenation of inline spans).
  return (
    <Tag
      className={cn(className)}
      style={CONTAINER_STYLE}
      data-ds="kinetic-heading"
    >
      <motion.span
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        // `aria-hidden` is NOT applied here: the inner text is the heading's
        // accessible name. Per-word spans are presentational but must remain
        // in the accessibility tree so the name concatenates correctly.
      >
        {tokens.map((token, index) => {
          const isWhitespace = /^\s+$/.test(token)
          if (isWhitespace) {
            // Render whitespace as a plain span — no animation needed, and
            // keeping it in a span prevents DOM whitespace collapsing.
            return (
              <span key={`ws-${index}`} style={WORD_STYLE}>
                {token}
              </span>
            )
          }
          return (
            <motion.span
              key={`word-${index}`}
              variants={wordVariants}
              style={WORD_STYLE}
            >
              {token}
            </motion.span>
          )
        })}
      </motion.span>
    </Tag>
  )
}

export default KineticHeading
