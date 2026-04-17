'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface AnswerEditorProps {
  questionId: string
  onSubmit: (answer: string) => Promise<void>
}

export function AnswerEditor({ questionId, onSubmit }: AnswerEditorProps) {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!answer.trim()) {
      setError('Please enter an answer')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit(answer)
      setAnswer('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setLoading(false)
    }
  }, [answer, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="answer-editor"
    >
      <label htmlFor="answer-textarea" className="block mb-2 font-semibold">
        Your Answer
      </label>
      <textarea
        id="answer-textarea"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your answer here... (Ctrl+Enter to submit)"
        rows={6}
        disabled={loading}
        className="input w-full"
        aria-label="Answer textarea"
      />
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 text-sm mt-2"
        >
          {error}
        </motion.p>
      )}
      <motion.button
        onClick={handleSubmit}
        disabled={!answer.trim() || loading}
        whileTap={{ scale: 0.95 }}
        whileHover={!loading ? { scale: 1.02 } : {}}
        className="btn btn--primary btn--lg mt-4 w-full"
      >
        {loading ? 'Submitting...' : 'Submit Answer'}
      </motion.button>
    </motion.div>
  )
}

