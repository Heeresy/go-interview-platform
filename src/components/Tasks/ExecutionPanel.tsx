'use client'

/**
 * `<ExecutionPanel />` — DS v2 панель результатов выполнения тестов
 * для `Tasks_Module` (task 18.4).
 *
 * Покрывает шесть состояний дискриминированного union (Requirements
 * 15.1, 15.5, 15.6, 15.7, 15.8, 15.9):
 *
 *   - `idle`          → empty-state с подсказкой запустить тесты;
 *   - `running`       → Skeleton + локализованный label;
 *   - `compile-error` → GlassPanel с danger Badge "Ошибка компиляции",
 *                       индикатором строки, типом, сообщением, и
 *                       data-аттрибутами `data-error-kind="compile"` и
 *                       `data-highlighted-line={line}` для property-теста;
 *   - `runtime-error` → GlassPanel с danger Badge "Ошибка выполнения",
 *                       именем failed-теста и stderr в `<pre>`;
 *   - `timeout`       → GlassPanel с warning Badge "Превышен лимит
 *                       времени" + кнопкой Retry (вызывает `onRetry`);
 *   - `success`       → GlassPanel с success Badge
 *                       "Пройдено тестов: N из M".
 *
 * ──────────────────────────────────────────────────────────────────────
 *   Scope compile-ошибок (Req 15.6)
 * ──────────────────────────────────────────────────────────────────────
 * Компонент принимает **только** `ExecutionResult`. Все «информативные»
 * варианты — `compile-error`, `runtime-error`, `timeout`, `success` —
 * имеют origin tag `source: "execute-api"`, гарантирующий, что данные
 * пришли из ответа `/api/execute`.
 *
 * Type guard `acceptExecutionResult(x)` строго проверяет:
 *   1. `kind` находится в whitelist;
 *   2. для информативных веток `source === "execute-api"`;
 *   3. обязательные поля каждой ветки имеют корректные типы.
 *
 * Любой объект без `source: "execute-api"` отвергается:
 * Monaco editor-time диагностики (`onDidChangeModelDecorations`,
 * TS/ESLint worker markers) **не попадают** в ExecutionPanel — ни
 * подсветкой строк, ни деталями ошибки. Они остаются внутри Monaco
 * editor gutter.
 *
 * Все цвета/spacing/radius/motion/typography — только токены DS
 * (Req 1.8). Все строки локализованы через `t()` (Req 24.2).
 */

import type { CSSProperties, ReactNode } from 'react'

import {
  Badge,
  Button,
  GlassPanel,
  Skeleton,
} from '@/components/ui'
import { t } from '@/lib/i18n'

// ── Discriminated union (Req 15.6) ─────────────────────────────────────

/**
 * Состояние ExecutionPanel.
 *
 * Информативные ветки (`compile-error`, `runtime-error`, `timeout`,
 * `success`) обязательно несут origin tag `source: "execute-api"` —
 * без него объект не пройдёт `acceptExecutionResult` и не сможет быть
 * отрисован в ExecutionPanel.
 *
 * Управляющие ветки (`idle`, `running`) описывают UX-состояние UI и
 * не нуждаются в origin-tag, т.к. не содержат пользовательских
 * данных от внешних источников.
 */
export type ExecutionResult =
  | { kind: 'idle' }
  | { kind: 'running' }
  | {
      kind: 'compile-error'
      source: 'execute-api'
      /** Опционально: 1-индексная строка ошибки. */
      line?: number
      /** Тип ошибки (короткий человеко-понятный ярлык). */
      type?: string
      /** Подробное сообщение компилятора. */
      message: string
    }
  | {
      kind: 'runtime-error'
      source: 'execute-api'
      /** Сырой stderr из выполнения. */
      stderr: string
      /** Имя failed-теста (если применимо). */
      failedTest?: string
    }
  | {
      kind: 'timeout'
      source: 'execute-api'
    }
  | {
      kind: 'success'
      source: 'execute-api'
      /** Сколько тест-кейсов прошло. */
      passed: number
      /** Сколько всего тест-кейсов. */
      total: number
    }

/**
 * Тип-guard для `ExecutionResult`. Возвращает узкий
 * `ExecutionResult` либо `null`, если объект не соответствует
 * контракту (Req 15.6).
 *
 * Любой результат без `source === "execute-api"` (включая Monaco
 * editor-time markers и сторонние payload-ы) отвергается. Управляющие
 * ветки `idle` / `running` принимаются без `source`, т.к. они описывают
 * локальное UX-состояние компонента, а не данные `/api/execute`.
 */
