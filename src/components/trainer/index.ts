/**
 * Public API of `src/components/trainer/` (Req 22.4, 22.5).
 *
 * Trainer_Module composes three building blocks introduced in tasks
 * 19.1 — 19.3 of UI Redesign 2026:
 *
 *   - `<TrainerProgressHeader />` — sticky header showing current level,
 *     progress to next level and solved count (Req 16.2).
 *   - `<TrainerLevelUp />`        — celebratory overlay shown on level-up,
 *     with confetti / static fallback under reduced motion (Req 16.3,
 *     16.4, 12.8).
 *   - `<TrainerShell />`          — orchestrator that wires both together
 *     and delegates skip/retry/stay decisions to `src/lib/trainer.ts`
 *     (Req 16.1, 16.5, 21.2).
 *
 * Component-level prop types are re-exported alongside each component
 * (type-only re-exports) so that consumers — currently `src/app/trainer/page.tsx`
 * (task 19.4) — can type their own wrappers without importing from
 * module internals.
 */

export { TrainerProgressHeader } from './TrainerProgressHeader'
export type { TrainerProgressHeaderProps } from './TrainerProgressHeader'

export { TrainerLevelUp } from './TrainerLevelUp'
export type { TrainerLevelUpProps } from './TrainerLevelUp'

export { TrainerShell } from './TrainerShell'
export type { TrainerShellProps } from './TrainerShell'
