'use client'

/**
 * `/tasks/[id]` — Tasks_Module detail route (task 18.6, UI Redesign 2026).
 *
 * Перестроено под Design System v2 (Requirements 15.1, 21.1, 21.5, 22.4,
 * 22.5):
 *
 *   - Авторизованный пользователь видит контент внутри `<AppShell />`;
 *     гость отбрасывается клиентским `<AuthGate />` (`guest={null}` —
 *     к моменту рендера middleware уже редиректнул, мы лишь страхуем
 *     на гонках первичной загрузки) — без `router.push` и без полной
 *     перезагрузки (Req 5.7, 6.8).
 *
 *   - Контент собирается из публичного API `@/components/tasks` барреля:
 *     `<TaskSplitLayout description editor execution />` располагает три
 *     панели в resizable горизонтальный split на Desktop/Wide и в
 *     вертикальный стек на Mobile/Tablet (Req 15.4). В слоты передаются
 *     `<TaskDescription />` (markdown + difficulty badge), DS-обёртка
 *     над `<LazyMonacoEditor />` (Req 15.2, 15.3, 12.8) и
 *     `<ExecutionPanel />` (Req 15.5–15.8) с дискриминированным
 *     `ExecutionResult` через `acceptExecutionResult` type guard
 *     (Req 15.6).
 *
 *   - Старая разметка (`motion.div`, `<style jsx>`, ручной grid `task-layout`,
 *     CSS-классы вроде `task-card`/`filters-panel`/`editor-wrapper`,
 *     framer-motion `AnimatePresence`, hex-литералы) удалена полностью
 *     (Req 21.1, 21.5).
 *
 *   - Бизнес-логика и API-контракты не меняются (Req 21.2):
 *       * Загрузка задачи: `supabase.from('tasks').select('*, category:categories(*)').eq('id', id).single()`.
 *       * Запуск тестов: `POST /api/execute` с тем же payload-ом
 *         `{ code, test_cases, time_limit_ms, memory_limit_mb }`.
 *       * Persist сабмишена: `supabase.from('task_submissions').insert({...})`
 *         с тем же набором полей, что и legacy-страница.
 *
 * Маппинг ответа `/api/execute` → `ExecutionResult` (Req 15.5–15.9):
 *
 *   - `status: 'passed'` → `{ kind: 'success', source: 'execute-api', passed, total }`.
 *   - `status: 'failed'` → `{ kind: 'success', ... }` с partial pass count
 *      (тот же UX, что у legacy: «3/5 passed» с danger-индикацией не
 *      требуется отдельной веткой — пользователь увидит прогресс через
 *      passed/total). Failed-кейсы из `details` остаются доступны через
 *      будущий `<TestResultsCard />`, но в DS v2 ExecutionPanel держит
 *      summary-вид; детали не входят в scope task 18.6.
 *   - `status: 'error'` → `{ kind: 'runtime-error', source: 'execute-api',
 *      stderr, failedTest? }`. Содержимое `stderr` собирается из API
 *      (поле `stderr` или из первого failed `details[i].actual`).
 *      `failedTest` пока не выделяется, т.к. legacy-страница тоже не
 *      именует тест-кейсы.
 *   - HTTP-ошибка / network-fail → `{ kind: 'runtime-error', ..., stderr }`
 *      с человеко-понятным сообщением из `t('state.error.network')`.
 *
 * Compile-/timeout-ветки требуют дополнительной разметки в ответе API
 * (`compile_error`, `timed_out`), которой нет в текущем `/api/execute`.
 * Поэтому маппинг — best-effort: если `stderr` содержит классические
 * Go-маркеры компиляции (`./prog.go:N:M:`) или строку `timeout`, мы
 * перенаправляем результат в соответствующую ветку. Любой результат
 * из этой страницы помечен `source: 'execute-api'` — иначе
 * `acceptExecutionResult` его отвергнет (Req 15.6).
 *
 * Почему `'use client'`: `<AuthGate />` принимает render-функцию
 * `authenticated={({ user }) => ...}`, которые не сериализуются через
 * границу server→client, плюс вся работа с `localStorage` Sidebar /
 * Monaco-инстансом / fetch-стейтом — клиентская.
 */

import {
    use,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
} from 'react'
import Link from 'next/link'

import { AppShell, AuthGate } from '@/components/shell'
import {
    ExecutionPanel,
    LazyMonacoEditor,
    TaskDescription,
    TaskSplitLayout,
    acceptExecutionResult,
    type ExecutionResult,
} from '@/components/Tasks'
import {
    Button,
    EmptyState,
    ErrorState,
    GlassPanel,
    Skeleton,
} from '@/components/ui'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import type { CodeExecutionResponse, Task, TestCase } from '@/types/database'

