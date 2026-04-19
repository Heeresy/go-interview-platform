import { useEffect, useState } from 'react'

/**
 * Hook to check if user prefers reduced motion
 * Useful for disabling animations based on user accessibility preferences
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

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
  normalVariants: any,
  reducedVariants?: any
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
  normalTransition: any,
  reducedTransition?: any
) {
  if (prefersReducedMotion) {
    return reducedTransition || { duration: 0 }
  }
  return normalTransition
}

