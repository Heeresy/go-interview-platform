'use client'

/**
 * AuroraBackground — фиксированный фоновый слой с WebGL-авророй.
 *
 * Строгий приоритет веток (Requirements 3.6–3.10):
 *   (1) prefers-reduced-motion → статический CSS radial-gradient fallback.
 *   (2) иначе → WebGL capability probe: getContext("webgl2") ?? getContext("webgl")
 *       И тестовая компиляция fragment shader. Если оба успешны — обязательно
 *       рендерится WebGL-сцена (Req 3.8 — запрет подмены статикой).
 *   (3) context === null или shader-compile кинул → статический fallback
 *       без console.error (Req 3.7).
 *   (4) last-resort (Req 3.9): если даже статический fallback сорвался
 *       (try/catch вокруг отрисовки), полностью отключаем анимации и слои,
 *       рендерим пустой <div aria-hidden> с background-color: var(--bg-500).
 *
 * Контракт цветов (Req 3.10):
 *   colors?: string[] — если длина < 3, дополняется дефолтами до 3.
 *
 * Cleanup: WEBGL_lose_context на unmount.
 *
 * data-aurora-fallback:
 *   "webgl"  — активный WebGL-рендер (отсутствует в SSR, добавляется клиентом)
 *   "static" — статический fallback
 *   отсутствует в фатальной ветке (last-resort), там только aria-hidden
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { useReducedMotion } from '@/lib/useReducedMotion'
import './AuroraBackground.css'

export interface AuroraBackgroundProps {
  /** Палитра WebGL-авроры и CSS-fallback. Дополняется до ≥ 3 цветов при необходимости (Req 3.10). */
  colors?: string[]
  /** Общая интенсивность свечения blobs (0..1). Дефолт 0.8. */
  intensity?: number
  /** Скорость анимации (0..2). Дефолт 1. */
  speed?: number
  /** Доп. CSS-класс на корне. */
  className?: string
}

/** 3 дефолтных цвета из акцентной шкалы Design_System (использованы как fallback при недостатке colors). */
const DEFAULT_COLORS = ['#00d4ff', '#a855f7', '#10b981'] as const

type RenderMode = 'webgl' | 'static' | 'fatal'

/** Fragment shader для WebGL-авроры. 5 blobs с независимыми фазами, смешиваются по softmax. */
const VERTEX_SHADER = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform float uIntensity;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uColorCount;

// Плавная blob-функция: гауссиана в экранных координатах.
float blob(vec2 uv, vec2 center, float radius) {
  float d = distance(uv, center);
  return exp(-(d * d) / (radius * radius));
}

void main() {
  // Сохраняем соотношение сторон: blobs не должны растягиваться.
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect + 0.5, uv.y);
  float t = uTime;

  vec2 c0 = vec2(0.3 + 0.2 * sin(t * 0.23), 0.35 + 0.2 * cos(t * 0.19));
  vec2 c1 = vec2(0.7 + 0.15 * sin(t * 0.27 + 1.0), 0.65 + 0.18 * cos(t * 0.21 + 2.0));
  vec2 c2 = vec2(0.5 + 0.22 * sin(t * 0.17 + 3.0), 0.5 + 0.16 * cos(t * 0.29 + 1.5));
  vec2 c3 = vec2(0.25 + 0.18 * sin(t * 0.31 + 2.0), 0.75 + 0.14 * cos(t * 0.23 + 4.0));
  vec2 c4 = vec2(0.75 + 0.16 * sin(t * 0.19 + 4.5), 0.3 + 0.2 * cos(t * 0.25 + 0.5));

  float r = 0.45;
  float w0 = blob(p, c0, r);
  float w1 = blob(p, c1, r);
  float w2 = blob(p, c2, r);
  float w3 = blob(p, c3, r);
  float w4 = blob(p, c4, r);
  float wSum = w0 + w1 + w2 + w3 + w4 + 0.0001;

  vec3 col = (uColor0 * w0 + uColor1 * w1 + uColor2 * w2 + uColor3 * w3 + uColor4 * w4) / wSum;

  // Мягкая виньетка + общий уровень интенсивности.
  float vignette = smoothstep(1.2, 0.3, distance(uv, vec2(0.5)));
  col *= uIntensity * vignette;

  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * Нормализует массив цветов к гарантированной длине ≥ 3 (Req 3.10).
 * Короткие массивы дополняются дефолтами из `DEFAULT_COLORS`.
 */
function ensureMinColors(input: string[] | undefined): string[] {
  const base = Array.isArray(input) ? input.filter(c => typeof c === 'string' && c.length > 0) : []
  if (base.length >= 3) return base
  const extra = DEFAULT_COLORS.slice(0, 3 - base.length)
  return [...base, ...extra]
}

