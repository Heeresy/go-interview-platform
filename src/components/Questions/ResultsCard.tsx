'use client'

import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useReducedMotion } from '@/lib/useReducedMotion'

interface ResultsCardProps {
  score: number
  feedback: string
  referenceAnswer?: string
  onNextQuestion?: () => void
}

export function ResultsCard({
  score,
  feedback,
  referenceAnswer,
  onNextQuestion,
}: ResultsCardProps) {
  const isPassed = score >= 85
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className="results-card glass rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {isPassed ? (
            <motion.div
              animate={{ scale: prefersReducedMotion ? 1 : [0, 1.1, 1] }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.5 }
              }
            >
              <CheckCircle
                size={32}
                className="text-green-500"
                aria-label="Success"
              />
            </motion.div>
          ) : (
            <AlertCircle
              size={32}
              className="text-orange-500"
              aria-label="Warning"
            />
          )}
          <div>
            <span className="text-sm text-secondary">Your Score</span>
            <span className="text-3xl font-bold">{score}/100</span>
          </div>
        </div>
        <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
          {isPassed ? '✓ Passed' : '⚠ Needs Work'}
        </span>
      </div>

      <div className="feedback mb-6">
        <h3 className="font-semibold mb-2">Feedback</h3>
        <p className="text-secondary">{feedback}</p>
      </div>

      {referenceAnswer && (
        <details className="reference mb-6">
          <summary className="cursor-pointer font-semibold mb-2 hover:text-primary transition">
            📖 View Reference Answer
          </summary>
          <div className="mt-3 p-4 bg-secondary rounded text-secondary">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {referenceAnswer}
            </pre>
          </div>
        </details>
      )}

      <div className="flex gap-3">
        {onNextQuestion && (
          <motion.button
            onClick={onNextQuestion}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
            className="btn btn--primary flex-1"
          >
            Next Question →
          </motion.button>
        )}
        <button
          className="btn btn--secondary flex-1"
          aria-label="Review this question later"
        >
          Review Later
        </button>
      </div>
    </motion.div>
  )
}

