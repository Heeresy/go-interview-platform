import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'

import {
  ExecutionPanel,
  acceptExecutionResult,
  type ExecutionResult,
} from './ExecutionPanel'

/**
 * ExecutionPanel — DS v2 панель результатов выполнения тестов
 * (task 18.4; Req 15.1, 15.5, 15.6, 15.7, 15.8, 15.9).
 *
 * Tests cover:
 *   - Discriminated union с шестью ветками (`idle`, `running`,
 *     `compile-error`, `runtime-error`, `timeout`, `success`).
 *   - Type guard `acceptExecutionResult(x)` отвергает Monaco markers
 *     и любые объекты без `source: "execute-api"` для информативных
 *     веток (Req 15.6).
 *   - Idle → empty-state с подсказкой.
 *   - Running → Skeleton + статус, aria-busy.
 *   - Compile-error → danger Badge "Ошибка компиляции",
 *     `data-error-kind="compile"`, `data-highlighted-line={line}`.
 *   - Runtime-error → danger Badge, имя failed-теста, stderr в `<pre>`.
 *   - Timeout → warning Badge "Превышен лимит времени" + Retry button,
 *     вызывает `onRetry`.
 *   - Success → success Badge "Пройдено тестов: N из M".
 *   - Wrapping в GlassPanel (`.glass`) — Req 15.1, 22.1.
 */

afterEach(() => {
  cleanup()
})

// ── Type guard ────────────────────────────────────────────────────────

describe('acceptExecutionResult — type guard (Req 15.6)', () => {
  it('accepts idle (no source required for control state)', () => {
    expect(acceptExecutionResult({ kind: 'idle' })).toEqual({ kind: 'idle' })
  })

  it('accepts running (no source required for control state)', () => {
    expect(acceptExecutionResult({ kind: 'running' })).toEqual({
      kind: 'running',
    })
  })

  it('accepts well-formed execute-api compile-error', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'compile-error',
      type: 'syntax',
      message: 'unexpected token',
      line: 5,
    }
    expect(acceptExecutionResult(x)).toEqual({
      kind: 'compile-error',
      source: 'execute-api',
      type: 'syntax',
      message: 'unexpected token',
      line: 5,
    })
  })

  it('accepts compile-error without optional line and type', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'compile-error',
      message: 'unexpected token',
    }
    const result = acceptExecutionResult(x)
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('compile-error')
  })

  it('accepts runtime-error with optional failedTest', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'runtime-error',
      stderr: 'panic: nil pointer',
      failedTest: 'TestFoo',
    }
    expect(acceptExecutionResult(x)).toEqual({
      kind: 'runtime-error',
      source: 'execute-api',
      stderr: 'panic: nil pointer',
      failedTest: 'TestFoo',
    })
  })

  it('accepts timeout', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'timeout',
    }
    expect(acceptExecutionResult(x)).toEqual({
      kind: 'timeout',
      source: 'execute-api',
    })
  })

  it('accepts success', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'success',
      passed: 3,
      total: 5,
    }
    expect(acceptExecutionResult(x)).toEqual({
      kind: 'success',
      source: 'execute-api',
      passed: 3,
      total: 5,
    })
  })

  it('rejects null', () => {
    expect(acceptExecutionResult(null)).toBeNull()
  })

  it('rejects undefined', () => {
    expect(acceptExecutionResult(undefined)).toBeNull()
  })

  it('rejects primitives', () => {
    expect(acceptExecutionResult('execute-api')).toBeNull()
    expect(acceptExecutionResult(42)).toBeNull()
    expect(acceptExecutionResult(true)).toBeNull()
  })

  it('rejects compile-error without source: "execute-api" (Req 15.6)', () => {
    // Monaco editor-time marker shape — должен быть отвергнут, даже если
    // у него есть похожие поля line/message.
    const monacoMarker: unknown = {
      kind: 'compile-error',
      severity: 8,
      line: 5,
      message: 'Cannot find name "foo".',
      source: 'ts',
    }
    expect(acceptExecutionResult(monacoMarker)).toBeNull()
  })

  it('rejects runtime-error without source: "execute-api"', () => {
    const x: unknown = {
      kind: 'runtime-error',
      stderr: 'oops',
      source: 'monaco-worker',
    }
    expect(acceptExecutionResult(x)).toBeNull()
  })

  it('rejects timeout without source: "execute-api"', () => {
    const x: unknown = { kind: 'timeout' }
    expect(acceptExecutionResult(x)).toBeNull()
  })

  it('rejects success without source: "execute-api"', () => {
    const x: unknown = { kind: 'success', passed: 1, total: 1 }
    expect(acceptExecutionResult(x)).toBeNull()
  })

  it('rejects unknown kind', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'something-else',
      message: 'x',
    }
    expect(acceptExecutionResult(x)).toBeNull()
  })

  it('rejects compile-error with non-string message', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'compile-error',
      type: 'syntax',
      message: 42,
    }
    expect(acceptExecutionResult(x)).toBeNull()
  })

  it('rejects runtime-error without stderr', () => {
    const x: unknown = {
      source: 'execute-api',
      kind: 'runtime-error',
    }
    expect(acceptExecutionResult(x)).toBeNull()
  })
})

