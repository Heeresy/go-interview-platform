'use client'

/**
 * FontErrorState — full-screen blocking fallback shown when a multi-language
 * page cannot render Cyrillic and Latin characters in a single, unified font
 * family.
 *
 * Spec: UI Redesign 2026 — task 4.2.
 *
 * Visual composition (Requirement 24.4):
 *
 *   - Fills the viewport (`position: fixed`, `inset: 0`) above regular
 *     content so the underlying page is visually and interactively blocked.
 *   - Background: static `AuroraBackground`. Task 5.1 owns the
 *     `AuroraBackground` component; at the time task 4.2 ships that module
 *     may not yet be exported from `@/components/effects`. To keep the gate
 *     resilient, the default background is a lightweight placeholder
 *     `<div style={{ backgroundColor: 'var(--bg-500)' }} />`. Callers that
 *     already have access to `<AuroraBackground />` can pass it via the
 *     `backgroundSlot` prop.
 *     TODO(task 5.1 / 13.x integration): replace the placeholder default
 *     with a direct `<AuroraBackground />` render once the component ships
 *     and is exported from `@/components/effects`.
 *   - Foreground: Glass_Surface card (`.glass` class) with the localized
 *     message `t("font.multiLangRenderFailed")` and a retry button labelled
 *     `t("common.tryAgain")`.
 *
 * Accessibility:
 *
 *   - Container is `role="alertdialog"` with `aria-modal="true"` and
 *     `aria-labelledby`/`aria-describedby` so screen readers announce the
 *     blocking dialog (Requirement 11.6).
 *   - The retry button receives keyboard focus on mount so users can
 *     immediately activate it. A dedicated focus trap is not necessary
 *     because the gate owns a single focusable control and the rest of the
 *     viewport is content-blocked.
 *
 * Dependencies:
 *
 *   - `t()` from `@/lib/i18n` for all user-facing strings (Requirements
 *     24.1, 24.2): `state.error.title`, `font.multiLangRenderFailed`,
 *     `common.tryAgain`.
 */

import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { t } from '@/lib/i18n'

// Static placeholder used until AuroraBackground is wired through.
// TODO(task 5.1 / 13.x integration): replace with `<AuroraBackground />`.
const PLACEHOLDER_BACKGROUND_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'var(--bg-500)',
  zIndex: 'calc(var(--z-modal) - 1)',
  pointerEvents: 'none',
}

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--z-modal)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-6)',
  // Block interaction with the underlying page.
  pointerEvents: 'auto',
}

const CARD_STYLE: CSSProperties = {
  // `.glass` class supplies backdrop-blur, background alpha, border and
  // radius. Here we only define layout and spacing on top of the token.
  maxWidth: '480px',
  width: '100%',
  padding: 'var(--space-8)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-5)',
  textAlign: 'center',
}

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-lg)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--text-primary, var(--border-900))',
  lineHeight: 1.35,
}

const MESSAGE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-md)',
  fontWeight: 'var(--fw-regular)',
  color: 'var(--text-secondary, var(--border-700))',
  lineHeight: 1.6,
}

const BUTTON_STYLE: CSSProperties = {
  // Visual language consistent with DS v2 primary button (task 6.1). Kept
  // inline here so the gate does not depend on `<Button>` (which may not
  // yet exist when this file is first imported).
  alignSelf: 'center',
  minHeight: 'var(--space-11)', // 44px touch target — Req 11.8
  minWidth: 'var(--space-11)',
  paddingInline: 'var(--space-6)',
  paddingBlock: 'var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--bg-0)',
  backgroundColor: 'var(--accent-600)',
  cursor: 'pointer',
  transition: 'background-color var(--dur-fast) var(--ease-standard)',
}

export interface FontErrorStateProps {
  /**
   * Retry handler wired to the retry button. Typically re-runs the
   * detection gate (see `MultiLangFontGate`) but may also trigger a full
   * page reload.
   */
  onRetry?: () => void
  /**
   * Optional slot rendered instead of the default placeholder background.
   * Pass a pre-configured `<AuroraBackground />` here once task 5.1 ships.
   */
  backgroundSlot?: ReactNode
}

const TITLE_ID = 'font-error-state-title'
const MESSAGE_ID = 'font-error-state-message'

export function FontErrorState({
  onRetry,
  backgroundSlot,
}: FontErrorStateProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    // Move focus to the single actionable control so keyboard users can
    // recover immediately.
    buttonRef.current?.focus()
  }, [])

  return (
    <>
      {backgroundSlot ?? (
        <div
          aria-hidden="true"
          data-testid="font-error-bg-placeholder"
          style={PLACEHOLDER_BACKGROUND_STYLE}
        />
      )}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={MESSAGE_ID}
        data-testid="font-error-state"
        style={OVERLAY_STYLE}
      >
        <div className="glass" style={CARD_STYLE}>
          <h2 id={TITLE_ID} style={TITLE_STYLE}>
            {t('state.error.title')}
          </h2>
          <p id={MESSAGE_ID} style={MESSAGE_STYLE}>
            {t('font.multiLangRenderFailed')}
          </p>
          <button
            ref={buttonRef}
            type="button"
            onClick={onRetry}
            style={BUTTON_STYLE}
            data-testid="font-error-retry"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    </>
  )
}

export default FontErrorState
