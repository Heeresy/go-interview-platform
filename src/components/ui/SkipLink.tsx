'use client'

/**
 * `<SkipLink />` — Design System v2 a11y primitive.
 *
 * Always present in the DOM as the **first focusable element**, wearing the
 * existing `.skip-link` class from `src/app/globals.css` (absolutely
 * positioned off-screen by default; slides into view when focused).
 *
 * Behaviour (Requirements 6.5, 10.8, 10.9, 11.5, 22.1):
 *
 * - `href="#main"` — `<main id="main">` is the RootLayout target.
 * - Text is pulled from the i18n dictionary via `t('a11y.skipToMain')`
 *   (Requirement 24.2 — no hardcoded strings).
 * - **Does not auto-focus on mount.** The component deliberately refrains
 *   from calling `ref.current.focus()` so that pointer-first users do not see
 *   the link flashing into view when they load the page.
 * - Registers a single `keydown` listener on `document`. Only the **first**
 *   event with `key === "Tab"` (or `code === "Tab"`) is interpreted as "the
 *   user just started keyboard navigation": at that point the component
 *   `preventDefault()`s the event and moves focus to itself. Any clicks or
 *   taps that happen before the first Tab do **not** trigger this path —
 *   they are ignored by the listener.
 * - As soon as the Tab-handler has fired once, it unsubscribes itself from
 *   `document`. Subsequent Tab presses follow the browser's normal focus
 *   order (no interference from the skip link).
 *
 * The underlying `.skip-link` CSS rule positions the anchor at `top: -100%`
 * by default and at `top: var(--space-4)` on `:focus`, so focusing it both
 * visually reveals it and allows the user to activate it with Enter.
 */

import { useEffect, useRef } from 'react'
import { t } from '@/lib/i18n'

export interface SkipLinkProps {
  /**
   * Target anchor. Must match the `id` of the `<main>` element in the root
   * layout. Defaults to `"#main"`, which is the RootLayout convention.
   */
  href?: string
}

export function SkipLink({ href = '#main' }: SkipLinkProps) {
  const linkRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    // SSR guard — `document` is only available in the browser.
    if (typeof document === 'undefined') return

    // Using a named handler so we can both refer to it inside the body (for
    // self-unsubscription) and pass the same reference to
    // `removeEventListener` from the cleanup function.
    const handleFirstTab = (event: KeyboardEvent) => {
      // "Признак начала клавиатурной навигации" per the task description:
      // we react strictly to the Tab key. Modifier keys (Shift, Meta, etc.)
      // are not relevant — Shift+Tab from a pristine page still means the
      // user is starting keyboard navigation.
      const isTab = event.key === 'Tab' || event.code === 'Tab'
      if (!isTab) return

      // Take over the very first Tab event: prevent the browser from
      // advancing through the natural tab order (which in most cases would
      // already land on this link, since it's first in the DOM — but being
      // explicit makes the behaviour deterministic regardless of what other
      // focusable elements the page may have injected above us).
      event.preventDefault()

      const link = linkRef.current
      if (link) {
        link.focus()
      }

      // Self-unsubscribe — after the handler has fired once, all subsequent
      // Tab events must follow normal browser focus order without any
      // interference from the skip link (per task description).
      document.removeEventListener('keydown', handleFirstTab, true)
    }

    // Capture phase so that this handler runs before any form / app-level
    // keyboard handler has a chance to stop propagation and starve us of
    // the first Tab event.
    document.addEventListener('keydown', handleFirstTab, true)

    return () => {
      // Defensive cleanup: if the component unmounts before the first Tab
      // ever fires, detach the listener cleanly.
      document.removeEventListener('keydown', handleFirstTab, true)
    }
  }, [])

  return (
    <a ref={linkRef} className="skip-link" href={href} data-ds="skip-link">
      {t('a11y.skipToMain')}
    </a>
  )
}

export default SkipLink
