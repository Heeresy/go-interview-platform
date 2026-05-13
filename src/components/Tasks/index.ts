/**
 * Public API for the `tasks` module.
 *
 * Per Requirement 22.5, each component directory exposes its public surface
 * via a single `index.ts` barrel so consumers can import every Tasks_Module
 * component from `@/components/tasks` without reaching into specific files.
 *
 * Scope covered here (task 18.6):
 *   - List + filters: `TasksList`, `TaskFilters` (task 18.1).
 *   - Split layout:   `TaskSplitLayout`, `TaskDescription` (task 18.2).
 *   - Code editor:    `LazyMonacoEditor` (task 18.3) — DS-aligned
 *                     `uiredesign-dark` Monaco theme is also re-exported
 *                     for consumers that need to address it explicitly
 *                     (e.g. `monaco.editor.setTheme(UI_REDESIGN_DARK_THEME)`).
 *   - Execution:      `ExecutionPanel`, `acceptExecutionResult` type guard,
 *                     and the `ExecutionResult` discriminated union (task 18.4).
 *
 * Component-level prop and result types are re-exported alongside each
 * component (type-only re-exports) so consumers can type their own
 * wrappers without importing from module internals.
 */

// --- List + filters ---------------------------------------------------------
export { TasksList } from './TasksList'
export type { TasksListProps } from './TasksList'

export { TaskFilters } from './TaskFilters'
export type { TaskFiltersProps } from './TaskFilters'

// --- Split layout -----------------------------------------------------------
export { TaskSplitLayout } from './TaskSplitLayout'
export type { TaskSplitLayoutProps } from './TaskSplitLayout'

export { TaskDescription } from './TaskDescription'
export type { TaskDescriptionProps } from './TaskDescription'

// --- Code editor (Monaco, dynamically loaded) -------------------------------
export {
  LazyMonacoEditor,
  UI_REDESIGN_DARK_THEME,
} from './LazyMonacoEditor'
export type { LazyMonacoEditorProps } from './LazyMonacoEditor'

// --- Execution panel --------------------------------------------------------
export { ExecutionPanel, acceptExecutionResult } from './ExecutionPanel'
export type {
  ExecutionPanelProps,
  ExecutionResult,
} from './ExecutionPanel'