export function acceptExecutionResult(x: unknown): ExecutionResult | null {
  if (x === null || typeof x !== 'object') return null
  const obj = x as Record<string, unknown>

  switch (obj.kind) {
    case 'idle':
      return { kind: 'idle' }
    case 'running':
      return { kind: 'running' }
    case 'compile-error':
      if (obj.source !== 'execute-api') return null
      if (typeof obj.message !== 'string') return null
      if (obj.line !== undefined && typeof obj.line !== 'number') return null
      if (obj.type !== undefined && typeof obj.type !== 'string') return null
      return {
        kind: 'compile-error',
        source: 'execute-api',
        line: obj.line as number | undefined,
        type: obj.type as string | undefined,
        message: obj.message,
      }
    case 'runtime-error':
      if (obj.source !== 'execute-api') return null
      if (typeof obj.stderr !== 'string') return null
      if (
        obj.failedTest !== undefined &&
        typeof obj.failedTest !== 'string'
      ) {
        return null
      }
      return {
        kind: 'runtime-error',
        source: 'execute-api',
        stderr: obj.stderr,
        failedTest: obj.failedTest as string | undefined,
      }
    case 'timeout':
      if (obj.source !== 'execute-api') return null
      return { kind: 'timeout', source: 'execute-api' }
    case 'success':
      if (obj.source !== 'execute-api') return null
      if (typeof obj.passed !== 'number') return null
      if (typeof obj.total !== 'number') return null
      return {
        kind: 'success',
        source: 'execute-api',
        passed: obj.passed,
        total: obj.total,
      }
    default:
      return null
  }
}

// ── Props ─────────────────────────────────────────────────────────────

export interface ExecutionPanelProps {
  /**
   * Результат выполнения, описывающий текущее состояние панели.
   * Информативные ветки прошли через `acceptExecutionResult`.
   */
  result: ExecutionResult
  /**
   * Колбек для retry на ветке `timeout`. Если не передан — кнопка
   * retry не рендерится.
   */
  onRetry?: () => void
}

// ── Styles (tokens only; Req 1.8) ─────────────────────────────────────

const PANEL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  minWidth: 0,
  width: '100%',
}

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 'var(--space-3)',
}

const IDLE_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 'var(--space-2)',
  paddingBlock: 'var(--space-8)',
  color: 'var(--border-700)',
}

const IDLE_TITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-md)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-800)',
  margin: 0,
  lineHeight: 1.3,
}

const IDLE_HINT_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-regular)',
  color: 'var(--border-600)',
  margin: 0,
  lineHeight: 1.5,
}

const RUNNING_LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--border-700)',
  margin: 0,
  lineHeight: 1.5,
}

const RUNNING_SKELETON_STACK_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
}

const META_ROW_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-3)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--border-800)',
  margin: 0,
}

const MESSAGE_BLOCK_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  paddingBlock: 'var(--space-3)',
  paddingInline: 'var(--space-3)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-100)',
  border: '1px solid var(--border-200)',
}

const MESSAGE_PRE_STYLE: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--fs-xs)',
  lineHeight: 1.5,
  color: 'var(--border-900)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 'var(--space-32)',
  overflow: 'auto',
}

const STDERR_LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-700)',
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const FAILED_TEST_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--border-800)',
  margin: 0,
  lineHeight: 1.5,
}

const TIMEOUT_DESCRIPTION_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-regular)',
  color: 'var(--border-700)',
  margin: 0,
  lineHeight: 1.5,
}

// ── Component ─────────────────────────────────────────────────────────

/**
 * Внутренний хелпер: GlassPanel-обёртка с обязательными data-атрибутами.
 */
function PanelShell({
  state,
  children,
  ...rest
}: {
  state: string
  children: ReactNode
} & Record<string, string | boolean | undefined>) {
  return (
    <GlassPanel
      style={PANEL_STYLE}
      data-ds="execution-panel"
      data-state={state}
      {...rest}
    >
      {children}
    </GlassPanel>
  )
}

