'use client'

import { useState, useEffect, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Lightbulb, Send, Loader2, CheckCircle2, XCircle, Bot, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel } from '@/lib/utils'
import { trackQuestionAnswered } from '@/lib/analytics'
import { AuraCard } from '@/components/ui/AuraCard'
import type { Question } from '@/types/database'
import MarkdownContent from '@/components/ui/MarkdownContent'

export default function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [question, setQuestion] = useState<Question | null>(null)
    const [answer, setAnswer] = useState('')
    const [loading, setLoading] = useState(true)
    const [evaluating, setEvaluating] = useState(false)
    const [result, setResult] = useState<{ score: number; feedback: string } | null>(null)
    const [showHint, setShowHint] = useState(false)
    const [showReferenceAnswer, setShowReferenceAnswer] = useState(false)

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
                <AuraCard className="question-detail p-8 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <span className={cn('badge', getDifficultyBadgeClass(question.difficulty))}>
                            {getDifficultyLabel(question.difficulty)}
                        </span>
                        {question.category && (
                            <span className="badge badge--purple">{question.category.name}</span>
                        )}
                    </div>

                    <h1 className="text-3xl font-bold mb-4 tracking-tight">{question.title}</h1>
                    <div className="mb-8">
                        <MarkdownContent content={question.description} className="text-secondary" />
                    </div>

                    {/* Hint */}
                    {question.hint && (
                        <div className="pt-6 border-t border-glass-border">
                            <button
                                className="btn btn--secondary btn--sm"
                                onClick={() => setShowHint(!showHint)}
                            >
                                <Lightbulb size={16} />
                                {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
                            </button>
                            <AnimatePresence>
                                {showHint && (
                                    <motion.div
                                        className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/20 text-secondary text-sm"
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

                    {/* Reference Answer Toggle */}
                    {question.reference_answer && (
                        <div className="mt-4 pt-4 border-t border-glass-border">
                            <button
                                className="btn btn--secondary btn--sm w-full font-semibold"
                                onClick={() => setShowReferenceAnswer(!showReferenceAnswer)}
                            >
                                {showReferenceAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
                                {showReferenceAnswer ? 'Скрыть эталонный ответ' : 'Показать эталонный ответ'}
                            </button>
                            <AnimatePresence>
                                {showReferenceAnswer && (
                                    <motion.div
                                        className="overflow-hidden"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "circOut" }}
                                    >
                                        <div className="mt-4 p-5 bg-white/5 rounded-xl border border-white/10 border-l-4 border-l-primary">
                                            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-primary mb-3">
                                                <Bot size={14} />
                                                <span>Эталонный ответ</span>
                                            </div>
                                            <MarkdownContent content={question.reference_answer} className="text-secondary text-sm" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </AuraCard>

                {/* Answer Section */}
                <AuraCard className="answer-section p-8 mb-6">
                    <h2 className="text-lg font-bold mb-4">Ваш ответ</h2>
                    <textarea
                        className="input textarea min-h-[200px]"
                        placeholder="Напишите свой ответ на вопрос..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        disabled={evaluating}
                    />
                    <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-muted">
                            {answer.length > 0 ? `${answer.length} символов` : 'Минимум 20 символов'}
                        </span>
                        <button
                            className="btn btn--primary px-8"
                            onClick={handleSubmit}
                            disabled={answer.trim().length < 20 || evaluating}
                        >
                            {evaluating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
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
                </AuraCard>

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
        .reference-answer-section {
          margin-top: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-color);
        }
        .reveal-btn {
          justify-content: center;
          gap: var(--space-2);
          background: rgba(167, 239, 158, 0.05);
          border: 1px solid rgba(167, 239, 158, 0.1);
          color: var(--color-primary);
        }
        .reveal-btn:hover {
          background: rgba(167, 239, 158, 0.1);
          border-color: var(--color-primary);
        }
        .reference-answer-content {
          overflow: hidden;
        }
        .answer-msg {
          margin-top: var(--space-4);
          padding: var(--space-5);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md);
          border-left: 3px solid var(--color-primary);
        }
        .answer-msg__header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-xs);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-primary);
          margin-bottom: var(--space-3);
          font-weight: 600;
        }
        .answer-msg__text {
          color: var(--text-primary);
          line-height: var(--line-height-relaxed);
          white-space: pre-wrap;
          font-size: var(--font-size-sm);
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
