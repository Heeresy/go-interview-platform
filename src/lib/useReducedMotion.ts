import { useEffect, useState } from 'react'
import type { Variants, Transition } from 'framer-motion'

/**
 * Hook to check if user prefers reduced motion
 * Useful for disabling animations based on user accessibility preferences
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Get animation variants that respect reduced motion
 */
export function getAnimationVariants(
  prefersReducedMotion: boolean,
  normalVariants: Variants,
  reducedVariants?: Variants
) {
  if (prefersReducedMotion && reducedVariants) {
    return reducedVariants
  }
  return normalVariants
}

/**
 * Get transition settings that respect reduced motion
 */
export function getTransition(
  prefersReducedMotion: boolean,
  normalTransition: Transition,
  reducedTransition?: Transition
) {
  if (prefersReducedMotion) {
    return reducedTransition || { duration: 0 }
  }
  return normalTransition
}

