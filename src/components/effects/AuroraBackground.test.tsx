/**
 * Unit tests for AuroraBackground.
 *
 * Покрывает:
 * - SSR/initial render — статический fallback на первом клиентском рендере.
 * - reduced-motion — остаётся в 'static', `data-aurora-fallback="static"` (Req 3.6).
 * - WebGL capability probe проходит → переключение на `data-aurora-fallback="webgl"` (Req 3.8).
 * - Контракт colors: если < 3, дополняется до 3 (Req 3.10).
 * - Unmount вызывает `loseContext()` на WebGL-расширении.
 */

import { render, cleanup, act } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// jsdom не предоставляет ResizeObserver — компонент использует его для
// реакции на изменение размера canvas-хоста.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
  }
})

// Мокаем ogl до импорта компонента, чтобы избежать реального WebGL в jsdom.
// Реальный jsdom не предоставляет WebGL, но мы отдельно контролируем probe.
const oglMocks = vi.hoisted(() => {
  const loseContext = vi.fn()
  const getExtension = vi.fn(() => ({ loseContext }))
  // Канвас создаём лениво в конструкторе Renderer — на момент vi.hoisted
  // jsdom ещё может быть не полностью инициализирован, а нам нужен
  // свежий canvas на каждый инстанс Renderer.
  return {
    loseContext,
    getExtension,
    Renderer: vi.fn().mockImplementation(function () {
      const canvas = document.createElement('canvas')
      return {
        gl: {
          canvas,
          clearColor: vi.fn(),
          getExtension,
        },
        setSize: vi.fn(),
        render: vi.fn(),
      }
    }),
    Program: vi.fn().mockImplementation(function () {
      return {
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new Float32Array([1, 1]) },
          uIntensity: { value: 0.8 },
          uColor0: { value: new Float32Array([0, 0, 0]) },
          uColor1: { value: new Float32Array([0, 0, 0]) },
          uColor2: { value: new Float32Array([0, 0, 0]) },
          uColor3: { value: new Float32Array([0, 0, 0]) },
          uColor4: { value: new Float32Array([0, 0, 0]) },
          uColorCount: { value: 3 },
        },
      }
    }),
    Triangle: vi.fn().mockImplementation(function () {
      return {}
    }),
    Mesh: vi.fn().mockImplementation(function () {
      return {}
    }),
  }
})

vi.mock('ogl', () => ({
  Renderer: oglMocks.Renderer,
  Program: oglMocks.Program,
  Triangle: oglMocks.Triangle,
  Mesh: oglMocks.Mesh,
}))

import { AuroraBackground } from './AuroraBackground'

// Утилита: имитирует успешный WebGL probe (getContext возвращает объект,
// compileShader + getShaderParameter возвращают true).
function mockSuccessfulWebGL() {
  const loseContext = vi.fn()
  const fakeGl: Partial<WebGLRenderingContext> & {
    FRAGMENT_SHADER: number
    COMPILE_STATUS: number
  } = {
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    createShader: vi.fn(() => ({}) as WebGLShader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    getExtension: vi.fn(() => ({ loseContext })),
  }
  const spy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === 'webgl2' || contextId === 'webgl') {
        return fakeGl as unknown as WebGL2RenderingContext
      }
      return null
    } as typeof HTMLCanvasElement.prototype.getContext)
  return { spy, loseContext }
}

