/**
 * GlassCard — DS v2 glass-surface card primitive.
 *
 * Visual contract lives entirely in the `.glass` class defined in
 * `src/app/globals.css` (Requirements 3.4, 3.5):
 *   - `backdrop-filter: blur(var(--glass-blur))`, range 12–24px
 *   - background alpha in range 0.4–0.7 via `--glass-bg-alpha`
 *   - 1px border with alpha in range 0.06–0.12 via `--glass-border-alpha`
 *   - `position: relative` and `overflow: hidden` so absolutely-positioned
 *     slot children (e.g. CursorGlow) stay clipped to the card's radius
 *
 * CursorGlow slot (Requirement 10.4):
 *   When `cursorGlow` is `true`, a <CursorGlow /> is mounted as the first
 *   child. CursorGlow itself returns `null` on Viewport_Mobile/Tablet and
 *   when `Reduced_Motion_Flag = true` (Requirements 10.5, 10.9), so enabling
 *   the slot is safe on every viewport — the gating happens inside the
 *   effect component, not here.
 *
 * Requirements: 3.4, 3.5, 10.4, 22.1
 */

import * as React from 'react'
import CursorGlow from '@/components/effects/CursorGlow'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * When `true`, mounts a <CursorGlow /> as an absolutely-positioned slot
   * inside the card. The glow layer is auto-disabled on coarse-pointer
   * viewports and when the user prefers reduced motion.
   * @default false
   */
  cursorGlow?: boolean
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ cursorGlow = false, className, children, ...rest }, ref) {
    const mergedClassName = className ? `glass ${className}` : 'glass'
    return (
      <div ref={ref} {...rest} className={mergedClassName}>
        {cursorGlow ? <CursorGlow /> : null}
        {children}
      </div>
    )
  }
)

export default GlassCard