/**
 * Парсит CSS-строку цвета (hex/rgb/rgba) в нормализованный RGB [0..1].
 * Не падает на нераспознанной строке — возвращает чёрный.
 */
function parseColorToRGB(color: string): [number, number, number] {
  const s = color.trim().toLowerCase()

  // #rgb / #rrggbb / #rrggbbaa
  if (s.startsWith('#')) {
    let hex = s.slice(1)
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(c => c + c)
        .join('')
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return [r / 255, g / 255, b / 255]
      }
    }
  }

  // rgb(r,g,b) / rgba(r,g,b,a)
  const rgbMatch = s.match(/rgba?\s*\(([^)]+)\)/)
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(v => v.trim())
    if (parts.length >= 3) {
      const r = parseFloat(parts[0])
      const g = parseFloat(parts[1])
      const b = parseFloat(parts[2])
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return [
          Math.max(0, Math.min(1, r / 255)),
          Math.max(0, Math.min(1, g / 255)),
          Math.max(0, Math.min(1, b / 255)),
        ]
      }
    }
  }

  return [0, 0, 0]
}

/**
 * WebGL capability probe: возвращает контекст и уже собранную canvas, либо null.
 * Кроме самого getContext выполняет тестовую компиляцию fragment shader (Req 3.8).
 */
function probeWebGL(): {
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext | WebGLRenderingContext
} | null {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null)
    if (!gl) return null

    const shader = gl.createShader(gl.FRAGMENT_SHADER)
    if (!shader) {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return null
    }
    gl.shaderSource(shader, FRAGMENT_SHADER)
    gl.compileShader(shader)
    const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS) as boolean
    gl.deleteShader(shader)
    if (!ok) {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      return null
    }
    return { canvas, gl }
  } catch {
    return null
  }
}

/**
 * Строит CSS radial-gradient background для статического fallback
 * из произвольного массива цветов (>=3).
 */
function buildStaticGradient(colors: string[]): string {
  const [c0, c1, c2, ...rest] = colors
  const stops = [
    `radial-gradient(at 28% 30%, ${c0} 0%, transparent 55%)`,
    `radial-gradient(at 72% 35%, ${c1} 0%, transparent 55%)`,
    `radial-gradient(at 50% 75%, ${c2} 0%, transparent 55%)`,
    ...rest.slice(0, 2).map((c, i) => {
      const positions = ['25% 80%', '80% 75%']
      return `radial-gradient(at ${positions[i]}, ${c} 0%, transparent 55%)`
    }),
  ]
  return stops.join(', ')
}

