/**
 * Public API for the i18n UI module.
 *
 * Components in this directory implement Requirement 24 concerns that sit at
 * the presentation layer:
 *
 *   - `<FontErrorState />` — full-screen blocking fallback shown when a
 *     multi-language page cannot render Cyrillic and Latin glyphs in a
 *     unified font family (Requirement 24.4).
 *   - `<MultiLangFontGate />` — mount-time detection gate that wraps the
 *     children of a multi-language page and renders `<FontErrorState />` on
 *     detection failure (Requirements 24.3, 24.4).
 *
 * Strings and keys consumed by these components live in `src/lib/i18n/ru.ts`
 * (Requirements 24.1, 24.2).
 */

export { FontErrorState } from './FontErrorState'
export type { FontErrorStateProps } from './FontErrorState'
export { MultiLangFontGate } from './MultiLangFontGate'
export type { MultiLangFontGateProps } from './MultiLangFontGate'
