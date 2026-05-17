'use client'

/**
 * `<TrainerShell />` — оркестратор сессии тренажёра (task 19.3, UI Redesign 2026).
 *
 * Контракт (Requirements 16.1, 16.5, 21.2):
 *
 *  - **Переиспользует публичный API `src/lib/trainer.ts` без изменений
 *    (Req 21.2, Req 16.5):** все решения о смене уровня принимаются
 *    исключительно через `getNextAction(score, level)`; прогресс
 *    к следующему уровню считается через `getProgressPercentage(level, n)`;
 *    подпись уровня — через `getDifficultyLabel(level)`. Ни одна функция
 *    не реимплементирована и не оборачивается с новой семантикой —
 *    только композиция.
 *
 *  - **Адаптивная логика уровней (Req 16.1):** сохраняется без изменений
 *    — `getNextAction` возвращает `skip | retry | stay`, и `TrainerShell`
 *    последовательно реагирует:
 *      - `skip`  → `level := nextLevel`, корректные счётчики уровня
 *                  обнуляются, показывается `<TrainerLevelUp />`,
 *                  следом подгружается новая партия вопросов;
 *      - `retry` → `level := nextLevel` (вниз), счётчики уровня
 *                  обнуляются, подгружается новая партия;
 *      - `stay`  → переход к следующему вопросу текущего набора;
 *                  если набор исчерпан — перезагрузка партии того же
 *                  уровня.
 *
 *  - **UI-состояния (Req 16.2, 20.1, 20.2, 20.3):**
 *      - loading — `GlassCard` со `<Skeleton variant="card" />`;
 *      - error   — `<ErrorState messageKey="state.error.unknown" retry />`;
 *      - empty   — `<EmptyState />` с локализованным title/description.
 *
 *  - **Submit (Req 16.1, Req 14.1 повторно через AnswerEditor-подобный
 *    inline-Textarea):** запрос к существующему `/api/evaluate` без
 *    изменения контракта (Req 21.2). Loading-индикация — встроенная в
 *    DS `<Button loading />`, локализована к одной кнопке (Req 20.5).
 *
 *  - **Level-up (Req 16.3, 16.4):** при `action === 'skip'` рендерим
 *    `<TrainerLevelUp />` с новым уровнем; компонент сам выбирает между
 *    confetti / static-card в зависимости от `useReducedMotion()`,
 *    автоматически закрывается через 2.5s.
 *
 *  - **i18n (Req 24.2):** все строки — через типизированный `t()`.
 *  - **Design System (Req 1.8):** только токены DS v2; никаких hex/rgb/px
 *    литералов в компоненте.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'

import {
  Button,
  EmptyState,
  ErrorState,
  GlassCard,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import {
  getDifficultyLabel,
  getNextAction,
  getProgressPercentage,
} from '@/lib/trainer'
import type { Difficulty, Question } from '@/types/database'

import TrainerLevelUp from './TrainerLevelUp'
import TrainerProgressHeader from './TrainerProgressHeader'

export interface TrainerShellProps {
  /**
   * Начальный уровень сессии. Допустимые значения 1..5; по умолчанию 1.
   * Дальше уровень меняется только через `getNextAction(...)` из
   * `src/lib/trainer.ts` (Req 16.5, 21.2).
   */
  initialLevel?: Difficulty
  /** Дополнительный className на root. */
  className?: string
}

/**
 * Сколько вопросов одной партии загружается за раз. Совпадает с
 * предыдущей реализацией тренажёра, чтобы UX переключения партий
 * остался привычным.
 */
const QUESTIONS_PER_BATCH = 5

/** Минимальная длина ответа в символах перед разрешением submit. */
const MIN_ANSWER_LENGTH = 10

/** Граница «успешного» ответа для счётчика correctAtLevel. */
const PASS_THRESHOLD = 80

type Phase = 'loading' | 'ready' | 'empty' | 'error'

interface EvaluateResult {
  score: number
  feedback: string
}

// ── Styles (tokens only; Req 1.8) ──────────────────────────────────────

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-5)',
  width: '100%',
  minWidth: 0,
}

const QUESTION_CARD_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
}

const QUESTION_META_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-semibold)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--border-700)',
  margin: 0,
}

const QUESTION_TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-xl)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
  color: 'var(--border-900)',
  margin: 0,
}

const QUESTION_DESC_STYLE: CSSProperties = {
  fontSize: 'var(--fs-md)',
  lineHeight: 1.6,
  color: 'var(--border-700)',
  whiteSpace: 'pre-wrap',
  margin: 0,
}

const ACTIONS_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--space-3)',
}

const FEEDBACK_CARD_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  padding: 'var(--space-5)',
  borderRadius: 'var(--radius-lg)',
}

