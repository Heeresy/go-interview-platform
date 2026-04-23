'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { GraduationCap, ArrowRight, CheckCircle2, XCircle, Trophy, Flame, BarChart3, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyLabel } from '@/lib/utils'
import { AuraCard } from '@/components/ui/AuraCard'
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <AuraCard className="trainer-start flex flex-col items-center p-12">
                            <div className="trainer-start__icon mb-8">
                                <GraduationCap size={48} />
                            </div>
                            <h1 className="text-4xl font-bold mb-4">Тренажёр</h1>
                            <p className="text-secondary text-lg mb-10 max-w-md">
                                Вопросы по возрастанию сложности. Ответьте правильно на 70% — переходите на следующий уровень.
                            </p>

                            <div className="grid grid--2 gap-4 mb-12 w-full max-w-2xl">
                                {([1, 2, 3, 4, 5] as Difficulty[]).map(d => (
                                    <button
                                        key={d}
                                        className={cn(
                                            'trainer-level-card relative p-6 rounded-2xl border-2 transition-all text-left overflow-hidden group',
                                            currentLevel === d
                                                ? 'border-primary bg-primary-10 ring-4 ring-primary/5'
                                                : 'border-glass-border bg-glass-bg hover:border-glass-border-hover hover:bg-glass-bg-strong'
                                        )}
                                        onClick={() => setCurrentLevel(d)}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-colors",
                                                currentLevel === d ? "bg-primary text-bg-primary" : "bg-bg-tertiary text-muted group-hover:text-primary"
                                            )}>
                                                {d}
                                            </div>
                                            <div>
                                                <div className={cn("font-bold text-lg", currentLevel === d ? "text-primary" : "text-primary")}>
                                                    {getDifficultyLabel(d)}
                                                </div>
                                                <div className="text-xs text-muted font-medium uppercase tracking-wider">
                                                    Уровень {d}
                                                </div>
                                            </div>
                                        </div>
                                        {currentLevel === d && (
                                            <motion.div
                                                layoutId="active-level-glow"
                                                className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <button className="btn btn--primary btn--lg px-12" onClick={startTraining}>
                                Начать тренировку
                                <ArrowRight size={18} />
                            </button>
                        </AuraCard>
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
                    <div className="trainer-active space-y-6">
                        {/* Stats bar */}
                        <AuraCard className="flex items-center justify-between p-4 px-8">
                            <div className="flex items-center gap-2 font-bold">
                                <BarChart3 size={18} className="text-primary" />
                                <span>Уровень {currentLevel}</span>
                            </div>
                            <div className="flex items-center gap-2 font-bold">
                                <CheckCircle2 size={18} className="text-green-500" />
                                <span>{stats.correct}/{stats.total}</span>
                            </div>
                            <div className="flex items-center gap-2 font-bold">
                                <Flame size={18} className="text-orange-500" />
                                <span>Серия: {stats.streak}</span>
                            </div>
                        </AuraCard>

                        {/* Progress */}
                        <div className="progress h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Question */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <AuraCard className="p-8">
                                    <div className="text-xs font-bold text-muted uppercase tracking-widest mb-4">
                                        Вопрос {currentIndex + 1} из {questions.length}
                                    </div>
                                    <h2 className="text-2xl font-bold mb-4">{currentQuestion?.title}</h2>
                                    <p className="text-secondary leading-relaxed mb-8 whitespace-pre-wrap">{currentQuestion?.description}</p>

                                    {!result ? (
                                        <div className="space-y-4">
                                            <textarea
                                                className="input textarea min-h-[160px]"
                                                placeholder="Ваш ответ..."
                                                value={answer}
                                                onChange={(e) => setAnswer(e.target.value)}
                                                disabled={evaluating}
                                            />
                                            <button
                                                className="btn btn--primary w-full py-4 text-lg"
                                                onClick={handleSubmit}
                                                disabled={answer.trim().length < 10 || evaluating}
                                            >
                                                {evaluating ? (
                                                    <><Loader2 size={20} className="animate-spin mr-2" /> Оценка...</>
                                                ) : 'Ответить'}
                                            </button>
                                        </div>
                                    ) : (
                                        <motion.div
                                            className="pt-8 border-t border-glass-border"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <div className={cn('flex items-center gap-3 text-2xl font-bold mb-4', result.score >= 85 ? 'text-green-500' : 'text-red-500')}>
                                                {result.score >= 85 ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                                                <span>{result.score}%</span>
                                            </div>
                                            <p className="text-secondary text-sm leading-relaxed mb-8">
                                                {result.feedback}
                                            </p>
                                            <button className="btn btn--primary w-full py-4 text-lg" onClick={nextQuestion}>
                                                {currentIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить уровень'}
                                                <ArrowRight size={20} className="ml-2" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AuraCard>
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