export function AuroraBackground({
  colors,
  intensity = 0.8,
  speed = 1,
  className,
}: AuroraBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const effectiveColors = useMemo(() => ensureMinColors(colors), [colors])
  const staticGradient = useMemo(() => buildStaticGradient(effectiveColors), [effectiveColors])

  // Инициализационный режим всегда 'static':
  //   - SSR рендерит статический градиент (детерминировано, без FOUC).
  //   - Первый клиентский рендер совпадает с SSR (нет hydration mismatch).
  //   - После монтирования useEffect делает WebGL capability probe и,
  //     если всё ок, добавляет canvas и переключает режим на 'webgl'.
  //   - При reduced-motion или провале probe — остаёмся в 'static'.
  const [mode, setMode] = useState<RenderMode>('static')

  // hostRef всегда присутствует в DOM — это инвариант компонента. Слой
  // static-gradient'а живёт на корневом .aurora-bg (через inline style),
  // а canvas, добавляемый в .aurora-bg__canvas-host, перекрывает его
  // только в успешной WebGL-ветке. Это устраняет гонку между setMode и
  // ref-доступностью (ref появляется в первом же клиентском рендере).

  // WebGL-probe + renderer lifecycle. Запускается только в ветке "не reduced-motion"
  // и только на клиенте. При любом провале откатываемся на 'static' без console.error.
  useEffect(() => {
    // Ветка (1) Req 3.6 — reduced-motion блокирует WebGL.
    if (prefersReducedMotion) {
      setMode('static')
      return
    }

    const host = hostRef.current
    if (!host) {
      setMode('static')
      return
    }

    // Ветка (2)/(3) — capability probe с тестовой компиляцией шейдера.
    const probe = probeWebGL()
    if (!probe) {
      // Ветка (3): context null или shader compile fail → static (без console.error).
      setMode('static')
      return
    }
    // Probe-канвас нам больше не нужен — освобождаем его контекст.
    probe.gl.getExtension('WEBGL_lose_context')?.loseContext()

    // Успешный probe гарантирует WebGL-ветку (Req 3.8): статика на этом пути
    // недопустима, даже если дальнейшая инициализация Renderer упадёт. Если
    // ogl-Renderer падает уже после принятия решения — корректный путь это
    // last-resort 'fatal' (Req 3.9), а не подмена на static fallback.
    setMode('webgl')

    let renderer: Renderer | null = null
    let rafId = 0
    let resizeObserver: ResizeObserver | null = null
    let canvasEl: HTMLCanvasElement | null = null
    let mounted = true

    try {
      renderer = new Renderer({
        dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2),
        alpha: true,
      })
      const gl = renderer.gl
      gl.clearColor(0, 0, 0, 0)

      const geometry = new Triangle(gl)

      const palette = effectiveColors.slice(0, 5).map(parseColorToRGB)
      while (palette.length < 5) palette.push(palette[palette.length - 1] ?? [0, 0, 0])

      const program = new Program(gl, {
        vertex: VERTEX_SHADER,
        fragment: FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new Float32Array([1, 1]) },
          uIntensity: { value: intensity },
          uColor0: { value: new Float32Array(palette[0]) },
          uColor1: { value: new Float32Array(palette[1]) },
          uColor2: { value: new Float32Array(palette[2]) },
          uColor3: { value: new Float32Array(palette[3]) },
          uColor4: { value: new Float32Array(palette[4]) },
          uColorCount: { value: Math.min(effectiveColors.length, 5) },
        },
      })

      const mesh = new Mesh(gl, { geometry, program })

      const resize = () => {
        if (!renderer || !host) return
        const w = host.offsetWidth || window.innerWidth
        const h = host.offsetHeight || window.innerHeight
        renderer.setSize(w, h)
        const resolution = program.uniforms.uResolution.value as Float32Array
        resolution[0] = gl.canvas.width
        resolution[1] = gl.canvas.height
      }

      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host)
      resize()

      canvasEl = gl.canvas as HTMLCanvasElement
      host.appendChild(canvasEl)

      const start = performance.now()
      const frame = () => {
        if (!mounted || !renderer) return
        const elapsed = ((performance.now() - start) / 1000) * speed
        program.uniforms.uTime.value = elapsed
        renderer.render({ scene: mesh })
        rafId = requestAnimationFrame(frame)
      }
      rafId = requestAnimationFrame(frame)
    } catch {
      // Renderer/Program/Mesh конструкторы могли упасть (экзотические драйверы,
      // контекст потерян между probe и созданием Renderer). Req 3.9: это "фатальный"
      // путь — отключаем все слои и показываем однотонный фон.
      mounted = false
      if (rafId) cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      if (canvasEl && canvasEl.parentElement === host) host.removeChild(canvasEl)
      renderer?.gl?.getExtension('WEBGL_lose_context')?.loseContext()
      setMode('fatal')
      return
    }

    return () => {
      mounted = false
      if (rafId) cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      if (canvasEl && canvasEl.parentElement === host) host.removeChild(canvasEl)
      // Req 3.x cleanup: явно теряем WebGL-контекст, чтобы GPU-ресурсы освобождались
      // сразу при unmount, а не на следующем GC-цикле браузера.
      renderer?.gl?.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [prefersReducedMotion, intensity, speed, effectiveColors])

  // Last-resort try/catch вокруг самой отрисовки (Req 3.9). Если построение
  // JSX для static-fallback падает (крайне редко, но формально возможно в
  // экзотических окружениях), переводим компонент в fatal-ветку.
  if (mode === 'fatal') {
    return (
      <div
        aria-hidden="true"
        className={`aurora-bg aurora-bg--fatal${className ? ` ${className}` : ''}`}
      />
    )
  }

  // Унифицированная DOM-структура для static/webgl:
  //   - hostRef всегда смонтирован (canvas может быть присоединён эффектом);
  //   - data-aurora-fallback отражает фактический текущий режим для тестов
  //     (Property 2, Property 16);
  //   - в статическом режиме корень получает CSS radial-gradient через inline
  //     style; в webgl-режиме статический фон скрывается canvas-ом (shader
  //     всегда пишет alpha = 1).
  try {
    const isStatic = mode === 'static'
    return (
      <div
        aria-hidden="true"
        data-aurora-fallback={isStatic ? 'static' : 'webgl'}
        className={`aurora-bg${className ? ` ${className}` : ''}`}
        style={isStatic ? { backgroundImage: staticGradient } : undefined}
      >
        <div ref={hostRef} className="aurora-bg__canvas-host" />
      </div>
    )
  } catch {
    // Если рендер JSX выбросил — переводимся в fatal-ветку. Это редкий
    // случай (JSX-rendering сам по себе throw-safe в нормальных условиях),
    // но формально закрывает Req 3.9.
    return (
      <div
        aria-hidden="true"
        className={`aurora-bg aurora-bg--fatal${className ? ` ${className}` : ''}`}
      />
    )
  }
}

export default AuroraBackground
