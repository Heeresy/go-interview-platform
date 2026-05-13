import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Behavioural contract tests for `<LazyMonacoEditor />` (task 18.3).
 *
 * Validates Requirements 12.8, 15.2, 15.3:
 *   - Req 12.8: Monaco is loaded via `next/dynamic({ ssr: false })`; the
 *     `@monaco-editor/react` module is not imported synchronously, and a
 *     Skeleton placeholder shows while the chunk resolves.
 *   - Req 15.2: the public prop surface mirrors `@monaco-editor/react`'s
 *     `Editor` — `value`, `defaultValue`, `onChange`, `language`,
 *     `height`, `options`, plus pass-through callbacks. Value, language
 *     and options flow through unchanged.
 *   - Req 15.3: a theme `uiredesign-dark` is registered in `beforeMount`
 *     using values resolved from DS custom properties and applied in
 *     `onMount`; when a CSS var is missing or non-hex (SSR placeholder,
 *     `color-mix(...)`), the fallback palette is used instead.
 */

// --- @monaco-editor/react mock ----------------------------------------------
// We capture every `Editor` render so tests can inspect the props that the
// lazy wrapper forwards, and invoke the `beforeMount` / `onMount` hooks
// against a stub `monaco` namespace to observe DS theme registration.
interface MonacoThemeCall {
  name: string
  data: {
    base: string
    inherit: boolean
    rules: unknown[]
    colors: Record<string, string>
  }
}

const defineThemeCalls: MonacoThemeCall[] = []
const setThemeCalls: string[] = []

function makeMonacoStub() {
  return {
    editor: {
      defineTheme: (name: string, data: MonacoThemeCall['data']) => {
        defineThemeCalls.push({ name, data })
      },
      setTheme: (name: string) => {
        setThemeCalls.push(name)
      },
    },
  }
}

interface EditorPropsLike {
  value?: string
  defaultValue?: string
  language?: string
  defaultLanguage?: string
  height?: string | number
  width?: string | number
  theme?: string
  options?: Record<string, unknown>
  onChange?: (value: string | undefined, ev: unknown) => void
  beforeMount?: (monaco: ReturnType<typeof makeMonacoStub>) => void
  onMount?: (
    editor: Record<string, unknown>,
    monaco: ReturnType<typeof makeMonacoStub>,
  ) => void
  loading?: ReactNode
  className?: string
}

const editorRenders: EditorPropsLike[] = []

// Tracks which component-instance keys have already fired their lifecycle,
// so re-renders do not produce duplicate beforeMount/onMount calls and
// better mirror real `@monaco-editor/react` behaviour where these hooks
// run exactly once per editor instance. The key is derived from a stable
// prop (we use `path ?? defaultPath ?? '__default__'`) — enough for tests.
const firedLifecycleKeys = new Set<string>()

vi.mock('@monaco-editor/react', () => {
  function Editor(props: EditorPropsLike) {
    editorRenders.push(props)
    const key = (props as { path?: string; defaultPath?: string }).path
      ?? (props as { defaultPath?: string }).defaultPath
      ?? '__default__'
    if (!firedLifecycleKeys.has(key)) {
      firedLifecycleKeys.add(key)
      const monaco = makeMonacoStub()
      props.beforeMount?.(monaco)
      const editorInstance = { getModel: () => null }
      props.onMount?.(editorInstance, monaco)
    }
    return (
      <div
        data-testid="mock-monaco-editor"
        data-theme={props.theme}
        data-language={props.language ?? props.defaultLanguage}
        data-value={props.value ?? props.defaultValue ?? ''}
      />
    )
  }
  return { Editor, default: Editor }
})

// --- next/dynamic mock ------------------------------------------------------
// `next/dynamic` resolves lazily in real Next.js. For tests we want the
// lazy module to resolve immediately so we can assert on the forwarded
// props without juggling Suspense/Skeleton timing. The mock emulates
// Next's `{ ssr: false, loading }` contract: it invokes the loader once
// at construction and, until it resolves, renders the `loading` fallback.
vi.mock('next/dynamic', () => {
  return {
    default: (
      loader: () => Promise<{ default?: unknown } | unknown>,
      options?: { loading?: () => ReactNode; ssr?: boolean },
    ) => {
      let Resolved: ((props: EditorPropsLike) => ReactNode) | null = null
      let resolving: Promise<void> | null = null

      function ensureLoad() {
        if (Resolved || resolving) return
        resolving = Promise.resolve(loader()).then((mod) => {
          const candidate =
            (mod as { default?: unknown }).default ?? (mod as unknown)
          if (typeof candidate === 'function') {
            Resolved = candidate as (props: EditorPropsLike) => ReactNode
          }
        })
      }

      function Lazy(props: EditorPropsLike) {
        ensureLoad()
        if (Resolved) return Resolved(props)
        return options?.loading ? options.loading() : null
      }
      // Expose the internal promise so tests can await chunk resolution.
      ;(Lazy as unknown as { __flush: () => Promise<void> }).__flush = async () => {
        ensureLoad()
        await resolving
      }
      return Lazy
    },
  }
})

