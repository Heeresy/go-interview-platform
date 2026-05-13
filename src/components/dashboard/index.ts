/**
 * Public API for the `dashboard` module.
 *
 * Per Requirement 22.5, each component directory exposes its public surface
 * via a single `index.ts` barrel. This file is the entry point for the
 * Dashboard (Bento_Grid) primitives that live in `src/components/dashboard/`.
 *
 * Current exports:
 *   - `<BentoGrid />` / `<BentoItem />` — 12-column grid container (task 14.1).
 *   - `<CardErrorBoundary />` — per-card error boundary with inline
 *     `<ErrorState retry />` fallback; isolates sibling cards from each
 *     other's runtime errors (Req 5.5, 5.6).
 *   - `useCardData` — per-card local state hook (`data` / `isLoading` /
 *     `error` / `retry`). Used by every dashboard card to keep state
 *     strictly local to the instance (Req 5.6).
 *   - Dashboard cards (tasks 14.2–14.3):
 *     `<ProgressCard />`, `<NextTaskCard />`, `<ActivityCard />`,
 *     `<LeaderboardCard />`, `<TrainerQuickCard />`, `<MockQuickCard />`.
 */

export { BentoGrid } from './BentoGrid'
export type { BentoGridProps } from './BentoGrid'

export { BentoItem } from './BentoItem'
export type { BentoItemProps } from './BentoItem'

export { CardErrorBoundary } from './CardErrorBoundary'
export type { CardErrorBoundaryProps } from './CardErrorBoundary'

export { useCardData } from './useCardData'
export type { CardDataState } from './useCardData'

// Task 14.2 cards
export { ProgressCard } from './ProgressCard'
export type { ProgressCardProps } from './ProgressCard'

export { NextTaskCard } from './NextTaskCard'
export type { NextTaskCardProps } from './NextTaskCard'

export { ActivityCard } from './ActivityCard'
export type { ActivityCardProps } from './ActivityCard'

// Task 14.3 cards
export { LeaderboardCard } from './LeaderboardCard'
export type { LeaderboardCardProps } from './LeaderboardCard'

export { TrainerQuickCard } from './TrainerQuickCard'
export type { TrainerQuickCardProps } from './TrainerQuickCard'

export { MockQuickCard } from './MockQuickCard'
export type { MockQuickCardProps } from './MockQuickCard'

// Dashboard composite (task 14.5) — собирает все 6 карточек в BentoGrid
// и используется из `src/app/page.tsx` для авторизованной ветки `AuthGate`.
export { Dashboard } from './Dashboard'
export type { DashboardProps } from './Dashboard'