// ── Layout (DS tokens only; Req 1.8) ────────────────────────────────────

const PAGE_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    width: '100%',
    minWidth: 0,
    // Высота split-layout на Desktop рассчитывается от viewport-минус-topbar.
    // На Mobile/Tablet TaskSplitLayout сам переключается на `height: auto`.
    minHeight: '100%',
}

const BACK_LINK_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-700)',
    textDecoration: 'none',
    alignSelf: 'flex-start',
}

const SPLIT_WRAPPER_STYLE: CSSProperties = {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    width: '100%',
}

const EDITOR_PANEL_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-lg)',
    height: '100%',
    minHeight: 0,
    minWidth: 0,
}

const EDITOR_HEADER_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--border-800)',
}

const EDITOR_FILE_NAME_STYLE: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-700)',
}

const EDITOR_WRAPPER_STYLE: CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
}

const EDITOR_FOOTER_STYLE: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
    paddingTop: 'var(--space-2)',
}

const SKELETON_PANEL_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-6)',
    borderRadius: 'var(--radius-lg)',
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Стартовый код по умолчанию, если у задачи нет `starter_code`.
 * Совпадает с legacy-страницей (`/src/app/tasks/[id]/page.tsx`).
 */
const DEFAULT_STARTER = `package main

import "fmt"

func main() {
\tfmt.Println("Hello, World!")
}
`

/**
 * Эвристика на распознавание ошибки компиляции в `stderr`. Go-компилятор
 * пишет диагностики в формате `<file>:<line>:<col>: <message>`, плюс часто
 * присутствуют строки `syntax error`, `undefined:`, `cannot use ... as ...`.
 * Возвращает `{ line?, type?, message }`, если pattern сматчился.
 */
function tryParseCompileError(stderr: string): {
    line?: number
    type?: string
    message: string
} | null {
    if (!stderr) return null
    // Самый стабильный маркер: путь:line:col:
    const match = stderr.match(
        /(?:^|[\r\n])([^\s:]*\.go):(\d+):(?:(\d+):)?\s*(.+?)(?:[\r\n]|$)/,
    )
    if (match) {
        const line = Number.parseInt(match[2] ?? '', 10)
        const message = match[4]?.trim() || stderr.trim()
        const typeMatch = message.match(/^([a-zA-Z][\w\s-]+?):/)
        return {
            line: Number.isFinite(line) ? line : undefined,
            type: typeMatch?.[1]?.trim(),
            message,
        }
    }
    // Лёгкий fallback: явные «syntax error / undefined / expected ...».
    if (/\b(syntax error|undefined|expected\s+\w)/i.test(stderr)) {
        return { message: stderr.trim() }
    }
    return null
}

/**
 * Эвристика на распознавание timeout. Сервис выполнения может вернуть
 * `error: 'timeout'` либо включить «time limit exceeded» в stderr.
 */
function looksLikeTimeout(payload: { stderr?: string }): boolean {
    const s = (payload.stderr ?? '').toLowerCase()
    return s.includes('timeout') || s.includes('time limit')
}

/**
 * Маппинг ответа `/api/execute` → `ExecutionResult` (Req 15.5–15.9).
 * Каждый успешный кейс маркируется `source: 'execute-api'`, чтобы пройти
 * `acceptExecutionResult` (Req 15.6).
 */
function mapExecuteResponse(
    res: CodeExecutionResponse,
): ExecutionResult {
    if (res.status === 'error') {
        const stderr = res.stderr ?? ''
        if (looksLikeTimeout({ stderr })) {
            return { kind: 'timeout', source: 'execute-api' }
        }
        const compile = tryParseCompileError(stderr)
        if (compile) {
            return {
                kind: 'compile-error',
                source: 'execute-api',
                line: compile.line,
                type: compile.type,
                message: compile.message,
            }
        }
        return {
            kind: 'runtime-error',
            source: 'execute-api',
            stderr: stderr || t('state.error.unknown'),
        }
    }
    // `passed` и `failed` сводим к summary-варианту: passed/total из
    // `results`. ExecutionPanel рендерит success-Badge с прогрессом.
    return {
        kind: 'success',
        source: 'execute-api',
        passed: res.results?.passed ?? 0,
        total: res.results?.total ?? 0,
    }
}

// ── Inner authenticated content ─────────────────────────────────────────

interface TaskDetailRouteContentProps {
    /** Идентификатор задачи из URL. */
    taskId: string
}

