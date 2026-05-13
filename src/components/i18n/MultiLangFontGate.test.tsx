import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiLangFontGate } from './MultiLangFontGate'
import { t } from '@/lib/i18n'

interface FontsMock {
  readyResolve?: () => void
  check: ReturnType<typeof vi.fn>
  ready: Promise<void>
}

/**
 * Install a mock `document.fonts` that lets the test drive the
 * `ready` promise and control `check()` return values.
 */
function installFontsMock(options: {
  ready?: boolean
  check?: boolean | (() => boolean)
  throwOnCheck?: boolean
}): FontsMock {
  const readyPromise = new Promise<void>((resolve) => {
    if (options.ready !== false) {
      // Resolve immediately unless the caller wants to hold it open.
      queueMicrotask(() => resolve())
    } else {
      ;(readyPromise as unknown as { _resolve: () => void })._resolve = resolve
    }
  })

  const checkFn = vi.fn((_shorthand: string) => {
    if (options.throwOnCheck) throw new Error('boom')
    return typeof options.check === 'function'
      ? (options.check as () => boolean)()
      : (options.check ?? true)
  })

  const fontsValue = {
    ready: readyPromise,
    check: checkFn,
  } as unknown as FontFaceSet

  Object.defineProperty(document, 'fonts', {
    configurable: true,
    writable: true,
    value: fontsValue,
  })

  return { check: checkFn, ready: readyPromise }
}

/**
 * Install a mock canvas `measureText` that returns controlled widths per
 * sample string.
 */
function installCanvasMock(widthFor: (text: string) => number) {
  const measureText = vi.fn((text: string) => ({ width: widthFor(text) }))
  const getContext = vi.fn(() => ({
    font: '',
    measureText,
  }))
  // jsdom provides HTMLCanvasElement but without a 2D context by default.
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: getContext,
  })
  return { measureText, getContext }
}

describe('MultiLangFontGate', () => {
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')

  beforeEach(() => {
    // Default: healthy font environment.
    installFontsMock({ check: true })
    installCanvasMock(() => 120)
  })

  afterEach(() => {
    cleanup()
    if (originalFonts) {
      Object.defineProperty(document, 'fonts', originalFonts)
    } else {
      // jsdom does not ship document.fonts by default; delete after tests.
      delete (document as unknown as Record<string, unknown>).fonts
    }
    vi.restoreAllMocks()
  })

  it('is a transparent pass-through when only one language is present', () => {
    render(
      <MultiLangFontGate languages={['ru']}>
        <div data-testid="content">page content</div>
      </MultiLangFontGate>,
    )
    expect(screen.getByTestId('content')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renders children after detection succeeds on multi-language pages', async () => {
    installFontsMock({ check: true })
    installCanvasMock(() => 150)

    render(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div data-testid="content">page content</div>
      </MultiLangFontGate>,
    )

    // Wait for the detection promise to resolve and state to flush.
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renders FontErrorState when document.fonts.check returns false (Req 24.4)', async () => {
    installFontsMock({ check: false })

    render(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div data-testid="content">page content</div>
      </MultiLangFontGate>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    expect(
      screen.getByText(t('font.multiLangRenderFailed')),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('renders FontErrorState when canvas-measured glyph width collapses', async () => {
    installFontsMock({ check: true })
    // Return a sub-threshold width for one of the samples — this signals
    // a unified-render failure per the gate contract.
    installCanvasMock((text) => (text.includes('Привет') ? 2 : 120))

    render(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div data-testid="content">page content</div>
      </MultiLangFontGate>,
    )

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('passes through when document.fonts is unavailable (old browser)', async () => {
    delete (document as unknown as Record<string, unknown>).fonts

    render(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div data-testid="content">page content</div>
      </MultiLangFontGate>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })

  it('passes through when document.fonts.check throws', async () => {
    installFontsMock({ throwOnCheck: true })

    render(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div data-testid="content">page content</div>
      </MultiLangFontGate>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })

  it('re-runs the detection when the user presses retry', async () => {
    const user = userEvent.setup()
    const checkStates = [false, true]
    let callIndex = 0
    installFontsMock({
      check: () => {
        const ok = checkStates[Math.min(callIndex, checkStates.length - 1)]
        callIndex += 1
        return ok
      },
    })
    installCanvasMock(() => 120)

    render(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div data-testid="content">page content</div>
      </MultiLangFontGate>,
    )

    // First run: failure surface is shown.
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByTestId('font-error-retry'))
    })

    // Second run: detection succeeds, content appears.
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })

  it('runs the check exactly once per mount (no redundant re-detection on rerender)', async () => {
    const { check } = installFontsMock({ check: true })
    installCanvasMock(() => 120)

    const { rerender } = render(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div>initial</div>
      </MultiLangFontGate>,
    )

    await waitFor(() => {
      expect(check).toHaveBeenCalledTimes(1)
    })

    // Rerender with new children but same languages — the check must not
    // fire again.
    rerender(
      <MultiLangFontGate languages={['ru', 'en']}>
        <div>updated</div>
      </MultiLangFontGate>,
    )

    // Give any stray effects a tick to run.
    await new Promise((r) => setTimeout(r, 10))
    expect(check).toHaveBeenCalledTimes(1)
  })
})
