'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, Clock, User, BookOpen, Code, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel, formatTimeAgo } from '@/lib/utils'
import type { MockSet, Question, Task } from '@/types/database'

export default function MockDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [set, setSet] = useState<MockSet | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(async () => {
        const supabase = createClient()

        // 1. Fetch Mock Set
        const { data: setData } = await supabase
            .from('mock_sets')
            .select('*, author:profiles(*)')
            .eq('id', id)
            .single()

        if (setData) {
            setSet(setData)

            // 2. Fetch Questions
            if (setData.question_ids && setData.question_ids.length > 0) {
                const { data: qData } = await supabase
                    .from('questions')
                    .select('*, category:categories(*)')
                    .in('id', setData.question_ids)
                if (qData) setQuestions(qData)
            }

            // 3. Fetch Tasks
            if (setData.task_ids && setData.task_ids.length > 0) {
                const { data: tData } = await supabase
                    .from('tasks')
                    .select('*, category:categories(*)')
                    .in('id', setData.task_ids)
                if (tData) setTasks(tData)
            }
        }
        setLoading(false)
    }, [id])

    useEffect(() => {
        const init = async () => {
            await Promise.resolve()
            loadData()
        }
        init()
    }, [loadData])

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
                </div>
            </div>
        )
    }

    if (!set) {
        return (
            <div className="page">
                <div className="container empty-state">
                    <p className="empty-state__title">MOCK-сет не найден</p>
                    <Link href="/mock" className="btn btn--secondary">Назад к списку</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="container">
                <Link href="/mock" className="back-link">
                    <ArrowLeft size={16} /> Ко всем сетам
                </Link>

                <div className="mock-grid">
                    {/* Left side: Info */}
                    <div className="mock-info">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass glass--strong"
                            style={{ padding: 'var(--space-8)' }}
                        >
                            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-6)' }}>
                                <span className={cn('badge', getDifficultyBadgeClass(set.difficulty))}>
                                    {getDifficultyLabel(set.difficulty)}
                                </span>
                                <div className="flex items-center gap-1 text-sm font-semibold">
                                    <Star size={14} style={{ color: 'var(--accent-yellow)', fill: 'var(--accent-yellow)' }} />
                                    <span>{set.avg_rating.toFixed(1)}</span>
                                </div>
                            </div>

                            <h1 className="mock-title">{set.title}</h1>
                            <p className="mock-desc">{set.description}</p>

                            <div className="mock-meta">
                                <div className="mock-meta__item">
                                    <User size={16} />
                                    <span>{set.author?.display_name || set.author?.username || 'Аноним'}</span>
                                </div>
                                <div className="mock-meta__item">
                                    <Clock size={16} />
                                    <span>{formatTimeAgo(set.created_at)}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'var(--space-8)' }}>
                                <button className="btn btn--primary btn--lg w-full">
                                    Начать собеседование
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right side: Content List */}
                    <div className="mock-content">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-col gap-6"
                        >
                            <section>
                                <h2 className="section-title">
                                    <BookOpen size={20} />
                                    Вопросы ({questions.length})
                                </h2>
                                <div className="content-list">
                                    {questions.map((q) => (
                                        <Link href={`/questions/${q.id}`} key={q.id} className="content-item glass card">
                                            <div className="flex-1">
                                                <h4 className="content-item__title">{q.title}</h4>
                                                {q.category && <span className="text-xs text-muted">{q.category.name}</span>}
                                            </div>
                                            <ChevronRight size={16} className="text-muted" />
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            {tasks.length > 0 && (
                                <section>
                                    <h2 className="section-title">
                                        <Code size={20} />
                                        Задачи ({tasks.length})
                                    </h2>
                                    <div className="content-list">
                                        {tasks.map((t) => (
                                            <Link href={`/tasks/${t.id}`} key={t.id} className="content-item glass card">
                                                <div className="flex-1">
                                                    <h4 className="content-item__title">{t.title}</h4>
                                                    {t.category && <span className="text-xs text-muted">{t.category.name}</span>}
                                                </div>
                                                <ChevronRight size={16} className="text-muted" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </motion.div>
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
                    margin-bottom: var(--space-8);
                    text-decoration: none;
                    transition: color var(--duration-fast);
                }
                .back-link:hover { color: var(--color-primary); }

                .mock-grid {
                    display: grid;
                    grid-template-columns: 400px 1fr;
                    gap: var(--space-8);
                    align-items: start;
                }

                .mock-title {
                    font-size: var(--font-size-3xl);
                    font-weight: 800;
                    margin-bottom: var(--space-4);
                    line-height: 1.2;
                }

                .mock-desc {
                    color: var(--text-secondary);
                    font-size: var(--font-size-md);
                    line-height: var(--line-height-relaxed);
                    margin-bottom: var(--space-6);
                }

                .mock-meta {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                    padding-top: var(--space-6);
                    border-top: 1px solid var(--border-color);
                }

                .mock-meta__item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    color: var(--text-muted);
                    font-size: var(--font-size-sm);
                }

                .section-title {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    font-size: var(--font-size-xl);
                    font-weight: 700;
                    margin-bottom: var(--space-4);
                }

                .content-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .content-item {
                    display: flex;
                    align-items: center;
                    padding: var(--space-4) var(--space-5);
                    text-decoration: none;
                    color: inherit;
                    transition: all var(--duration-fast);
                }
                .content-item:hover {
                    transform: translateX(4px);
                    border-color: var(--color-primary);
                }

                .content-item__title {
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                    margin-bottom: 2px;
                }

                @media (max-width: 1024px) {
                    .mock-grid {
                        grid-template-columns: 1fr;
                    }
                    .mock-info {
                        position: static;
                    }
                }
            `}</style>
        </div>
    )
}
