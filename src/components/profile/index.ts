/**
 * Public API for the `profile` module.
 *
 * Per Requirement 22.5, each component directory exposes its public surface
 * via a single `index.ts` barrel so consumers can import the profile API
 * from `@/components/profile` without reaching into specific files.
 *
 * Scope covered here (task 21.4):
 *   - `ProfileHeader`  — заголовочная карточка с аватаром и именем.
 *   - `StatsBento`     — Bento-сетка из 4 слотов.
 *   - `ProgressCharts` — SVG-графики прогресса (bar + line).
 *   - `AchievementsGrid` — сетка значков-достижений.
 *   - `ActivityTimeline` — вертикальный таймлайн активности.
 *
 * Component-level prop types are re-exported alongside each component
 * (type-only re-exports) so consumers can type their own wrappers without
 * importing from module internals.
 */

// --- ProfileHeader ----------------------------------------------------------
export { ProfileHeader } from './ProfileHeader'
export type { ProfileHeaderProps, ProfileHeaderUser } from './ProfileHeader'

// --- StatsBento -------------------------------------------------------------
export { StatsBento, PROFILE_BENTO_SLOTS } from './StatsBento'
export type { StatsBentoProps, ProfileBentoSlots } from './StatsBento'

// --- ProgressCharts ---------------------------------------------------------
export { ProgressCharts } from './ProgressCharts'
export type {
  ProgressChartsProps,
  ProgressChartsData,
  MonthlyBar,
  CumulativePoint,
} from './ProgressCharts'

// --- AchievementsGrid -------------------------------------------------------
export { AchievementsGrid } from './AchievementsGrid'
export type { AchievementsGridProps, Achievement } from './AchievementsGrid'

// --- ActivityTimeline -------------------------------------------------------
export { ActivityTimeline } from './ActivityTimeline'
export type { ActivityTimelineProps, ActivityTimelineItem } from './ActivityTimeline'
