/**
 * Public API for the `questions` module.
 *
 * Per Requirement 22.5, each component directory exposes its public surface
 * via a single `index.ts` barrel so consumers (in particular the route files
 * `src/app/questions/page.tsx` and `src/app/questions/[id]/page.tsx`) can
 * import every Questions_Module piece from `@/components/questions` without
 * reaching into specific files (Req 22.4).
 *
 * Scope covered here (task 17.7):
 *   - List view:   `QuestionsList`, `QuestionFilters`.
 *   - Detail view: `QuestionDetail`, `AnswerEditor`, `AiEvaluationPanel`,
 *                  `CommunityThread`.
 *
 * Component-level prop types are re-exported alongside each component
 * (type-only re-exports) so consumers can type their own wrappers without
 * importing from module internals.
 *
 * Legacy-only artefacts (`ResultsCard`, `useDraftAutosave` helpers) are
 * intentionally NOT exposed through this barrel — they are either internal
 * implementation details of `AnswerEditor` or pre-redesign UI that has been
 * superseded by `AiEvaluationPanel` (Req 21.5: dead UI code removed from
 * the public surface).
 */

// --- List view -------------------------------------------------------------
export { QuestionsList } from './QuestionsList'
export type { QuestionsListProps } from './QuestionsList'

export { QuestionFilters } from './QuestionFilters'
export type { QuestionFiltersProps } from './QuestionFilters'

// --- Detail view -----------------------------------------------------------
export { QuestionDetail } from './QuestionDetail'
export type { QuestionDetailProps } from './QuestionDetail'

export { AnswerEditor } from './AnswerEditor'
export type { AnswerEditorProps } from './AnswerEditor'

export { AiEvaluationPanel } from './AiEvaluationPanel'
export type { AiEvaluationPanelProps, AiEvaluation } from './AiEvaluationPanel'

export { CommunityThread } from './CommunityThread'
export type {
  CommunityThreadProps,
  CommunityComment,
  CommunityCommentAuthor,
} from './CommunityThread'
