'use client'

import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface TestResult {
  testCaseNumber: number
  input: string
  expected: string
  actual: string
  passed: boolean
  executionTime: number
  tip?: string
}

interface TestResultsCardProps {
  totalTests: number
  passedTests: number
  totalTime: number
  results: TestResult[]
  compileError?: string
}

export function TestResultsCard({
  totalTests,
  passedTests,
  totalTime,
  results,
  compileError,
}: TestResultsCardProps) {
  const passPercentage = Math.round((passedTests / totalTests) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="test-results glass rounded-lg p-6"
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-secondary rounded p-4">
          <span className="text-xs text-secondary">Tests Passed</span>
          <span className="text-2xl font-bold block">
            {passedTests}/{totalTests}
          </span>
          <div className="h-1 bg-primary/20 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${passPercentage}%` }}
            />
          </div>
        </div>
        <div className="bg-secondary rounded p-4">
          <span className="text-xs text-secondary">Execution Time</span>
          <span className="text-2xl font-bold flex items-center gap-2">
            <Clock size={20} />
            {totalTime}ms
          </span>
        </div>
        <div className="bg-secondary rounded p-4">
          <span className="text-xs text-secondary">Status</span>
          <span
            className={`text-2xl font-bold block ${
              passedTests === totalTests ? 'text-green-500' : 'text-orange-500'
            }`}
          >
            {passedTests === totalTests ? '✓ Pass' : '⚠ Fail'}
          </span>
        </div>
      </div>

      {compileError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="compile-error bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6"
        >
          <div className="flex gap-3 mb-2">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <h3 className="font-semibold text-red-500">Compilation Error</h3>
          </div>
          <pre className="text-sm overflow-x-auto text-secondary font-mono">
            {compileError}
          </pre>
        </motion.div>
      )}

      <div className="test-cases space-y-3">
        {results.map((result, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`test-case rounded-lg overflow-hidden border-2 ${
              result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {result.passed ? (
                    <CheckCircle size={18} className="text-green-500" />
                  ) : (
                    <AlertCircle size={18} className="text-red-500" />
                  )}
                  <span className="font-semibold">Test Case {result.testCaseNumber}</span>
                </div>
                <span className="text-xs text-secondary">{result.executionTime}ms</span>
              </div>

              <div className="space-y-2 font-mono text-sm bg-secondary rounded p-3 mb-3">
                <div>
                  <span className="text-secondary">Input:</span> {result.input}
                </div>
                <div>
                  <span className="text-secondary">Expected:</span> {result.expected}
                </div>
                <div>
                  <span className="text-secondary">Actual:</span> {result.actual}
                </div>
              </div>

              {result.tip && !result.passed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-yellow-500/10 border-l-2 border-yellow-500 pl-3 py-2 text-sm"
                >
                  💡 {result.tip}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

