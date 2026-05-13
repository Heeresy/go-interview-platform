/**
 * Ambient type declaration for the third-party `confetti-js` package.
 *
 * `confetti-js@0.0.18` ships no bundled types and has no matching
 * `@types/confetti-js` on DefinitelyTyped. This stub exists solely so
 * that `strict` TypeScript accepts the dynamic `import('confetti-js')`
 * in `src/components/trainer/TrainerLevelUp.tsx` without triggering
 * `TS7016 (implicit any)`.
 *
 * The real runtime shape (a default-exported constructor returning a
 * `{ render, clear }` object — see `node_modules/confetti-js/dist/index.es.js`)
 * is modelled locally in `TrainerLevelUp.tsx` via its own `ConfettiCtor`
 * type, which casts the imported value at the call site. Here we simply
 * declare the module as `unknown` so every consumer is forced to narrow
 * it explicitly and we never leak `any` into the codebase.
 */
declare module 'confetti-js' {
  const ConfettiGenerator: unknown
  export default ConfettiGenerator
}
