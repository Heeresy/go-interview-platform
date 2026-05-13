import type { CSSProperties } from 'react'

/**
 * NoiseOverlay — CSS-only cinematic noise layer.
 *
 * Spec: UI Redesign 2026 — task 5.3.
 *
 * - `position: fixed`, full-viewport cover (`inset: 0`).
 * - `pointer-events: none` and `aria-hidden` so it never intercepts input nor
 *   pollutes the accessibility tree.
 * - `opacity: var(--noise-opacity, 0.05)` — token defined in globals.css and
 *   clamped to the 0.03–0.08 range by Design_System.
 * - SVG turbulence (`feTurbulence baseFrequency="0.9" numOctaves="2"`)
 *   serialized as a `data:` URL in `background-image`. No runtime JS, no
 *   network request, no hydration cost.
 * - z-index: `calc(var(--z-bg) + 1)` — sits exactly one layer above
 *   AuroraBackground (`var(--z-bg)`), per task 8.1 composition.
 *
 * This component is a pure server-friendly render; it does not need
 * `"use client"` and can be mounted once in the root layout.
 *
 * Requirements: 3.3
 */

// Fractal noise SVG. `#` inside the fragment id must be percent-encoded (%23)
// so the data URL parses cleanly in every engine. The SVG is kept as a single
// line to avoid accidental whitespace in the encoded payload.
const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">' +
  '<filter id="n">' +
  '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/>' +
  '</filter>' +
  '<rect width="100%" height="100%" filter="url(%23n)"/>' +
  '</svg>'

// Encoded once at module scope so every render reuses the same string.
const NOISE_DATA_URL = `url("data:image/svg+xml;utf8,${NOISE_SVG
  .replace(/"/g, "'")
  .replace(/</g, '%3C')
  .replace(/>/g, '%3E')}")`

const STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 'calc(var(--z-bg) + 1)',
  opacity: 'var(--noise-opacity, 0.05)',
  backgroundImage: NOISE_DATA_URL,
  backgroundRepeat: 'repeat',
  backgroundSize: '240px 240px',
  // Force compositor layer — keeps the noise off the main painter on scroll.
  willChange: 'opacity',
}

export function NoiseOverlay() {
  return <div aria-hidden="true" data-testid="noise-overlay" style={STYLE} />
}

export default NoiseOverlay
