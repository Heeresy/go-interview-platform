'use client'

/**
 * CursorGlow — a cursor-following radial glow meant to sit as an absolutely
 * positioned slot inside Glass_Surface primitives (GlassCard, GlassPanel).
 *
 * Behaviour matrix (Requirements 10.4, 10.5, 10.9):
 *
 *   | Environment                                     | Rendered? | Touch analog? |
 *   |-------------------------------------------------|-----------|---------------|
 *   | Viewport_Desktop/Wide (hover: hover, pointer:   |   Yes     |     N/A       |
 *   |   fine) + Reduced_Motion_Flag = false           |           |               |
 *   | Viewport_Desktop/Wide + Reduced_Motion_Flag     |   No      |     N/A       |
 *   |   = true                                        |  (null)   |               |
 *   | Viewport_Mobile/Tablet (hover: none or pointer: |   No      |  NONE — the   |
 *   |   coarse)                                       |  (null)   |  component    |
 *   |                                                 |           |  SHALL NOT    |
 *   |                                                 |           |  substitute   |
 *   |                                                 |           |  a tap-ripple |
 *   |                                                 |           |  or press-    |
 *   |                                                 |           |  glow.        |
 *
 * Pointer updates are throttled via `requestAnimationFrame` so the effect
 * stays within the 16ms frame budget even on patological pointer streams.
 *
 * The component must be mounted inside a container that establishes a
 * positioning context (e.g. `position: relative`). `GlassCard` / `GlassPanel`
 * do exactly that via the `.glass` class.
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

/**
 * Detects Viewport_Desktop/Wide via `(hover: hover) and (pointer: fine)`.
 * Returns `false` during SSR and on Viewport_Mobile/Tablet.
 */
function useHoverCapable(): boolean {
  const [hoverCapable, setHoverCapable] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    try {
      return window.matchMedia(HOVER_QUERY).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    let mq: MediaQueryList
    try {
      mq = window.matchMedia(HOVER_QUERY)
    } catch {
      return
    }
    // Re-sync in case the state from the initializer diverged (e.g. hydration).
    setHoverCapable(mq.matches)

    const handle = (e: MediaQueryListEvent) => setHoverCapable(e.matches)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handle)
      return () => mq.removeEventListener('change', handle)
    }
    // Legacy Safari fallback
    if (typeof mq.addListener === 'function') {
      mq.addListener(handle)
      return () => mq.removeListener(handle)
    }
  }, [])

  return hoverCapable
}

export interface CursorGlowProps {
  /**
   * CSS color for the glow center. Accepts any valid CSS color or
   * color-producing expression (var(), color-mix(), etc.). Defaults to
   * `var(--accent-600)` from Design_System.
   */
  color?: string
  /** Radius in px of the radial gradient. Default 240. */
  size?: number
  /**
   * Opacity of the glow center, clamped to [0, 1]. Default 0.18 — inside
   * the "subtle premium highlight" band that Glass_Surface expects.
   */
  intensity?: number
  /** Optional extra class names appended to the glow layer. */
  className?: string
}

export default function CursorGlow({
  color = 'var(--accent-600, #00d4ff)',
  size = 240,
  intensity = 0.18,
  className = '',
}: CursorGlowProps) {
  const hoverCapable = useHoverCapable()
  const prefersReduced = useReducedMotion()

  const glowRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!hoverCapable || prefersReduced) return

    const el = glowRef.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    const flush = () => {
      rafRef.current = null
      const pending = pendingRef.current
      if (!pending) return
      el.style.setProperty('--cursor-glow-x', `${pending.x}px`)
      el.style.setProperty('--cursor-glow-y', `${pending.y}px`)
      el.style.opacity = '1'
    }

    const onPointerMove = (e: PointerEvent) => {
      // Mouse / pen only — coarse pointers should never reach this branch
      // because `hoverCapable` would be false, but guard defensively.
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
        return
      }
      const rect = parent.getBoundingClientRect()
      pendingRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush)
      }
    }

    const onPointerEnter = () => {
      el.style.opacity = '1'
    }

    const onPointerLeave = () => {
      el.style.opacity = '0'
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingRef.current = null
    }

    parent.addEventListener('pointermove', onPointerMove)
    parent.addEventListener('pointerenter', onPointerEnter)
    parent.addEventListener('pointerleave', onPointerLeave)

    return () => {
      parent.removeEventListener('pointermove', onPointerMove)
      parent.removeEventListener('pointerenter', onPointerEnter)
      parent.removeEventListener('pointerleave', onPointerLeave)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingRef.current = null
    }
  }, [hoverCapable, prefersReduced])

  // Req 10.5: on Viewport_Mobile/Tablet — return null, no touch analog.
  // Req 10.9: when Reduced_Motion_Flag = true — return null.
  if (!hoverCapable || prefersReduced) return null

  const clampedIntensity = Math.max(0, Math.min(1, intensity))
  const gradient = `radial-gradient(circle ${size}px at var(--cursor-glow-x, 50%) var(--cursor-glow-y, 50%), color-mix(in oklch, ${color} ${clampedIntensity * 100}%, transparent), transparent 65%)`

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      data-cursor-glow=""
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        borderRadius: 'inherit',
        background: gradient,
        opacity: 0,
        transition:
          'opacity var(--dur-fast, 160ms) var(--ease-standard, cubic-bezier(0.2, 0, 0, 1))',
        mixBlendMode: 'plus-lighter',
        zIndex: 0,
      }}
    />
  )
}
