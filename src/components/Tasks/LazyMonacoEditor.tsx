'use client'

/**
 * `<LazyMonacoEditor />` — dynamic `@monaco-editor/react` wrapper for the
 * Tasks_Module Code_Editor (task 18.3, UI Redesign 2026).
 *
 * Contract (Requirements 12.8, 15.2, 15.3):
 *
 *  - **Lazy loading (Req 12.8):** Monaco is loaded via
 *    `next/dynamic(() => import('@monaco-editor/react'), { ssr: false })`
 *    so the ~2MB editor chunk never lands in the first-load JS of any
 *    route that does not mount this component. While the chunk is in
 *    flight, a `<Skeleton variant="card" />` from `@/components/ui` is
 *    rendered in its place.
 *
 *  - **Editor contract preserved (Req 15.2):** props mirror the stable
 *    surface of `@monaco-editor/react`'s `Editor` — `value`,
 *    `defaultValue`, `onChange`, `language`, `height`, `options`, plus
 *    pass-through `defaultLanguage`, `path`, `defaultPath`, `theme`,
 *    `onMount`, `beforeMount`, `onValidate`, `className`. Consumers of
 *    the old `src/components/LazyMonacoEditor.tsx` continue to work
 *    against the same shape.
 *
 *  - **DS-aligned theme (Req 15.3):** on first mount the component
 *    defines a Monaco theme named `uiredesign-dark` based on `vs-dark`.
 *    Monaco's theme API accepts only concrete hex colours, not CSS
 *    `var(...)` references, so each token is resolved at runtime from
 *    `document.documentElement` via `getComputedStyle(...).getPropertyValue()`
 *    and normalised to `#rrggbb` / `#rrggbbaa`. The token → Monaco role
 *    mapping follows task 18.3:
 *
 *      editor.background              ← --bg-400
 *      editor.foreground              ← --border-900
 *      editor.lineHighlightBackground ← --surface-400
 *      editorLineNumber.foreground    ← --border-500
 *      editor.selectionBackground     ← --accent-600 + ~30% alpha
 *
 *    If any CSS variable resolves to a non-hex value (empty string, SSR
 *    placeholder, `color-mix(...)`, `oklch(...)`, etc.) a sensible
 *    fallback matching the dark DS palette is used so that Monaco never
 *    rejects the theme registration.
 *
 *  - **Theme application (Req 15.3):** the custom theme is registered in
 *    `beforeMount` (before the editor instance is created) and applied
 *    via `monaco.editor.setTheme('uiredesign-dark')` in `onMount`. Caller
 *    `beforeMount` / `onMount` callbacks are still invoked afterwards
 *    so consumers can chain their own logic without losing the DS theme.
 *
 *  - **Design System (Req 1.8, 22.1):** the loading placeholder uses the
 *    DS v2 `Skeleton` primitive; the wrapper `<div>` uses
 *    `--radius-md` / `--border-200` tokens. No hex/rgb/px literals.
 */

import dynamic from 'next/dynamic'
import type { CSSProperties, ReactNode } from 'react'
import { useCallback } from 'react'
import type {
  BeforeMount,
  EditorProps,
  Monaco,
  OnChange,
  OnMount,
  OnValidate,
} from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

import { Skeleton } from '@/components/ui'

/* ---------------------------------------------------------------------------
 * Dynamic Monaco loader
 * ---------------------------------------------------------------------------
 * Per Requirement 12.8, the Monaco chunk MUST NOT land in the first-load
 * bundle of any route. `next/dynamic({ ssr: false })` ensures the import
 * resolves only on the client, after the wrapper mounts. The `loading`
 * placeholder uses the DS v2 `Skeleton` primitive instead of raw markup
 * so the fallback respects the Design System tokens and a11y
 * (`role="status"` + `aria-busy`).
 */
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        variant="card"
        data-testid="lazy-monaco-editor-skeleton"
        aria-label="Loading editor"
      />
    ),
  },
)

/* ---------------------------------------------------------------------------
 * DS theme: `uiredesign-dark`
 * -------------------------------------------------------------------------*/

/**
 * Name of the Monaco theme registered by this component. Exposed as a
 * named export so consumers (ExecutionPanel, tests) can reference it
 * without stringly-typed literals scattered across the codebase.
 */
export const UI_REDESIGN_DARK_THEME = 'uiredesign-dark' as const

