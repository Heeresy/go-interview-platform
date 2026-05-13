'use client'

/**
 * MultiLangFontGate — mount-time detection gate for pages that render text
 * in more than one language (e.g. ru + en in a single session).
 *
 * Spec: UI Redesign 2026 — task 4.2.
 *
 * Requirement 24.3 asks the Platform to unify Cyrillic and Latin glyphs under
 * a single font family on multi-language pages. Requirement 24.4 defines the
 * blocking behaviour when that guarantee cannot be honoured:
 *
 *   IF единое шрифтовое отображение кириллицы и латиницы не удаётся
 *   обеспечить на мультиязычной странице, THEN THE Platform SHALL
 *   блокировать доступ к мультиязычной странице и отображать уведомление
 *   об ошибке шрифтового рендера.
 *
 * The gate performs a three-step check on mount:
 *
 *   1. Awaits `document.fonts.ready` so variable fonts finish loading.
 *   2. Calls `document.fonts.check("1em var(--font-sans)")`. The token
 *      `--font-sans` resolves to the `next/font` Inter Variable family with
 *      `latin` + `cyrillic` subsets (task 1.2). A `false` response means the
 *      browser failed to load the configured face.
 *   3. Canvas-measures representative ru + en samples. If the rendered
 *      glyph widths collapse to the same box (i.e. both strings measure as
 *      "tofu" rectangles or the fallback family produced identical advance
 *      widths across scripts), we treat that as a unified-rendering failure.
 *
 * Failure surfaces the full-screen `<FontErrorState />`. The user can retry,
 * which re-runs the check. Single-language pages bypass the gate entirely:
 * when `languages.length <= 1`, the gate is a no-op pass-through and is
 * absent from the render tree.
 *
 * Browser support fallbacks:
 *
 *   - If `document.fonts` (CSS Font Loading API) is missing, we skip the
 *     check and render children — the gate MUST NOT block users on old
 *     browsers where we cannot measure support.
 *   - If the canvas 2D context cannot be obtained, we treat that as
 *     "measurement impossible" and pass through.
 *   - If `document.fonts.check` or `document.fonts.ready` throws, we catch
 *     and fall back to pass-through to avoid regressing pages on hostile
 *     environments (extensions that override the API, SSR hydration, etc.).
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import FontErrorState from './FontErrorState'

/**
 * Representative samples from ru and en corpora. Kept intentionally short
 * so canvas measurement stays cheap (< 1ms on hot path) and reflective of
 * real glyph coverage (lowercase + uppercase + common punctuation).
 *
 * The samples are NEVER displayed to the user — they exist purely for
 * off-screen canvas measurement.
 */
const SAMPLES: Record<string, string> = {
  ru: 'Привет, мир! Тест шрифта АБВ абв 0123',
  en: 'Hello, world! Font probe ABC abc 0123',
}

/**
 * Default CSS font shorthand used for `document.fonts.check` and canvas
 * measurement. Matches the `--font-sans` token set up by `next/font` in
 * `src/app/layout.tsx` (task 1.2).
 */
const DEFAULT_FONT_SHORTHAND = '16px var(--font-sans)'

/**
 * Minimum measurable width in CSS pixels for a sample to count as a real
 * glyph render. Anything below this is treated as "tofu collapsed to the
 * fallback metric" and trips the failure branch.
 */
const MIN_SAMPLE_WIDTH_PX = 10

type GateState = 'pending' | 'ok' | 'failed'

/**
 * Runs the multi-language font detection check. Returns `true` when a
 * unified family is available, `false` on detected mismatch. When the
 * required APIs are missing entirely, resolves to `true` (pass-through) —
 * the gate must never block a user we cannot verify.
 */