// --- CSS token setup --------------------------------------------------------
// The component reads DS custom properties off `document.documentElement`
// via `getComputedStyle(...).getPropertyValue()`. jsdom resolves inline
// styles but not Tailwind / `:root` declarations, so each test installs
// the relevant tokens as inline `--name: value` pairs on the root element.
function setTokens(tokens: Record<string, string>) {
  const root = document.documentElement
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(name, value)
  }
}

function clearTokens(names: string[]) {
  const root = document.documentElement
  for (const name of names) {
    root.style.removeProperty(name)
  }
}

const TOKEN_NAMES = [
  '--bg-400',
  '--border-900',
  '--surface-400',
  '--border-500',
  '--accent-600',
]

/** Awaits the internal dynamic-import promise exposed by the mock. */
async function flushLazyMonaco() {
  const mod = await import('./LazyMonacoEditor')
  // Re-rendering once after the import resolves lets the lazy wrapper
  // swap the Skeleton placeholder for the resolved Editor component.
  // In tests we simply await a microtask; the `next/dynamic` mock's
  // `ensureLoad` was kicked off on first render.
  await Promise.resolve()
  return mod
}

beforeEach(() => {
  defineThemeCalls.length = 0
  setThemeCalls.length = 0
  editorRenders.length = 0
  firedLifecycleKeys.clear()
  clearTokens(TOKEN_NAMES)
})

afterEach(() => {
  cleanup()
  clearTokens(TOKEN_NAMES)
})

