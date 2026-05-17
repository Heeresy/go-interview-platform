'use client'

/**
 * `<PaperShadersBackground />` — animated WebGL background using
 * @paper-design/shaders-react MeshGradient.
 *
 * Renders a flowing animated mesh gradient with dark color palette.
 * Fixed positioning, behind all content, pointer-events disabled.
 */

import dynamic from 'next/dynamic'
import { MeshGradient } from '@paper-design/shaders-react'

function PaperShadersInner() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <MeshGradient
        className="w-full h-full"
        style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
        colors={['#000000', '#1a1a2e', '#16213e', '#0f3460']}
        speed={0.8}
      />

      {/* Subtle lighting overlays */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '33%',
          width: '8rem',
          height: '8rem',
          background: 'rgba(30, 40, 80, 0.05)',
          borderRadius: '50%',
          filter: 'blur(48px)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '33%',
          right: '25%',
          width: '6rem',
          height: '6rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '50%',
          filter: 'blur(32px)',
          animation: 'pulse 3s ease-in-out infinite 1s',
        }}
      />
    </div>
  )
}

export const PaperShadersBackground = dynamic(
  () => Promise.resolve(PaperShadersInner),
  { ssr: false },
)

export default PaperShadersBackground
