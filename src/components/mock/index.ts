/**
 * Public API for the `mock` components module (UI Redesign 2026).
 *
 * Per Requirement 22.5, every component directory exposes its public
 * surface through a single `index.ts` barrel. Consumers import
 * everything via `@/components/mock` without reaching into files.
 *
 * Scope covered:
 *   - Task 20.1 — `MockCard` + `MockSummary`, `MockList` +
 *     `MockListInner`, `MockFilters` + `MockFiltersInner`,
 *     `SectionErrorBoundary`.
 *   - Task 20.2 — `MockCreateStepper` + `MockDraft`.
 *   - Task 20.3 — `MockDetail` + `MockDetailSummary`,
 *     `RatingControl`, `CommentThread` + `Comment` + `CommentAuthor`.
 */

export { MockCard } from './MockCard'
export type { MockCardProps, MockSummary } from './MockCard'

export { MockList, MockListInner } from './MockList'
export type { MockListProps } from './MockList'

export { MockFilters, MockFiltersInner } from './MockFilters'
export type { MockFiltersProps } from './MockFilters'

export { MockCreateStepper } from './MockCreateStepper'
export type { MockCreateStepperProps, MockDraft } from './MockCreateStepper'

export { SectionErrorBoundary } from './SectionErrorBoundary'
export type { SectionErrorBoundaryProps } from './SectionErrorBoundary'

// ── Task 20.3 — detail screen + interactive controls ────────────────────

export { MockDetail } from './MockDetail'
export type { MockDetailProps, MockDetailSummary } from './MockDetail'

export { RatingControl } from './RatingControl'
export type { RatingControlProps } from './RatingControl'

export { CommentThread } from './CommentThread'
export type {
  CommentThreadProps,
  Comment,
  CommentAuthor,
} from './CommentThread'