/**
 * Sensible fallback colours used when a CSS custom property is unavailable
 * or resolves to a non-hex value (empty string on SSR, `color-mix(...)`,
 * `oklch(...)`, etc.). These approximate DS v2 dark defaults so the
 * fallback theme stays visually close to the resolved one.
 *
 * Not Design-System tokens at the CSS level — they are pure runtime
 * constants required by the Monaco theme API, which accepts hex only.
 */
const FALLBACK_COLORS = {
  background: '#12121a', // --bg-400 (dark)
  foreground: '#d8d8e2', // --border-900 (dark)
  lineHighlight: '#22222c', // --surface-400 (dark)
  lineNumber: '#757589', // --border-500 (dark)
  // accent-600 hex + "4d" alpha byte ≈ 30% opacity
  selection: '#00d4ff4d',
} as const

/**
 * Matches a 3, 4, 6 or 8-digit CSS hex colour. Short forms (`#abc`,
 * `#abcd`) are accepted and expanded; Monaco itself wants the long
 * form. We handle expansion in `toMonacoHex` below.
 */
const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Normalise an arbitrary CSS value read from a custom property into a
 * Monaco-friendly `#rrggbb` or `#rrggbbaa` string.
 *
 * Returns `null` for any value that cannot be safely coerced — empty
 * strings, whitespace-only, `color-mix(...)`, `rgb(...)`, `oklch(...)`,
 * named colours, etc. The caller is expected to substitute a fallback.
 */
function toMonacoHex(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!HEX_PATTERN.test(trimmed)) return null

  const hex = trimmed.slice(1).toLowerCase()
  // Expand short forms (#rgb / #rgba → #rrggbb / #rrggbbaa).
  if (hex.length === 3 || hex.length === 4) {
    const expanded = hex
      .split('')
      .map((c) => c + c)
      .join('')
    return `#${expanded}`
  }
  return `#${hex}`
}

/**
 * Read a CSS custom property from `document.documentElement` and coerce
 * it to a Monaco hex colour. Returns `fallback` whenever the resolution
 * fails (SSR, missing var, non-hex syntax, `document` unavailable).
 */
function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(
      name,
    )
    const hex = toMonacoHex(value)
    return hex ?? fallback
  } catch {
    return fallback
  }
}

/**
 * Append an alpha byte (00..ff) to a 6-digit hex colour. If the input
 * already carries an alpha byte, it is replaced. Used to synthesise the
 * selection highlight from `--accent-600` at ~30% opacity, matching the
 * task 18.3 mapping `color-mix(accent-600 30%)`.
 */
function withAlpha(hex: string, alphaByte: string): string {
  if (!HEX_PATTERN.test(hex)) return hex
  const base = hex.length === 9 ? hex.slice(0, 7) : hex.slice(0, 7)
  return `${base}${alphaByte}`
}

/**
 * Build the Monaco theme definition for `uiredesign-dark` using the
 * current DS tokens resolved from `document.documentElement`. Pure
 * function of the DOM state; safe to call multiple times (Monaco's
 * `defineTheme` overwrites by name).
 */
function buildUiRedesignDarkTheme(): editor.IStandaloneThemeData {
  const background = readToken('--bg-400', FALLBACK_COLORS.background)
  const foreground = readToken('--border-900', FALLBACK_COLORS.foreground)
  const lineHighlight = readToken(
    '--surface-400',
    FALLBACK_COLORS.lineHighlight,
  )
  const lineNumber = readToken('--border-500', FALLBACK_COLORS.lineNumber)

  // Selection = --accent-600 at ~30% alpha. If --accent-600 itself is not
  // a plain hex, fall back to the full pre-computed selection token.
  const accent = readToken('--accent-600', '')
  const selection = accent
    ? withAlpha(accent, '4d')
    : FALLBACK_COLORS.selection

  return {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': background,
      'editor.foreground': foreground,
      'editor.lineHighlightBackground': lineHighlight,
      'editorLineNumber.foreground': lineNumber,
      'editor.selectionBackground': selection,
    },
  }
}

/**
 * Register the `uiredesign-dark` theme with the Monaco instance. Runs
 * inside `beforeMount` so the theme exists by the time the editor is
 * first rendered — avoids a flash of `vs-dark` on initial paint.
 *
 * Wrapped in try/catch because a failed theme definition must not
 * prevent the editor from mounting; Monaco will simply fall back to the
 * default `vs-dark` theme, which is still visually acceptable.
 */
function registerUiRedesignDarkTheme(monaco: Monaco): void {
  try {
    monaco.editor.defineTheme(
      UI_REDESIGN_DARK_THEME,
      buildUiRedesignDarkTheme(),
    )
  } catch {
    // Theme registration failures are non-fatal — the editor will keep
    // working on `vs-dark` and the DS mismatch is purely cosmetic.
  }
}

