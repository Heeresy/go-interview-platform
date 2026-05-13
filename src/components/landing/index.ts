/**
 * Public API for the `landing` section-components module.
 *
 * Per Requirement 22.5, each component directory exposes its public surface
 * via a single `index.ts` barrel so consumers can import every Public_Landing
 * section from `@/components/landing` without reaching into specific files.
 *
 * Scope covered here (task 13.5):
 *   - Above-the-fold:      `Hero` (task 13.1).
 *   - Features / modules:  `FeatureGrid`, `ModulesShowcase` (task 13.2).
 *   - Social / CTA / foot: `SocialProof`, `LandingCTA`, `LandingFooter` (13.3).
 *
 * Each component is also exported from its own module as `default`, so
 * `import Hero from '@/components/landing/Hero'` continues to work. At the
 * barrel level we stick to named exports only (mirroring the pattern in
 * `@/components/ui/index.ts`) — this keeps the public surface explicit and
 * tree-shake-friendly.
 *
 * Component-level prop types are re-exported alongside each component
 * (type-only re-exports) so consumers can type their own wrappers without
 * importing from module internals. `Hero`, `FeatureGrid` and
 * `ModulesShowcase` do not expose named prop types — they take no props —
 * so only the components themselves are re-exported.
 */

// --- Above-the-fold ---------------------------------------------------------
export { Hero } from './Hero'

// --- Public_Landing composite ----------------------------------------------
// Composite component that wires all six landing sections under a single
// staggered reveal container. Used from `src/app/page.tsx` as the guest
// branch of `<AuthGate>` (task 14.5).
export { PublicLanding } from './PublicLanding'
export type { PublicLandingProps } from './PublicLanding'

// --- Features / modules -----------------------------------------------------
export { FeatureGrid } from './FeatureGrid'
export { ModulesShowcase } from './ModulesShowcase'

// --- Social proof / CTA / footer --------------------------------------------
export { SocialProof } from './SocialProof'
export type { SocialProofProps } from './SocialProof'

export { LandingCTA } from './LandingCTA'
export type { LandingCTAProps } from './LandingCTA'

export { LandingFooter } from './LandingFooter'
export type { LandingFooterProps, LandingFooterLink } from './LandingFooter'