// Утилита: имитирует провалившийся WebGL probe (getContext → null).
function mockFailedWebGL() {
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => null as unknown as RenderingContext)
}

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('AuroraBackground', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    oglMocks.Renderer.mockClear()
    oglMocks.Program.mockClear()
    oglMocks.Triangle.mockClear()
    oglMocks.Mesh.mockClear()
    oglMocks.loseContext.mockClear()
    oglMocks.getExtension.mockClear()
    // default: no reduced-motion
    mockReducedMotion(false)
  })

  it('изначально рендерит статический fallback (SSR-safe первый рендер)', () => {
    const { container } = render(<AuroraBackground />)
    const root = container.querySelector('.aurora-bg')
    expect(root).toBeTruthy()
  })

  it('при prefers-reduced-motion = true остаётся в static-fallback (Req 3.6)', async () => {
    mockReducedMotion(true)
    const probeSpy = mockSuccessfulWebGL()
    const { container } = render(<AuroraBackground />)
    // Эффект синхронно вызывается после коммита; обеспечиваем его выполнение.
    await act(async () => {})
    const root = container.querySelector('.aurora-bg') as HTMLElement
    expect(root.getAttribute('data-aurora-fallback')).toBe('static')
    // getContext не должен вызываться в reduced-motion ветке вообще.
    expect(probeSpy.spy).not.toHaveBeenCalled()
  })

  it('при успешном WebGL probe переключается на webgl (Req 3.8)', async () => {
    mockReducedMotion(false)
    const { loseContext: probeLose } = mockSuccessfulWebGL()
    const { container } = render(<AuroraBackground />)
    await act(async () => {})
    const root = container.querySelector('.aurora-bg') as HTMLElement
    expect(root.getAttribute('data-aurora-fallback')).toBe('webgl')
    // Probe-канвас должен быть освобождён.
    expect(probeLose).toHaveBeenCalled()
    // Renderer (из ogl) создан один раз.
    expect(oglMocks.Renderer).toHaveBeenCalledTimes(1)
  })

  it('при getContext === null остаётся в static-fallback без console.error (Req 3.7)', async () => {
    mockReducedMotion(false)
    mockFailedWebGL()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(<AuroraBackground />)
    await act(async () => {})
    const root = container.querySelector('.aurora-bg') as HTMLElement
    expect(root.getAttribute('data-aurora-fallback')).toBe('static')
    expect(errorSpy).not.toHaveBeenCalled()
    // Renderer не должен был инстанциироваться.
    expect(oglMocks.Renderer).not.toHaveBeenCalled()
  })

  it('при length(colors) < 3 дополняет до 3 без исключений (Req 3.10)', () => {
    // Статик-ветка — достаточно для проверки, что компонент не падает на коротких массивах.
    mockReducedMotion(true)
    for (const colors of [[], ['#ff0000'], ['#ff0000', '#00ff00']]) {
      const { container, unmount } = render(<AuroraBackground colors={colors} />)
      const root = container.querySelector('.aurora-bg') as HTMLElement
      expect(root).toBeTruthy()
      // Inline background-image должен содержать как минимум 3 radial-gradient.
      const bg = (root.style.backgroundImage || '').match(/radial-gradient/g)
      expect(bg?.length ?? 0).toBeGreaterThanOrEqual(3)
      unmount()
    }
  })

  it('на unmount вызывает WEBGL_lose_context.loseContext() (WebGL-ветка)', async () => {
    mockReducedMotion(false)
    mockSuccessfulWebGL()
    const { unmount } = render(<AuroraBackground />)
    await act(async () => {})
    expect(oglMocks.Renderer).toHaveBeenCalledTimes(1)
    unmount()
    // ogl-Renderer.gl.getExtension("WEBGL_lose_context") должен быть вызван
    // на cleanup'е с последующим loseContext().
    expect(oglMocks.getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
    expect(oglMocks.loseContext).toHaveBeenCalled()
  })

  it('вход в static-ветку рендерит CSS radial-gradient из переданных цветов', () => {
    mockReducedMotion(true)
    const { container } = render(
      <AuroraBackground colors={['#112233', '#445566', '#778899']} />,
    )
    const root = container.querySelector('.aurora-bg') as HTMLElement
    const bg = root.style.backgroundImage
    // jsdom нормализует hex-цвета в rgb() форму; проверяем, что каждый из
    // переданных цветов присутствует в результирующем background-image.
    expect(bg).toContain('rgb(17, 34, 51)')
    expect(bg).toContain('rgb(68, 85, 102)')
    expect(bg).toContain('rgb(119, 136, 153)')
    // И гарантированно ≥ 3 radial-gradient stops (Req 3.10).
    const stops = bg.match(/radial-gradient/g)
    expect(stops?.length ?? 0).toBeGreaterThanOrEqual(3)
  })
})
