'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { GraduationCap, ArrowRight, CheckCircle2, XCircle, Trophy, Flame, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyLabel } from '@/lib/utils'
import type { Question, Difficulty } from '@/types/database'

export default function TrainerPage() {
    const [started, setStarted] = useState(false)
    const [currentLevel, setCurrentLevel] = useState<Difficulty>(1)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answer, setAnswer] = useState('')
    const [evaluating, setEvaluating] = useState(false)
    const [result, setResult] = useState<{ score: number; feedback: string } | null>(null)
    const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0 })
    const [phase, setPhase] = useState<'questions' | 'tasks' | 'complete'>('questions')

    async function startTraining() {
        const supabase = createClient()
        const { data } = await supabase
            .from('questions')
            .select('*, category:categories(*)')
            .eq('difficulty', currentLevel)
            .order('created_at')
            .limit(5)

        if (data && data.length > 0) {
            setQuestions(data)
            setStarted(true)
            setCurrentIndex(0)
            setPhase('questions')
        }
    }

    async function handleSubmit() {
        const question = questions[currentIndex]
        if (!question || !answer.trim()) return
        setEvaluating(true)

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

            const isCorrect = data.score >= 85
            setStats(prev => ({
                correct: prev.correct + (isCorrect ? 1 : 0),
                total: prev.total + 1,
                streak: isCorrect ? prev.streak + 1 : 0,
            }))
        } catch {
            setResult({ score: 0, feedback: 'Ошибка оценки' })
        }
        setEvaluating(false)
    }

    function nextQuestion() {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setAnswer('')
            setResult(null)
        } else {
            // Level completed
            const accuracy = stats.correct / stats.total
            if (accuracy >= 0.7) {
                // Progress to next level
                if (currentLevel < 5) {
                    setCurrentLevel(prev => (prev + 1) as Difficulty)
                }
                setPhase('tasks') // Show tasks block
            } else {
                // Retry this level
                startTraining()
            }
        }
    }

    const progress = started ? ((currentIndex + (result ? 1 : 0)) / questions.length) * 100 : 0
    const currentQuestion = questions[currentIndex]

    return (
        <div className="page">
            <div className="container container--narrow">
                {!started ? (
                    // Start screen
                    <motion.div
                        className="trainer-start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="trainer-start__icon">
                            <GraduationCap size={48} />
                        </div>
                        <h1 className="page__title text-center">Тренажёр</h1>
                        <p className="page__subtitle text-center">
                            Вопросы по возрастанию сложности. Ответьте правильно на 70% — переходите на следующий уровень.
                        </p>

                        <div className="trainer-start__levels">
                            {([1, 2, 3, 4, 5] as Difficulty[]).map(d => (
                                <button
                                    key={d}
                                    className={cn('trainer-level glass', currentLevel === d && 'trainer-level--active')}
                                    onClick={() => setCurrentLevel(d)}
                                >
                                    <span className="trainer-level__num">{d}</span>
                                    <span className="trainer-level__label">{getDifficultyLabel(d)}</span>
                                </button>
                            ))}
                        </div>

                        <button className="btn btn--primary btn--lg" onClick={startTraining} style={{ marginTop: 'var(--space-8)' }}>
                            Начать тренировку
                            <ArrowRight size={18} />
                        </button>
                    </motion.div>
                ) : phase === 'tasks' ? (
                    // Tasks phase
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <Trophy size={48} style={{ color: 'var(--accent-yellow)', marginBottom: 'var(--space-4)' }} />
                        <h2 className="page__title">Уровень {currentLevel - 1} пройден!</h2>
                        <p className="page__subtitle">
                            Результат: {stats.correct}/{stats.total} правильных ответов
                        </p>
                        <div className="flex gap-4 justify-center" style={{ marginTop: 'var(--space-8)' }}>
                            <Link href="/tasks" className="btn btn--primary btn--lg">
                                Перейти к задачам
                            </Link>
                            <button className="btn btn--secondary btn--lg" onClick={() => { setPhase('questions'); startTraining() }}>
                                Продолжить тренировку
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    // Active training
                    <div className="trainer-active">
                        {/* Stats bar */}
                        <div className="trainer-stats glass glass--strong">
                            <div className="trainer-stat">
                                <BarChart3 size={16} />
                                <span>Уровень {currentLevel}</span>
                            </div>
                            <div className="trainer-stat">
                                <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
                                <span>{stats.correct}/{stats.total}</span>
                            </div>
                            <div className="trainer-stat">
                                <Flame size={16} style={{ color: 'var(--accent-orange)' }} />
                                <span>Серия: {stats.streak}</span>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="progress" style={{ marginBottom: 'var(--space-6)' }}>
                            <div className="progress__bar" style={{ width: `${progress}%` }} />
                        </div>

                        {/* Question */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                className="trainer-question glass glass--strong"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                                    Вопрос {currentIndex + 1} из {questions.length}
                                </div>
                                <h2 className="trainer-question__title">{currentQuestion?.title}</h2>
                                <p className="trainer-question__desc">{currentQuestion?.description}</p>

                                {!result ? (
                                    <div style={{ marginTop: 'var(--space-6)' }}>
                                        <textarea
                                            className="input textarea"
                                            placeholder="Ваш ответ..."
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            rows={5}
                                            disabled={evaluating}
                                        />
                                        <button
                                            className="btn btn--primary"
                                            onClick={handleSubmit}
                                            disabled={answer.trim().length < 10 || evaluating}
                                            style={{ marginTop: 'var(--space-4)' }}
                                        >
                                            {evaluating ? 'Оценка...' : 'Ответить'}
                                        </button>
                                    </div>
                                ) : (
                                    <motion.div
                                        className="trainer-result"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <div className={cn('trainer-result__score', result.score >= 85 ? 'trainer-result__score--pass' : 'trainer-result__score--fail')}>
                                            {result.score >= 85 ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                            <span>{result.score}%</span>
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
                                            {result.feedback}
                                        </p>
                                        <button className="btn btn--primary" onClick={nextQuestion} style={{ marginTop: 'var(--space-4)' }}>
                                            {currentIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить уровень'}
                                            <ArrowRight size={16} />
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <style jsx>{`
        .trainer-start {
          text-align: center;
          padding-top: var(--space-12);
        }
        .trainer-start__icon {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-xl);
          background: var(--color-primary-muted);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--space-6);
        }
        .trainer-start__levels {
          display: flex;
          gap: var(--space-3);
          justify-content: center;
          margin-top: var(--space-8);
        }
        .trainer-level {
          padding: var(--space-4) var(--space-6);
          cursor: pointer;
          border: none;
          text-align: center;
          min-width: 100px;
        }
        .trainer-level--active {
          border-color: var(--color-primary) !important;
          background: var(--color-primary-muted) !important;
        }
        .trainer-level__num {
          font-size: var(--font-size-2xl);
          font-weight: 800;
          display: block;
          color: var(--color-primary);
        }
        .trainer-level__label {
          font-size: var(--font-size-xs);
          color: var(--text-muted);
          display: block;
          margin-top: var(--space-1);
        }
        .trainer-stats {
          display: flex;
          gap: var(--space-6);
          padding: var(--space-4) var(--space-6);
          margin-bottom: var(--space-4);
        }
        .trainer-stat {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }
        .trainer-question {
          padding: var(--space-8);
        }
        .trainer-question__title {
          font-size: var(--font-size-xl);
          font-weight: 700;
          margin-bottom: var(--space-3);
        }
        .trainer-question__desc {
          color: var(--text-secondary);
          line-height: var(--line-height-relaxed);
          white-space: pre-wrap;
        }
        .trainer-result {
          margin-top: var(--space-6);
          padding-top: var(--space-6);
          border-top: 1px solid var(--border-color);
        }
        .trainer-result__score {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--font-size-2xl);
          font-weight: 800;
        }
        .trainer-result__score--pass { color: var(--accent-green); }
        .trainer-result__score--fail { color: var(--accent-red); }
      `}</style>
        </div>
    )
}