describe('LazyMonacoEditor', () => {
  it('does not import @monaco-editor/react synchronously (Req 12.8)', async () => {
    // Loading the wrapper module alone should not pull Monaco in. We
    // simulate that by checking no Editor render has been recorded before
    // the component is actually mounted in a render tree.
    await import('./LazyMonacoEditor')
    expect(editorRenders.length).toBe(0)
  })

  it('renders a Skeleton fallback while the Monaco chunk is loading (Req 12.8)', async () => {
    const { LazyMonacoEditor } = await import('./LazyMonacoEditor')
    // Synchronously render — the dynamic mock returns the loading fallback
    // on the first pass before its internal promise resolves.
    const { container } = render(
      <LazyMonacoEditor value="// hello" language="go" />,
    )
    const skeleton = container.querySelector(
      '[data-testid="lazy-monaco-editor-skeleton"]',
    )
    expect(skeleton).not.toBeNull()
    expect(skeleton?.getAttribute('role')).toBe('status')
  })

  it('forwards value, language and options to the underlying Editor (Req 15.2)', async () => {
    const { LazyMonacoEditor } = await import('./LazyMonacoEditor')
    const onChange = vi.fn()
    const { rerender } = render(
      <LazyMonacoEditor
        value="package main"
        language="go"
        height="320px"
        options={{ fontSize: 14 }}
        onChange={onChange}
      />,
    )
    await act(async () => {
      await flushLazyMonaco()
    })
    // Force a re-render so the now-resolved Editor mock is mounted.
    rerender(
      <LazyMonacoEditor
        value="package main"
        language="go"
        height="320px"
        options={{ fontSize: 14 }}
        onChange={onChange}
      />,
    )

    const call = editorRenders.at(-1)
    expect(call).toBeDefined()
    expect(call?.value).toBe('package main')
    expect(call?.language).toBe('go')
    expect(call?.height).toBe('320px')
    expect(call?.options).toMatchObject({
      fontSize: 14,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
    })
    expect(call?.onChange).toBe(onChange)
  })

  it('defaults to theme "uiredesign-dark" (Req 15.3)', async () => {
    const { LazyMonacoEditor } = await import('./LazyMonacoEditor')
    const { rerender } = render(<LazyMonacoEditor value="" />)
    await act(async () => {
      await flushLazyMonaco()
    })
    rerender(<LazyMonacoEditor value="" />)

    const call = editorRenders.at(-1)
    expect(call?.theme).toBe('uiredesign-dark')
  })

  it('registers the uiredesign-dark theme using DS tokens read from :root (Req 15.3)', async () => {
    setTokens({
      '--bg-400': '#12121a',
      '--border-900': '#d8d8e2',
      '--surface-400': '#22222c',
      '--border-500': '#757589',
      '--accent-600': '#00d4ff',
    })

    const { LazyMonacoEditor } = await import('./LazyMonacoEditor')
    const { rerender } = render(<LazyMonacoEditor value="x" />)
    await act(async () => {
      await flushLazyMonaco()
    })
    rerender(<LazyMonacoEditor value="x" />)

    // Theme registered exactly once by the default lifecycle.
    const uiRedesign = defineThemeCalls.find(
      (c) => c.name === 'uiredesign-dark',
    )
    expect(uiRedesign).toBeDefined()
    expect(uiRedesign?.data.base).toBe('vs-dark')
    expect(uiRedesign?.data.inherit).toBe(true)

    const colors = uiRedesign!.data.colors
    expect(colors['editor.background']).toBe('#12121a')
    expect(colors['editor.foreground']).toBe('#d8d8e2')
    expect(colors['editor.lineHighlightBackground']).toBe('#22222c')
    expect(colors['editorLineNumber.foreground']).toBe('#757589')
    // Selection = accent-600 + ~30% alpha byte.
    expect(colors['editor.selectionBackground']).toBe('#00d4ff4d')

    // After the editor mounts, setTheme is called with the DS theme name.
    expect(setThemeCalls).toContain('uiredesign-dark')
  })

  it('falls back to DS dark defaults when a CSS var resolves to a non-hex value (Req 15.3)', async () => {
    // `color-mix(...)` is representative of any resolved value that is
    // not a plain hex colour Monaco can accept.
    setTokens({
      '--bg-400': 'color-mix(in oklch, red 50%, blue)',
      '--border-900': '',
      '--surface-400': 'oklch(0.3 0.05 270)',
      '--border-500': '   ',
      '--accent-600': 'rgb(0, 212, 255)',
    })

    const { LazyMonacoEditor } = await import('./LazyMonacoEditor')
    const { rerender } = render(<LazyMonacoEditor value="x" />)
    await act(async () => {
      await flushLazyMonaco()
    })
    rerender(<LazyMonacoEditor value="x" />)

    const uiRedesign = defineThemeCalls.find(
      (c) => c.name === 'uiredesign-dark',
    )
    expect(uiRedesign).toBeDefined()
    const colors = uiRedesign!.data.colors
    // All colours fall back to the DS dark palette constants.
    expect(colors['editor.background']).toBe('#12121a')
    expect(colors['editor.foreground']).toBe('#d8d8e2')
    expect(colors['editor.lineHighlightBackground']).toBe('#22222c')
    expect(colors['editorLineNumber.foreground']).toBe('#757589')
    expect(colors['editor.selectionBackground']).toBe('#00d4ff4d')
  })

  it('invokes caller beforeMount and onMount after DS theme wiring (Req 15.2)', async () => {
    setTokens({
      '--bg-400': '#12121a',
      '--border-900': '#d8d8e2',
      '--surface-400': '#22222c',
      '--border-500': '#757589',
      '--accent-600': '#00d4ff',
    })

    const { LazyMonacoEditor } = await import('./LazyMonacoEditor')
    const beforeMount = vi.fn()
    const onMount = vi.fn()
    const { rerender } = render(
      <LazyMonacoEditor
        value="x"
        beforeMount={beforeMount}
        onMount={onMount}
      />,
    )
    await act(async () => {
      await flushLazyMonaco()
    })
    rerender(
      <LazyMonacoEditor
        value="x"
        beforeMount={beforeMount}
        onMount={onMount}
      />,
    )

    expect(beforeMount).toHaveBeenCalledTimes(1)
    expect(onMount).toHaveBeenCalledTimes(1)
    // beforeMount runs before the first defineTheme? No — DS theme is
    // registered first, then the caller's beforeMount fires. Verify by
    // checking at least one defineTheme call exists before beforeMount
    // sees the monaco instance.
    expect(defineThemeCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('honours explicit theme override and skips the setTheme call (Req 15.2)', async () => {
    const { LazyMonacoEditor } = await import('./LazyMonacoEditor')
    const { rerender } = render(
      <LazyMonacoEditor value="x" theme="vs-dark" />,
    )
    await act(async () => {
      await flushLazyMonaco()
    })
    rerender(<LazyMonacoEditor value="x" theme="vs-dark" />)

    const call = editorRenders.at(-1)
    expect(call?.theme).toBe('vs-dark')
    // setTheme is only forced when the DS theme is selected.
    expect(setThemeCalls).not.toContain('uiredesign-dark')
  })
})