// ── Idle state ────────────────────────────────────────────────────────

describe('ExecutionPanel — idle', () => {
  it('renders empty-state hint inside a GlassPanel', () => {
    const { container, getByTestId } = render(
      <ExecutionPanel result={{ kind: 'idle' }} />,
    )
    const root = container.querySelector(
      '[data-ds="execution-panel"]',
    ) as HTMLElement
    expect(root).not.toBeNull()
    expect(root.classList.contains('glass')).toBe(true)
    expect(root.getAttribute('data-state')).toBe('idle')
    expect(getByTestId('execution-panel-idle')).not.toBeNull()
  })

  it('does not render compile/runtime/highlight nodes (Req 15.6)', () => {
    const { container } = render(
      <ExecutionPanel result={{ kind: 'idle' }} />,
    )
    expect(
      container.querySelector('[data-error-kind="compile"]'),
    ).toBeNull()
    expect(container.querySelector('[data-highlighted-line]')).toBeNull()
  })
})

// ── Running state ─────────────────────────────────────────────────────

describe('ExecutionPanel — running', () => {
  it('renders Skeletons + running label, sets aria-busy', () => {
    const { container, getByTestId } = render(
      <ExecutionPanel result={{ kind: 'running' }} />,
    )
    const root = container.querySelector(
      '[data-ds="execution-panel"]',
    ) as HTMLElement
    expect(root.getAttribute('data-state')).toBe('running')
    expect(root.getAttribute('aria-busy')).toBe('true')
    expect(getByTestId('execution-panel-running')).not.toBeNull()
    const skeletons = container.querySelectorAll('[data-ds="skeleton"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })
})

// ── Compile error (Req 15.5, 15.6) ────────────────────────────────────

describe('ExecutionPanel — compile-error', () => {
  it('renders danger Badge + type + line, sets data-highlighted-line', () => {
    const result: ExecutionResult = {
      kind: 'compile-error',
      source: 'execute-api',
      line: 12,
      type: 'syntax',
      message: 'unexpected token "}"',
    }
    const { container, getByTestId } = render(
      <ExecutionPanel result={result} />,
    )
    const root = container.querySelector(
      '[data-ds="execution-panel"]',
    ) as HTMLElement
    expect(root.getAttribute('data-state')).toBe('compile-error')
    expect(root.classList.contains('glass')).toBe(true)

    const badge = getByTestId('execution-panel-compile-badge')
    expect(badge.getAttribute('data-variant')).toBe('danger')
    expect(badge.textContent).toContain('Ошибка компиляции')

    const details = getByTestId('execution-panel-compile-details')
    expect(details.getAttribute('data-error-kind')).toBe('compile')
    expect(details.getAttribute('data-highlighted-line')).toBe('12')

    expect(
      getByTestId('execution-panel-compile-type').textContent,
    ).toContain('syntax')
    expect(
      getByTestId('execution-panel-compile-line').textContent,
    ).toContain('12')
    expect(details.textContent).toContain('unexpected token')
  })

  it('omits line label and data-highlighted-line when line is undefined', () => {
    const result: ExecutionResult = {
      kind: 'compile-error',
      source: 'execute-api',
      type: 'type-error',
      message: 'cannot use string as int',
    }
    const { container, getByTestId, queryByTestId } = render(
      <ExecutionPanel result={result} />,
    )
    const details = getByTestId('execution-panel-compile-details')
    expect(details.getAttribute('data-error-kind')).toBe('compile')
    expect(details.hasAttribute('data-highlighted-line')).toBe(false)
    expect(queryByTestId('execution-panel-compile-line')).toBeNull()
    expect(container.textContent).toContain('type-error')
  })

  it('omits type label when type is undefined', () => {
    const result: ExecutionResult = {
      kind: 'compile-error',
      source: 'execute-api',
      message: 'unspecified compile failure',
    }
    const { queryByTestId, getByTestId } = render(
      <ExecutionPanel result={result} />,
    )
    expect(queryByTestId('execution-panel-compile-type')).toBeNull()
    const details = getByTestId('execution-panel-compile-details')
    expect(details.textContent).toContain('unspecified compile failure')
  })
})

// ── Runtime error (Req 15.7) ──────────────────────────────────────────

describe('ExecutionPanel — runtime-error', () => {
  it('renders danger Badge, failed test name and stderr in a <pre> block', () => {
    const result: ExecutionResult = {
      kind: 'runtime-error',
      source: 'execute-api',
      failedTest: 'TestSum',
      stderr: 'panic: index out of range\n\tgoroutine 1 [running]',
    }
    const { container, getByTestId } = render(
      <ExecutionPanel result={result} />,
    )
    const root = container.querySelector(
      '[data-ds="execution-panel"]',
    ) as HTMLElement
    expect(root.getAttribute('data-state')).toBe('runtime-error')
    expect(root.classList.contains('glass')).toBe(true)

    const badge = getByTestId('execution-panel-runtime-badge')
    expect(badge.getAttribute('data-variant')).toBe('danger')
    expect(badge.textContent).toContain('Ошибка выполнения')

    expect(
      getByTestId('execution-panel-failed-test').textContent,
    ).toContain('TestSum')
    const stderr = getByTestId('execution-panel-stderr') as HTMLElement
    expect(stderr.tagName).toBe('PRE')
    expect(stderr.textContent).toContain('panic: index out of range')
  })

  it('omits failed test row when failedTest is absent', () => {
    const result: ExecutionResult = {
      kind: 'runtime-error',
      source: 'execute-api',
      stderr: 'segfault',
    }
    const { queryByTestId } = render(<ExecutionPanel result={result} />)
    expect(queryByTestId('execution-panel-failed-test')).toBeNull()
  })
})

// ── Timeout (Req 15.8) ────────────────────────────────────────────────

describe('ExecutionPanel — timeout', () => {
  it('renders warning Badge with retry button when onRetry is provided', () => {
    const onRetry = vi.fn()
    const result: ExecutionResult = {
      kind: 'timeout',
      source: 'execute-api',
    }
    const { container, getByTestId } = render(
      <ExecutionPanel result={result} onRetry={onRetry} />,
    )
    const root = container.querySelector(
      '[data-ds="execution-panel"]',
    ) as HTMLElement
    expect(root.getAttribute('data-state')).toBe('timeout')

    const badge = getByTestId('execution-panel-timeout-badge')
    expect(badge.getAttribute('data-variant')).toBe('warning')
    expect(badge.textContent).toContain('Превышен лимит времени')

    const retryButton = getByTestId(
      'execution-panel-timeout-retry',
    ) as HTMLButtonElement
    expect(retryButton.tagName).toBe('BUTTON')
    expect(retryButton.textContent).toContain('Повторить')
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('omits retry button when onRetry is undefined', () => {
    const result: ExecutionResult = {
      kind: 'timeout',
      source: 'execute-api',
    }
    const { queryByTestId } = render(<ExecutionPanel result={result} />)
    expect(queryByTestId('execution-panel-timeout-retry')).toBeNull()
  })
})

// ── Success ───────────────────────────────────────────────────────────

describe('ExecutionPanel — success', () => {
  it('renders success Badge with localized "passed/total" string', () => {
    const result: ExecutionResult = {
      kind: 'success',
      source: 'execute-api',
      passed: 3,
      total: 5,
    }
    const { container, getByTestId } = render(
      <ExecutionPanel result={result} />,
    )
    const root = container.querySelector(
      '[data-ds="execution-panel"]',
    ) as HTMLElement
    expect(root.getAttribute('data-state')).toBe('success')
    expect(root.classList.contains('glass')).toBe(true)
    const success = getByTestId('execution-panel-success')
    expect(success.getAttribute('data-variant')).toBe('success')
    expect(success.textContent).toContain('Пройдено тестов: 3 из 5')
  })
})
