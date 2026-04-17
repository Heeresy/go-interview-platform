'use client'

import { useState, useEffect, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lightbulb, Send, Loader2, CheckCircle2, XCircle, Bot } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel } from '@/lib/utils'
import { trackQuestionAnswered } from '@/lib/analytics'
import type { Question } from '@/types/database'

export default function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [question, setQuestion] = useState<Question | null>(null)
    const [answer, setAnswer] = useState('')
    const [loading, setLoading] = useState(true)
    const [evaluating, setEvaluating] = useState(false)
    const [result, setResult] = useState<{ score: number; feedback: string } | null>(null)
    const [showHint, setShowHint] = useState(false)

    useEffect(() => {
        loadQuestion()
    }, [id])

    async function loadQuestion() {
        const supabase = createClient()
        const { data } = await supabase
            .from('questions')
            .select('*, category:categories(*)')
            .eq('id', id)
            .single()
        if (data) setQuestion(data)
        setLoading(false)
    }

    async function handleSubmit() {
        if (!answer.trim() || !question) return
        setEvaluating(true)
        setResult(null)

        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question.description,
                    reference_answer: question.reference_answer,
                    user_answer: answer,
                }),
            })
            const data = await res.json()
            setResult(data)

            // Save answer to database
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('question_answers').insert({
                    user_id: user.id,
                    question_id: question.id,
                    answer_text: answer,
                    ai_score: data.score,
                    ai_feedback: data.feedback,
                })
            }
        } catch {
            setResult({ score: 0, feedback: 'Ошибка при оценке. Попробуйте позже.' })
        }
        setEvaluating(false)
    }

    if (loading) {
        return (
            <div className="page">
                <div className="container container--narrow">
                    <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 16 }} />
                    <div className="skeleton" style={{ height: 200 }} />
                </div>
            </div>
        )
    }

    if (!question) {
        return (
            <div className="page">
                <div className="container container--narrow empty-state">
                    <p className="empty-state__title">Вопрос не найден</p>
                    <Link href="/questions" className="btn btn--secondary">Назад к списку</Link>
                </div>
            </div>
        )
    }

    const isCorrect = result && result.score >= 85

    return (
        <div className="page">
            <div className="container container--narrow">
                <Link href="/questions" className="back-link">
                    <ArrowLeft size={16} />
                    Все вопросы
                </Link>

                {/* Question Card */}
                <div className="question-detail glass glass--strong">
                    <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
                        <span className={cn('badge', getDifficultyBadgeClass(question.difficulty))}>
                            {getDifficultyLabel(question.difficulty)}
                        </span>
                        {question.category && (
                            <span className="badge badge--purple">{question.category.name}</span>
                        )}
                    </div>

                    <h1 className="question-detail__title">{question.title}</h1>
                    <p className="question-detail__desc">{question.description}</p>

                    {/* Hint */}
                    {question.hint && (
                        <div className="hint-section">
                            <button
                                className="btn btn--ghost btn--sm"
                                onClick={() => setShowHint(!showHint)}
                            >
                                <Lightbulb size={16} />
                                {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
                            </button>
                            <AnimatePresence>
                                {showHint && (
                                    <motion.div
                                        className="hint-content"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <p>{question.hint}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Answer Section */}
                <div className="answer-section glass glass--strong">
                    <h2 className="answer-section__title">Ваш ответ</h2>
                    <textarea
                        className="input textarea"
                        placeholder="Напишите свой ответ на вопрос..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        rows={6}
                        disabled={evaluating}
                    />
                    <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-4)' }}>
                        <span className="text-xs text-muted">
                            {answer.length > 0 ? `${answer.length} символов` : 'Минимум 20 символов'}
                        </span>
                        <button
                            className="btn btn--primary"
                            onClick={handleSubmit}
                            disabled={answer.trim().length < 20 || evaluating}
                        >
                            {evaluating ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    Оценка...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Отправить на оценку
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Result */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            className={cn('result-card glass glass--strong', isCorrect ? 'result-card--pass' : 'result-card--fail')}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                        >
                            <div className="result-card__header">
                                <div className={cn('score', isCorrect ? 'score--pass' : 'score--fail')}>
                                    {result.score}%
                                </div>
                                <div>
                                    <div className="result-card__status">
                                        {isCorrect ? (
                                            <><CheckCircle2 size={20} /> Засчитано!</>
                                        ) : (
                                            <><XCircle size={20} /> Не засчитано</>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted">
                                        {isCorrect ? 'Отличный ответ!' : 'Нужно набрать 85% для зачёта'}
                                    </p>
                                </div>
                            </div>
                            <div className="result-card__feedback">
                                <h3>Обратная связь от AI</h3>
                                <p>{result.feedback}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
        .back-link:hover {
          color: var(--color-primary);
        }
        .question-detail {
          padding: var(--space-8);
          margin-bottom: var(--space-6);
        }
        .question-detail__title {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: var(--space-4);
        }
        .question-detail__desc {
          color: var(--text-secondary);
          line-height: var(--line-height-relaxed);
          white-space: pre-wrap;
        }
        .hint-section {
          margin-top: var(--space-6);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-color);
        }
        .hint-content {
          overflow: hidden;
          margin-top: var(--space-3);
          padding: var(--space-4);
          background: var(--color-primary-muted);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
        }
        .answer-section {
          padding: var(--space-8);
          margin-bottom: var(--space-6);
        }
        .answer-section__title {
          font-size: var(--font-size-lg);
          font-weight: 700;
          margin-bottom: var(--space-4);
        }
        .result-card {
          padding: var(--space-8);
        }
        .result-card--pass {
          border-color: rgba(169, 220, 118, 0.3);
        }
        .result-card--fail {
          border-color: rgba(255, 97, 136, 0.2);
        }
        .result-card__header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        .result-card__status {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 700;
          font-size: var(--font-size-lg);
        }
        .result-card--pass .result-card__status {
          color: var(--accent-green);
        }
        .result-card--fail .result-card__status {
          color: var(--accent-red);
        }
        .result-card__feedback h3 {
          font-size: var(--font-size-sm);
          font-weight: 600;
          margin-bottom: var(--space-2);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .result-card__feedback p {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: var(--line-height-relaxed);
          white-space: pre-wrap;
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