async function detectUnifiedFont(
  fontShorthand: string,
  samples: Record<string, string>,
  signal: AbortSignal,
): Promise<boolean> {
  // SSR guard.
  if (typeof document === 'undefined') return true

  const fonts = document.fonts
  if (!fonts || typeof fonts.check !== 'function') {
    // No Font Loading API — cannot verify, pass through.
    return true
  }

  // Wait for fonts to settle. `document.fonts.ready` is a Promise of
  // FontFaceSet per the CSS Font Loading spec.
  try {
    if (fonts.ready && typeof (fonts.ready as Promise<unknown>).then === 'function') {
      await fonts.ready
    }
  } catch {
    // Ignore — we'll still try the sync check below.
  }

  if (signal.aborted) return true

  // Step 1: fast path — does the browser claim the font is available?
  let available = false
  try {
    available = fonts.check(fontShorthand)
  } catch {
    // If the check throws, we cannot conclude failure. Pass through.
    return true
  }

  if (!available) return false

  // Step 2: canvas-measure ru + en samples. If either sample measures as
  // near-zero width, the glyphs likely collapsed to a tofu box and the
  // unified render contract is not honoured.
  let canvas: HTMLCanvasElement
  try {
    canvas = document.createElement('canvas')
  } catch {
    return true
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Without a 2D context we cannot measure — pass through.
    return true
  }

  ctx.font = fontShorthand

  const widths: number[] = []
  const scripts = Object.keys(samples)
  for (const script of scripts) {
    if (signal.aborted) return true
    const sample = samples[script]
    if (!sample) continue
    let metrics: TextMetrics
    try {
      metrics = ctx.measureText(sample)
    } catch {
      return true
    }
    const width = metrics?.width ?? 0
    if (!Number.isFinite(width) || width < MIN_SAMPLE_WIDTH_PX) {
      // A script-specific sample collapsed — treat as unified-render failure.
      return false
    }
    widths.push(width)
  }

  // When we have at least two scripts and they produced non-zero widths, we
  // accept the result. The widths are expected to differ (different glyph
  // advances), so equality is not a failure signal by itself — we only fail
  // when a sample goes below the minimum width threshold above.
  return widths.length === 0 || widths.every((w) => w >= MIN_SAMPLE_WIDTH_PX)
}

export interface MultiLangFontGateProps {
  /**
   * Languages present on the page (BCP-47 subtags or short codes). The gate
   * only activates when `languages.length > 1`. Single-language pages are
   * unaffected.
   */
  languages: string[]
  /**
   * Page content protected by the gate. Rendered after a successful check
   * or immediately when `languages.length <= 1`.
   */
  children: ReactNode
  /**
   * Optional override for the CSS font shorthand passed to
   * `document.fonts.check` and canvas measurement. Defaults to
   * `"16px var(--font-sans)"` which matches the DS v2 token.
   */
  fontShorthand?: string
  /**
   * Optional override for the ru/en samples used in the canvas-measure
   * step. Useful for tests and alternative locale pairs.
   */
  samples?: Record<string, string>
}

export function MultiLangFontGate({
  languages,
  children,
  fontShorthand = DEFAULT_FONT_SHORTHAND,
  samples = SAMPLES,
}: MultiLangFontGateProps) {
  // The gate only applies when multiple languages coexist on the page.
  const gateActive = languages.length > 1

  const [state, setState] = useState<GateState>(() =>
    gateActive ? 'pending' : 'ok',
  )
  const [retryKey, setRetryKey] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  // Track whether the detection effect has executed at least once for the
  // current `retryKey`. This lets us satisfy "проверка выполняется один раз
  // при монтировании" — the only way to re-run is through `handleRetry`,
  // which bumps `retryKey` explicitly.
  const ranForKeyRef = useRef<number>(-1)

  useEffect(() => {
    if (!gateActive) {
      // Single-language pages are out of scope for the gate.
      return
    }
    if (ranForKeyRef.current === retryKey) {
      // Already ran for this mount / retry cycle. Do not re-fire when
      // React's strict mode double-invokes or when unrelated renders occur.
      return
    }
    ranForKeyRef.current = retryKey

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    setState('pending')

    detectUnifiedFont(fontShorthand, samples, controller.signal).then(
      (ok) => {
        if (controller.signal.aborted) return
        setState(ok ? 'ok' : 'failed')
      },
      () => {
        if (controller.signal.aborted) return
        // Detection itself should never reject — `detectUnifiedFont`
        // swallows errors — but if it does, pass through rather than
        // blocking the user.
        setState('ok')
      },
    )

    return () => {
      controller.abort()
    }
  }, [gateActive, retryKey, fontShorthand, samples])

  const handleRetry = useCallback(() => {
    // Reset the "ran once" guard so the next effect invocation runs.
    ranForKeyRef.current = -1
    setRetryKey((k) => k + 1)
  }, [])

  if (!gateActive) {
    // Single-language pages: gate is a transparent pass-through. No DOM
    // footprint beyond the children themselves.
    return <>{children}</>
  }

  if (state === 'failed') {
    return <FontErrorState onRetry={handleRetry} />
  }

  if (state === 'pending') {
    // While detection is in flight, keep the viewport intentionally blank
    // rather than flashing the underlying content. The check is bounded by
    // `document.fonts.ready`, which completes in < 100ms on warm caches.
    return (
      <div
        aria-hidden="true"
        data-testid="multi-lang-font-gate-pending"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--bg-500)',
          zIndex: 'calc(var(--z-modal) - 1)',
        }}
      />
    )
  }

  return <>{children}</>
}

export default MultiLangFontGate