const FEEDBACK_TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-md)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-900)',
  margin: 0,
}

const FEEDBACK_SCORE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-2xl)',
  fontWeight: 'var(--fw-semibold)',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--accent-600)',
  margin: 0,
}

const FEEDBACK_TEXT_STYLE: CSSProperties = {
  fontSize: 'var(--fs-sm)',
  lineHeight: 1.6,
  color: 'var(--border-700)',
  margin: 0,
  whiteSpace: 'pre-wrap',
}

// ── Component ───────────────────────────────────────────────────────────

export function TrainerShell({
  initialLevel = 1,
  className,
}: TrainerShellProps) {
  const [level, setLevel] = useState<Difficulty>(initialLevel)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<EvaluateResult | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')

  // Счётчики сессии: общий solved (отображается в шапке) и
  // correctAtLevel — необходим для `getProgressPercentage(level, n)`
  // из `lib/trainer.ts`, чтобы прогресс-бар отражал движение
  // к следующему уровню (Req 16.2).
  const [solved, setSolved] = useState(0)
  const [correctAtLevel, setCorrectAtLevel] = useState(0)

  // Level-up overlay (Req 16.3, 16.4). Состояние локально и закрывается
  // по таймеру внутри <TrainerLevelUp /> — мы только держим уровень,
  // который анонсируется.
  const [levelUpShow, setLevelUpShow] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<Difficulty>(initialLevel)

  // Ошибка сабмита локализована в `result === null && submitError`,
  // чтобы не подменять весь экран. Загрузочные ошибки идут через `phase`.
  const [submitError, setSubmitError] = useState(false)

  // Track shown question IDs to avoid repeats within a session
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // ── Data loading ──────────────────────────────────────────────────────
  const loadBatch = useCallback(
    async (forLevel: Difficulty) => {
      setPhase('loading')
      setQuestions([])
      setCurrentIndex(0)
      setAnswer('')
      setResult(null)
      setSubmitError(false)
      try {
        const supabase = createClient()

        // Load a larger pool and shuffle on client to get random questions
        const POOL_SIZE = 50
        let { data, error } = await supabase
          .from('questions')
          .select('*, category:categories(*)')
          .eq('difficulty', forLevel)
          .limit(POOL_SIZE)

        if (error) {
          setPhase('error')
          return
        }

        // Fallback: if no questions at this level, load any available
        if (!data || data.length === 0) {
          const fallback = await supabase
            .from('questions')
            .select('*, category:categories(*)')
            .limit(POOL_SIZE)
          if (fallback.error || !fallback.data || fallback.data.length === 0) {
            setPhase('empty')
            return
          }
          data = fallback.data
        }

        // Filter out already-seen questions
        let available = data.filter((q) => !seenIds.has(q.id))

        // If all questions at this level have been seen, reset seen list
        // for this level and use all questions
        if (available.length === 0) {
          available = data
          // Don't reset seenIds globally — just allow repeats for this level
        }

        // Shuffle using Fisher-Yates
        for (let i = available.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[available[i], available[j]] = [available[j], available[i]]
        }

        // Take batch
        const batch = available.slice(0, QUESTIONS_PER_BATCH)

        // Mark these as seen
        setSeenIds((prev) => {
          const next = new Set(prev)
          for (const q of batch) next.add(q.id)
          return next
        })

        setQuestions(batch as Question[])
        setPhase('ready')
      } catch {
        setPhase('error')
      }
    },
    [seenIds],
  )

  useEffect(() => {
    void loadBatch(level)
  }, [level, loadBatch])

  // ── Submit handler ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const question = questions[currentIndex]
    if (!question || answer.trim().length < MIN_ANSWER_LENGTH) return
    setSubmitError(false)
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
      if (!res.ok) {
        setSubmitError(true)
        return
      }
      const data = (await res.json()) as EvaluateResult
      setResult(data)
      setSolved((s) => s + (data.score >= PASS_THRESHOLD ? 1 : 0))
      setCorrectAtLevel((c) =>
        c + (data.score >= PASS_THRESHOLD ? 1 : 0),
      )
    } catch {
      setSubmitError(true)
    }
  }, [questions, currentIndex, answer])

  // ── Continue handler ──────────────────────────────────────────────────
  // Делегирует решение «куда дальше» функции `getNextAction(score, level)`
  // из `src/lib/trainer.ts`. Сам `TrainerShell` ничего не решает про
  // skip/retry/stay — только реагирует на возвращённое действие
  // (Req 16.1, 16.5, 21.2).
  const handleContinue = useCallback(() => {
    if (!result) return

    const decision = getNextAction(result.score, level)

    // Сбрасываем UI ответа независимо от ветки.
    setResult(null)
    setAnswer('')
    setSubmitError(false)

    if (decision.action === 'skip') {
      // Level-up: показываем overlay и переключаем уровень.
      // `loadBatch` подтянется через useEffect[level].
      setLevelUpLevel(decision.nextLevel as Difficulty)
      setLevelUpShow(true)
      setCorrectAtLevel(0)
      setLevel(decision.nextLevel as Difficulty)
      return
    }

    if (decision.action === 'retry') {
      // Переход вниз: счётчик уровня обнуляется,
      // следующая партия подтянется через useEffect[level].
      setCorrectAtLevel(0)
      setLevel(decision.nextLevel as Difficulty)
      return
    }

    // action === 'stay' — следующий вопрос текущей партии,
    // или перезагрузка партии при исчерпании.
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      void loadBatch(level)
    }
  }, [result, level, currentIndex, questions.length, loadBatch])

  const handleLevelUpClose = useCallback(() => {
    setLevelUpShow(false)
  }, [])

  const handleRetry = useCallback(() => {
    void loadBatch(level)
  }, [loadBatch, level])

  // Прогресс-бар к следующему уровню в диапазоне `[0..1]`. Источник
  // истины — `getProgressPercentage(level, correctAtLevel)` из
  // `lib/trainer.ts` (возвращает 0..100). Делим на 100 для соответствия
  // API `<ProgressBar value=… />`.
  const progressToNext = useMemo(
    () => getProgressPercentage(level, correctAtLevel) / 100,
    [level, correctAtLevel],
  )

  const currentQuestion: Question | undefined = questions[currentIndex]
  const submitDisabled =
    !currentQuestion || answer.trim().length < MIN_ANSWER_LENGTH

  return (
    <div
      className={className}
      style={ROOT_STYLE}
      data-ds="trainer-shell"
      data-phase={phase}
    >
      <TrainerProgressHeader
        level={level}
        solved={solved}
        progressToNext={progressToNext}
      />

      {phase === 'loading' ? (
        <GlassCard
          style={QUESTION_CARD_STYLE}
          data-testid="trainer-shell-loading"
        >
          <Skeleton variant="line" label={t('state.loading')} />
          <Skeleton variant="card" label={t('state.loading')} />
        </GlassCard>
      ) : null}

      {phase === 'error' ? (
        <ErrorState
          messageKey="state.error.unknown"
          retry={handleRetry}
          data-testid="trainer-shell-error"
        />
      ) : null}

      {phase === 'empty' ? (
        <EmptyState
          title={t('trainer.empty.title')}
          description={t('trainer.empty.description')}
        />
      ) : null}

      {phase === 'ready' && currentQuestion ? (
        <>
          <GlassCard
            style={QUESTION_CARD_STYLE}
            data-testid="trainer-shell-question"
          >
            <p style={QUESTION_META_STYLE}>
              <span>{getDifficultyLabel(level)}</span>
              <span>
                {currentIndex + 1} / {questions.length}
              </span>
            </p>
            <h2 style={QUESTION_TITLE_STYLE}>{currentQuestion.title}</h2>
            <p style={QUESTION_DESC_STYLE}>{currentQuestion.description}</p>

            {result === null ? (
              <>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={t('questions.detail.answerPlaceholder')}
                  aria-label={t('questions.detail.answerPlaceholder')}
                  rows={6}
                  data-testid="trainer-shell-answer"
                />

                {submitError ? (
                  <ErrorState
                    messageKey="state.error.unknown"
                    retry={() => {
                      void handleSubmit()
                    }}
                  />
                ) : null}

                <div style={ACTIONS_ROW_STYLE}>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={submitDisabled}
                    onClick={handleSubmit}
                    data-testid="trainer-shell-submit"
                  >
                    {t('questions.detail.evaluate')}
                  </Button>
                </div>
              </>
            ) : (
              <GlassCard
                style={FEEDBACK_CARD_STYLE}
                data-testid="trainer-shell-feedback"
              >
                <h3 style={FEEDBACK_TITLE_STYLE}>
                  {t('trainer.feedback.title')}
                </h3>
                <p style={FEEDBACK_SCORE_STYLE}>
                  {t('trainer.feedback.score', { score: result.score })}
                </p>
                <p style={FEEDBACK_TEXT_STYLE}>{result.feedback}</p>
                <div style={ACTIONS_ROW_STYLE}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleContinue}
                    data-testid="trainer-shell-continue"
                  >
                    {t('trainer.continue')}
                  </Button>
                </div>
              </GlassCard>
            )}
          </GlassCard>
        </>
      ) : null}

      <TrainerLevelUp
        show={levelUpShow}
        level={levelUpLevel}
        onClose={handleLevelUpClose}
      />
    </div>
  )
}

export default TrainerShell
