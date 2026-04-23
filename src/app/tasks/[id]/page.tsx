'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Play, Loader2, CheckCircle2, XCircle, FlaskConical, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel } from '@/lib/utils'
import type { Task, TestResults } from '@/types/database'
import MarkdownContent from '@/components/ui/MarkdownContent'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [task, setTask] = useState<Task | null>(null)
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)
    const [results, setResults] = useState<TestResults | null>(null)
    const [runStatus, setRunStatus] = useState<'passed' | 'failed' | 'error' | null>(null)
    const [execTime, setExecTime] = useState(0)
    const [isExtended, setIsExtended] = useState(false)

    const loadTask = useCallback(async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('tasks')
            .select('*, category:categories(*)')
            .eq('id', id)
            .single()

        if (data) {
            setTask(data)
            setCode(data.starter_code || `package main

import "fmt"

func main() {
\tfmt.Println("Hello, World!")
}
`)
        }
        setLoading(false)
    }, [id])

    useEffect(() => {
        loadTask()
    }, [id, loadTask])

    async function handleRun(extended = false) {
        if (!task) return
        setRunning(true)
        setResults(null)
        setRunStatus(null)
        setIsExtended(extended)

        try {
            const testCases = extended && task.extended_test_cases
                ? [...task.test_cases, ...task.extended_test_cases]
                : task.test_cases

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
            const data = await res.json()
            setResults(data.results)
            setRunStatus(data.status)
            setExecTime(data.executionTimeMs || data.execution_time_ms || 0)

            // Save submission
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('task_submissions').insert({
                    user_id: user.id,
                    task_id: task.id,
                    code,
                    status: data.status,
                    test_results: data.results,
                    execution_time_ms: data.executionTimeMs || data.execution_time_ms || 0,
                })
            }
        } catch {
            setRunStatus('error')
        }
        setRunning(false)
    }

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="skeleton" style={{ height: 500 }} />
                </div>
            </div>
        )
    }

    if (!task) {
        return (
            <div className="page">
                <div className="container empty-state">
                    <p className="empty-state__title">Задача не найдена</p>
                    <Link href="/tasks" className="btn btn--secondary">Назад к списку</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="page task-page">
            <div className="container">
                <Link href="/tasks" className="back-link">
                    <ArrowLeft size={16} /> Все задачи
                </Link>

                <div className="task-layout">
                    {/* Left: Description */}
                    <div className="task-desc glass glass--strong">
                        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
                            <span className={cn('badge', getDifficultyBadgeClass(task.difficulty))}>
                                {getDifficultyLabel(task.difficulty)}
                            </span>
                            {task.category && <span className="badge badge--purple">{task.category.name}</span>}
                        </div>
                        <h1 className="task-desc__title">{task.title}</h1>
                        <MarkdownContent content={task.description} className="task-desc__body" />
                        <div className="task-desc__meta">
                            <span>⏱ Лимит: {task.time_limit_ms / 1000}с</span>
                            <span>💾 Память: {task.memory_limit_mb}MB</span>
                            <span>🧪 Тестов: {task.test_cases.length}{task.extended_test_cases ? ` + ${task.extended_test_cases.length} расш.` : ''}</span>
                        </div>
                    </div>

                    {/* Right: Editor + Results */}
                    <div className="task-editor-panel">
                        <div className="editor-wrapper glass glass--strong">
                            <div className="editor-header">
                                <span className="text-sm font-semibold">main.go</span>
                                <button className="btn btn--ghost btn--sm" onClick={() => setCode(task.starter_code || '')}>
                                    <RotateCcw size={14} /> Сбросить
                                </button>
                            </div>
                            <div className="editor-container">
                                <MonacoEditor
                                    height="400px"
                                    defaultLanguage="go"
                                    theme="vs-dark"
                                    value={code}
                                    onChange={(v) => setCode(v || '')}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        fontFamily: 'JetBrains Mono, monospace',
                                        padding: { top: 16 },
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                        renderLineHighlight: 'line',
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                            <div className="editor-footer">
                                <button
                                    className="btn btn--primary"
                                    onClick={() => handleRun(false)}
                                    disabled={running}
                                >
                                    {running && !isExtended ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                                    Запустить тесты
                                </button>
                                {task.extended_test_cases && task.extended_test_cases.length > 0 && (
                                    <button
                                        className="btn btn--secondary"
                                        onClick={() => handleRun(true)}
                                        disabled={running}
                                    >
                                        {running && isExtended ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />}
                                        Расширенные тесты
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Test Results */}
                        <AnimatePresence>
                            {results && (
                                <motion.div
                                    className="test-results glass glass--strong"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="test-results__header">
                                        <div className={cn('flex items-center gap-2 font-bold', runStatus === 'passed' ? '' : '')} style={{ color: runStatus === 'passed' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                            {runStatus === 'passed' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                            {task.test_cases.length === 0
                                                ? (runStatus === 'passed' ? 'Программа выполнена' : 'Ошибка выполнения')
                                                : (runStatus === 'passed' ? 'Все тесты пройдены!' : runStatus === 'error' ? 'Ошибка' : 'Тесты не пройдены')}
                                        </div>
                                        <div className="text-sm text-muted">
                                            {task.test_cases.length > 0 ? `${results.passed}/${results.total} | ` : ''}{execTime}ms
                                        </div>
                                    </div>
                                    <div className="test-results__list">
                                        {results.details.map((detail, i) => (
                                            <div key={i} className={cn('test-result', detail.passed ? 'test-result--pass' : 'test-result--fail')}>
                                                <span>{detail.passed ? '✓' : '✗'}</span>
                                                <div style={{ flex: 1 }}>
                                                    {task.test_cases.length > 0 ? (
                                                        <>
                                                            <div>Вход: <code>{detail.input || '(пусто)'}</code></div>
                                                            {!detail.passed && (
                                                                <>
                                                                    <div>Ожидалось: <code>{detail.expected}</code></div>
                                                                    <div>Получено: <code>{detail.actual}</code></div>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div>Вывод: <pre style={{
                                                            margin: 'var(--space-2) 0 0 0',
                                                            padding: 'var(--space-3)',
                                                            background: 'rgba(0,0,0,0.3)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: 'var(--font-size-xs)',
                                                            fontFamily: 'JetBrains Mono, monospace'
                                                        }}>{detail.actual}</pre></div>
                                                    )}
                                                </div>
                                                {detail.execution_time_ms !== undefined && (
                                                    <span className="text-xs text-muted">{detail.execution_time_ms}ms</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          margin-bottom: var(--space-6);
          text-decoration: none;
        }
        .back-link:hover { color: var(--color-primary); }
        .task-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-6);
          align-items: start;
        }
        .task-desc {
          padding: var(--space-8);
          position: sticky;
          top: 88px;
        }
        .task-desc__title {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: var(--space-4);
        }
        .task-desc__body {
          color: var(--text-secondary);
          line-height: var(--line-height-relaxed);
          white-space: pre-wrap;
          font-size: var(--font-size-sm);
        }
        .task-desc__meta {
          display: flex;
          gap: var(--space-4);
          margin-top: var(--space-6);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-color);
          font-size: var(--font-size-xs);
          color: var(--text-muted);
        }
        .task-editor-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .editor-wrapper {
          overflow: hidden;
        }
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--border-color);
        }
        .editor-container {
          border-bottom: 1px solid var(--border-color);
        }
        .editor-footer {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-4);
        }
        .test-results__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--border-color);
        }
        .test-results__list {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-height: 300px;
          overflow-y: auto;
        }
        @media (max-width: 1024px) {
          .task-layout {
            grid-template-columns: 1fr;
          }
          .task-desc {
            position: static;
          }
        }
        :global(.spin) {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}