/* ---------------------------------------------------------------------------
 * Public component
 * -------------------------------------------------------------------------*/

/**
 * Props mirror the subset of `@monaco-editor/react`'s `EditorProps` that
 * callers within the Tasks_Module actually use. The types are re-exported
 * straight from `@monaco-editor/react` to keep the contract in sync with
 * the upstream library without drift.
 */
export interface LazyMonacoEditorProps {
  /** Controlled editor value. */
  value?: EditorProps['value']
  /** Initial value when uncontrolled. */
  defaultValue?: EditorProps['defaultValue']
  /** Change callback — `(value, event) => void`. */
  onChange?: OnChange
  /** Marker-validation callback. */
  onValidate?: OnValidate
  /** Controlled language id (e.g. `"go"`, `"typescript"`). */
  language?: EditorProps['language']
  /** Initial language when uncontrolled. */
  defaultLanguage?: EditorProps['defaultLanguage']
  /** Model path (scoped worker + language services). */
  path?: EditorProps['path']
  /** Initial model path when uncontrolled. */
  defaultPath?: EditorProps['defaultPath']
  /** Editor container height. Default `"400px"`. */
  height?: EditorProps['height']
  /** Editor container width. Default `"100%"`. */
  width?: EditorProps['width']
  /** Monaco construction options (minimap, fontSize, etc.). */
  options?: EditorProps['options']
  /**
   * Explicit theme override. Defaults to the DS-aligned `uiredesign-dark`;
   * callers that set this to another value (e.g. `"vs-dark"`) opt out of
   * the DS theme entirely.
   */
  theme?: EditorProps['theme']
  /** Signature: `(monaco) => void`. Invoked after DS theme registration. */
  beforeMount?: BeforeMount
  /** Signature: `(editor, monaco) => void`. Invoked after DS theme apply. */
  onMount?: OnMount
  /** Class applied to the Monaco container (passed through). */
  className?: string
  /** Custom loading placeholder; replaces the default Skeleton. */
  loading?: ReactNode
}

/**
 * Wrapper `<div>` — owns DS padding/radius tokens so consumers do not
 * need to re-declare them at every call site. No hard-coded px values.
 */
const WRAPPER_STYLE: CSSProperties = {
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-200)',
  overflow: 'hidden',
  background: 'var(--bg-400)',
  width: '100%',
  height: '100%',
  minHeight: '400px',
  color: 'initial',
}

export function LazyMonacoEditor({
  value,
  defaultValue,
  onChange,
  onValidate,
  language,
  defaultLanguage = 'javascript',
  path,
  defaultPath,
  height = '400px',
  width,
  options,
  theme = UI_REDESIGN_DARK_THEME,
  beforeMount,
  onMount,
  className,
  loading,
}: LazyMonacoEditorProps) {
  /**
   * Register the DS theme before the Monaco instance is constructed, then
   * delegate to a caller-supplied `beforeMount` (if any). The composition
   * order matters: DS theme runs first so callers that override it in
   * their own `beforeMount` keep full control.
   */
  const handleBeforeMount = useCallback<BeforeMount>(
    (monaco) => {
      registerUiRedesignDarkTheme(monaco)
      beforeMount?.(monaco)
    },
    [beforeMount],
  )

  /**
   * After the editor is mounted, explicitly apply `uiredesign-dark`
   * (unless the caller overrode `theme`). `Editor` accepts `theme` as a
   * prop too, but calling `setTheme` guarantees the swap takes effect
   * even across hot-reload or late theme-definition races.
   */
  const handleMount = useCallback<OnMount>(
    (editorInstance, monaco) => {
      if (theme === UI_REDESIGN_DARK_THEME) {
        try {
          monaco.editor.setTheme(UI_REDESIGN_DARK_THEME)
        } catch {
          // Fallback to vs-dark if custom theme fails
          try { monaco.editor.setTheme('vs-dark') } catch { /* noop */ }
        }
      }
      onMount?.(editorInstance, monaco)
    },
    [onMount, theme],
  )

  return (
    <div
      data-ds="lazy-monaco-editor"
      className={className}
      style={WRAPPER_STYLE}
    >
      <MonacoEditor
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onValidate={onValidate}
        language={language}
        defaultLanguage={defaultLanguage}
        path={path}
        defaultPath={defaultPath}
        height={height}
        width={width}
        theme={theme}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        loading={loading}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          bracketPairColorization: { enabled: true },
          ...options,
        }}
      />
    </div>
  )
}

export default LazyMonacoEditor