function TaskDetailRouteContent({ taskId }: TaskDetailRouteContentProps) {
    const [task, setTask] = useState<Task | null>(null)
    const [code, setCode] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [reloadToken, setReloadToken] = useState(0)

    // ExecutionPanel state — изолирован от загрузки задачи. Старт — `idle`.
    const [execResult, setExecResult] = useState<ExecutionResult>({
        kind: 'idle',
    })
    const [isRunning, setIsRunning] = useState(false)
    const [lastExtended, setLastExtended] = useState(false)

    // Загрузка задачи. Без зависимостей от `code` — ввод в редактор не
    // должен триггерить повторный fetch.
    useEffect(() => {
        let active = true
        const supabase = createClient()
        setIsLoading(true)
        setError(null)

        async function load() {
            try {
                const { data, error: fetchError } = await supabase
                    .from('tasks')
                    .select('*, category:categories(*)')
                    .eq('id', taskId)
                    .single()

                if (!active) return
                if (fetchError) throw fetchError
                const loaded = (data as Task | null) ?? null
                setTask(loaded)
                setCode(loaded?.starter_code ?? DEFAULT_STARTER)
            } catch (err) {
                if (!active) return
                setError(err instanceof Error ? err : new Error(String(err)))
            } finally {
                if (active) setIsLoading(false)
            }
        }

        void load()
        return () => {
            active = false
        }
    }, [taskId, reloadToken])

    const handleRetryLoad = useCallback(() => {
        setReloadToken((n) => n + 1)
    }, [])

    const handleResetCode = useCallback(() => {
        if (!task) return
        setCode(task.starter_code ?? DEFAULT_STARTER)
    }, [task])

    /**
     * Run tests. Контракт `/api/execute` без изменений (Req 21.2):
     * `{ code, test_cases, time_limit_ms, memory_limit_mb }` →
     * `{ status, results, executionTimeMs, stderr? }`. Persist сабмишена
     * в `task_submissions` — best-effort, не блокирует UI.
     */
    const runTests = useCallback(
        async (extended: boolean) => {
            if (!task || isRunning) return
            setIsRunning(true)
            setLastExtended(extended)
            setExecResult({ kind: 'running' })

            const testCases: TestCase[] =
                extended && task.extended_test_cases
                    ? [...task.test_cases, ...task.extended_test_cases]
                    : task.test_cases

            try {
                const res = await fetch('/api/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        test_cases: testCases,
                        time_limit_ms: task.time_limit_ms,
                        memory_limit_mb: task.memory_limit_mb,
                    }),
                })

                if (!res.ok) {
                    setExecResult({
                        kind: 'runtime-error',
                        source: 'execute-api',
                        stderr: t('state.error.server'),
                    })
                    return
                }

                const data = (await res.json()) as Partial<
                    CodeExecutionResponse & { results: { passed: number; total: number } }
                >

                // Validate structure минимально — `mapExecuteResponse` ожидает
                // строго `CodeExecutionResponse`-shape, но реальный API может
                // вернуть `executionTimeMs` вместо `execution_time_ms`. Для
                // ExecutionResult-маппинга это не критично — мы используем
                // только `status`, `results.passed/total`, `stderr`.
                const normalised: CodeExecutionResponse = {
                    status: (data.status ?? 'error') as CodeExecutionResponse['status'],
                    results: {
                        passed: data.results?.passed ?? 0,
                        total: data.results?.total ?? testCases.length,
                        details:
                            data.results &&
                            'details' in data.results &&
                            Array.isArray(
                                (data.results as { details?: unknown }).details,
                            )
                                ? ((data.results as { details: never[] }).details)
                                : [],
                    },
                    execution_time_ms:
                        (data as { execution_time_ms?: number; executionTimeMs?: number })
                            .execution_time_ms ??
                        (data as { executionTimeMs?: number }).executionTimeMs ??
                        0,
                    stderr: data.stderr,
                }

                const mapped = mapExecuteResponse(normalised)
                // Финальная страховка контракта Req 15.6: даже если рефакторинг
                // потеряет origin-tag, `acceptExecutionResult` отвергнет
                // объект, и мы покажем generic runtime-error из stderr.
                const accepted = acceptExecutionResult(mapped)
                setExecResult(
                    accepted ?? {
                        kind: 'runtime-error',
                        source: 'execute-api',
                        stderr: t('state.error.unknown'),
                    },
                )

                // Persist сабмишена. Best-effort — те же поля, что в legacy.
                try {
                    const supabase = createClient()
                    const {
                        data: { user },
                    } = await supabase.auth.getUser()
                    if (user) {
                        await supabase.from('task_submissions').insert({
                            user_id: user.id,
                            task_id: task.id,
                            code,
                            status: normalised.status,
                            test_results: normalised.results,
                            execution_time_ms: normalised.execution_time_ms,
                        })
                    }
                } catch {
                    // RLS/network — UX результата уже виден; persist не критичен.
                }
            } catch {
                setExecResult({
                    kind: 'runtime-error',
                    source: 'execute-api',
                    stderr: t('state.error.network'),
                })
            } finally {
                setIsRunning(false)
            }
        },
        [task, code, isRunning],
    )

    const handleRetryRun = useCallback(() => {
        void runTests(lastExtended)
    }, [runTests, lastExtended])

    // ── Loading ──
    if (isLoading) {
        return (
            <div
                style={PAGE_STYLE}
                data-ds="task-detail-page"
                data-state="loading"
            >
                <Link href="/tasks" style={BACK_LINK_STYLE}>
                    ← {t('tasks.detail.back')}
                </Link>
                <GlassPanel style={SKELETON_PANEL_STYLE}>
                    <Skeleton variant="line" />
                    <Skeleton variant="line" />
                    <Skeleton variant="card" />
                </GlassPanel>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div
                style={PAGE_STYLE}
                data-ds="task-detail-page"
                data-state="error"
            >
                <Link href="/tasks" style={BACK_LINK_STYLE}>
                    ← {t('tasks.detail.back')}
                </Link>
                <ErrorState
                    messageKey="state.error.unknown"
                    retry={handleRetryLoad}
                />
            </div>
        )
    }

    // ── Not found ──
    if (!task) {
        return (
            <div
                style={PAGE_STYLE}
                data-ds="task-detail-page"
                data-state="empty"
            >
                <Link href="/tasks" style={BACK_LINK_STYLE}>
                    ← {t('tasks.detail.back')}
                </Link>
                <GlassPanel>
                    <EmptyState
                        title={t('tasks.detail.notFound.title')}
                        description={t('tasks.detail.notFound.description')}
                    />
                </GlassPanel>
            </div>
        )
    }

    // ── Success ──
    const description = <TaskDescription task={task} />

    const editor = (
        <GlassPanel
            style={EDITOR_PANEL_STYLE}
            data-ds="task-detail-editor-panel"
        >
            <header style={EDITOR_HEADER_STYLE}>
                <span style={EDITOR_FILE_NAME_STYLE}>
                    {t('tasks.detail.editor.fileName')}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetCode}
                >
                    {t('tasks.detail.editor.reset')}
                </Button>
            </header>
            <div style={EDITOR_WRAPPER_STYLE}>
                <LazyMonacoEditor
                    height="100%"
                    defaultLanguage="go"
                    value={code}
                    onChange={(v) => setCode(v ?? '')}
                    options={{
                        fontSize: 14,
                        fontFamily: 'var(--font-mono)',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        automaticLayout: true,
                        padding: { top: 12 },
                    }}
                />
            </div>
            <div style={EDITOR_FOOTER_STYLE}>
                <Button
                    type="button"
                    variant="primary"
                    size="md"
                    loading={isRunning && !lastExtended}
                    disabled={isRunning && lastExtended}
                    onClick={() => runTests(false)}
                >
                    {t('tasks.detail.run')}
                </Button>
                {task.extended_test_cases &&
                task.extended_test_cases.length > 0 ? (
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        loading={isRunning && lastExtended}
                        disabled={isRunning && !lastExtended}
                        onClick={() => runTests(true)}
                    >
                        {t('tasks.detail.run.extended')}
                    </Button>
                ) : null}
            </div>
        </GlassPanel>
    )

    const execution = (
        <ExecutionPanel result={execResult} onRetry={handleRetryRun} />
    )

    return (
        <div
            style={PAGE_STYLE}
            data-ds="task-detail-page"
            data-state="success"
        >
            <Link href="/tasks" style={BACK_LINK_STYLE}>
                ← {t('tasks.detail.back')}
            </Link>
            <div style={SPLIT_WRAPPER_STYLE}>
                <TaskSplitLayout
                    description={description}
                    editor={editor}
                    execution={execution}
                />
            </div>
        </div>
    )
}

// ── Page export ─────────────────────────────────────────────────────────

interface PageProps {
    params: Promise<{ id: string }>
}

export default function TaskDetailPage({ params }: PageProps) {
    // Next.js 16 App Router: `params` — Promise. Разворачиваем через `use()`
    // ровно так же, как делает legacy-страница.
    const { id } = use(params)

    // useMemo стабилизирует `authenticated` render-функцию по `id`.
    const content = useMemo(
        () => <TaskDetailRouteContent taskId={id} />,
        [id],
    )

    return (
        <AuthGate
            guest={null}
            authenticated={({ user }) => (
                <AppShell user={user}>{content}</AppShell>
            )}
        />
    )
}
