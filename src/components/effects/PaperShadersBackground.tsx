'use client'

/**
 * `<PaperShadersBackground />` — animated WebGL background using
 * @react-three/fiber with custom vertex/fragment shaders.
 *
 * Creates flowing, organic color patterns via noise-based shaders.
 * Loaded dynamically to avoid SSR issues with Three.js.
 */

import dynamic from 'next/dynamic'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;

    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vec2 uv = vUv;

    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;

    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);

    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(glow, 2.0);

    gl_FragColor = vec4(color * glow, glow * 0.8);
  }
`

function ShaderPlane({
  position,
  color1 = '#1a3a5c',
  color2 = '#0a1628',
}: {
  position: [number, number, number]
  color1?: string
  color2?: string
}) {
  const mesh = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: 1.0 },
      color1: { value: new THREE.Color(color1) },
      color2: { value: new THREE.Color(color2) },
    }),
    [color1, color2],
  )

  useFrame((state) => {
    if (mesh.current) {
      uniforms.time.value = state.clock.elapsedTime * 0.5
      uniforms.intensity.value = 0.6 + Math.sin(state.clock.elapsedTime * 0.8) * 0.2
    }
  })

  return (
    <mesh ref={mesh} position={position}>
      <planeGeometry args={[4, 4, 32, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <ShaderPlane position={[-1.2, 0.5, 0]} color1="#1a3a6c" color2="#0d1b2a" />
      <ShaderPlane position={[1.0, -0.3, -0.5]} color1="#2a1a5c" color2="#0a0a28" />
      <ShaderPlane position={[0, 0, -1]} color1="#1a4a5c" color2="#081820" />
    </>
  )
}

function PaperShadersInner() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

// Dynamic import to avoid SSR issues with Three.js/WebGL
export const PaperShadersBackground = dynamic(
  () => Promise.resolve(PaperShadersInner),
  { ssr: false },
)

export default PaperShadersBackground