export function ExecutionPanel({ result, onRetry }: ExecutionPanelProps) {
  // Branch: idle.
  if (result.kind === 'idle') {
    return (
      <PanelShell state="idle">
        <div style={IDLE_STYLE} data-testid="execution-panel-idle">
          <h3 style={IDLE_TITLE_STYLE}>{t('tasks.execution.idle.title')}</h3>
          <p style={IDLE_HINT_STYLE}>
            {t('tasks.execution.idle.description')}
          </p>
        </div>
      </PanelShell>
    )
  }

  // Branch: running.
  if (result.kind === 'running') {
    return (
      <PanelShell state="running" aria-busy="true">
        <p style={RUNNING_LABEL_STYLE} data-testid="execution-panel-running">
          {t('tasks.execution.running')}
        </p>
        <div style={RUNNING_SKELETON_STACK_STYLE}>
          <Skeleton variant="line" label={t('tasks.execution.running')} />
          <Skeleton variant="line" />
          <Skeleton variant="line" />
        </div>
      </PanelShell>
    )
  }

  // Branch: compile-error (Req 15.5, 15.6).
  if (result.kind === 'compile-error') {
    const lineLabel =
      result.line !== undefined
        ? t('tasks.execution.compileError.line', { line: result.line })
        : null
    const typeLabel = result.type
      ? t('tasks.execution.compileError.type', { type: result.type })
      : null

    return (
      <PanelShell state="compile-error">
        <div style={HEADER_STYLE}>
          <Badge variant="danger" data-testid="execution-panel-compile-badge">
            {t('tasks.execution.compileError')}
          </Badge>
        </div>
        <div
          style={MESSAGE_BLOCK_STYLE}
          data-error-kind="compile"
          data-highlighted-line={
            result.line !== undefined ? String(result.line) : undefined
          }
          data-testid="execution-panel-compile-details"
        >
          {(typeLabel || lineLabel) && (
            <p style={META_ROW_STYLE}>
              {typeLabel ? (
                <span data-testid="execution-panel-compile-type">
                  {typeLabel}
                </span>
              ) : null}
              {lineLabel ? (
                <span data-testid="execution-panel-compile-line">
                  {lineLabel}
                </span>
              ) : null}
            </p>
          )}
          <pre style={MESSAGE_PRE_STYLE}>{result.message}</pre>
        </div>
      </PanelShell>
    )
  }

  // Branch: runtime-error (Req 15.7).
  if (result.kind === 'runtime-error') {
    return (
      <PanelShell state="runtime-error">
        <div style={HEADER_STYLE}>
          <Badge variant="danger" data-testid="execution-panel-runtime-badge">
            {t('tasks.execution.runtimeError')}
          </Badge>
          {result.failedTest ? (
            <span
              style={FAILED_TEST_STYLE}
              data-testid="execution-panel-failed-test"
            >
              {t('tasks.execution.runtimeError.failedTest', {
                name: result.failedTest,
              })}
            </span>
          ) : null}
        </div>
        <p style={STDERR_LABEL_STYLE}>
          {t('tasks.execution.runtimeError.stderr')}
        </p>
        <pre
          style={{ ...MESSAGE_PRE_STYLE, ...MESSAGE_BLOCK_STYLE }}
          data-testid="execution-panel-stderr"
        >
          {result.stderr}
        </pre>
      </PanelShell>
    )
  }

  // Branch: timeout (Req 15.8).
  if (result.kind === 'timeout') {
    return (
      <PanelShell state="timeout">
        <div style={HEADER_STYLE}>
          <Badge variant="warning" data-testid="execution-panel-timeout-badge">
            {t('tasks.execution.timeout')}
          </Badge>
        </div>
        <p style={TIMEOUT_DESCRIPTION_STYLE}>
          {t('tasks.execution.timeout')}
        </p>
        {onRetry ? (
          <Button
            variant="secondary"
            size="md"
            onClick={onRetry}
            data-testid="execution-panel-timeout-retry"
          >
            {t('common.retry')}
          </Button>
        ) : null}
      </PanelShell>
    )
  }

  // Branch: success.
  return (
    <PanelShell state="success">
      <div style={HEADER_STYLE}>
        <Badge variant="success" data-testid="execution-panel-success">
          {t('tasks.execution.success', {
            passed: result.passed,
            total: result.total,
          })}
        </Badge>
      </div>
    </PanelShell>
  )
}

export default ExecutionPanel
