/**
 * GlassPanel — DS v2 glass-surface panel primitive.
 *
 * Shares the same visual contract and CursorGlow slot semantics as
 * GlassCard (see `Card.tsx`). Semantically distinct so call sites can
 * differentiate "card" (content unit, usually in a grid) from "panel"
 * (container / section wrapper) while reusing the same `.glass` class
 * tokens from `src/app/globals.css`.
 *
 * Requirements: 3.4, 3.5, 10.4, 22.1
 */

import * as React from 'react'
import CursorGlow from '@/components/effects/CursorGlow'

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * When `true`, mounts a <CursorGlow /> as an absolutely-positioned slot
   * inside the panel. The glow layer is auto-disabled on coarse-pointer
   * viewports and when the user prefers reduced motion.
   * @default false
   */
  cursorGlow?: boolean
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel({ cursorGlow = false, className, children, ...rest }, ref) {
    const mergedClassName = className ? `glass ${className}` : 'glass'
    return (
      <div ref={ref} {...rest} className={mergedClassName}>
        {cursorGlow ? <CursorGlow /> : null}
        {children}
      </div>
    )
  }
)

export default GlassPanel
