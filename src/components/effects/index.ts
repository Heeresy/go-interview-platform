/**
 * Public API for the `effects` UI module.
 *
 * Per Requirement 22.3, background/atmospheric effects live here, and per
 * Requirement 22.5 each component directory exposes its public surface via
 * a single `index.ts` barrel.
 *
 *   - `<AuroraBackground />` — fixed WebGL/CSS aurora backdrop with a strict
 *     capability-probe fallback chain (Requirement 3 family).
 *   - `<NoiseOverlay />` — CSS-only cinematic grain layer sitting one z-index
 *     above the aurora (Requirement 3.3).
 *   - `<CursorGlow />` — pointer-following radial highlight for Glass_Surface
 *     primitives on hover-capable viewports only (Requirements 10.4, 10.5,
 *     10.9).
 *
 * Prop types are re-exported alongside each component so consumers can type
 * their wrappers without reaching into module internals.
 */

export { AuroraBackground } from './AuroraBackground'
export type { AuroraBackgroundProps } from './AuroraBackground'

export { DottedSurface } from './DottedSurface'

export { EtherealShadow } from './EtherealShadow'
export type { EtherealShadowProps } from './EtherealShadow'

export { PaperShadersBackground } from './PaperShadersBackground'

export { NoiseOverlay } from './NoiseOverlay'

export { default as CursorGlow } from './CursorGlow'
export type { CursorGlowProps } from './CursorGlow'
