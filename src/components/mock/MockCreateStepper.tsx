'use client'

/**
 * `<MockCreateStepper />` — многошаговая форма создания мок-интервью
 * для `Mock_Module` (task 20.2; Requirements 17.1, 17.4, 20.3, 20.4,
 * 22.1, 24.2).
 *
 * Контракт:
 *
 *   Props:
 *     {
 *       onSubmit:   (data: MockDraft) => Promise<void>
 *       categories: { id: string; name: string }[]
 *     }
 *
 *   MockDraft:
 *     {
 *       title:       string
 *       categoryId:  string
 *       difficulty:  number    // 1…5
 *       durationMin: number    // 5…240
 *     }
 *
 * Структура (Req 17.4: «многошаговая форма с индикатором прогресса шагов»):
 *
 *   Top:    `<ProgressBar />` со значением `currentStep / totalSteps` и
 *           видимым label `t('mock.create.step', { current, total })`.
 *   Body:   текущий шаг внутри `<GlassCard />` (Req 22.1).
 *   Footer: «Назад» (disabled на шаге 1) + «Далее» / «Создать» на последнем.
 *
 * Шаги:
 *
 *   1. Название + категория (Input + native select — обёрнут DS-стилями
 *      `.ds-input` / `.ds-field` через тот же visual-контракт, что и
 *      Input.tsx). Поле, нарушившее валидацию, показывает inline
 *      `<Input error="…" />` (для select — собственный аналогичный
 *      `aria-invalid` + `<p role="alert" />`).
 *
 *   2. Сложность (chip-selector 1…5, single-select) + длительность
 *      (`<Input type="number" />`, диапазон 5…240).
 *
 *   3. Review + submit. Финальная кнопка «Создать» отображает
 *      loading-состояние через `Button loading` (Req 20.4: повторный
 *      клик блокируется до завершения), при ошибке `onSubmit`
 *      выше футера рендерится inline `<ErrorState />` (Req 20.3).
 *
 * Per-step валидация (Req 17.4):
 *   - кнопка «Далее» вычисляет ошибки текущего шага; при наличии
 *     ошибок шаг **не** меняется, ошибки помечаются у каждого
 *     поля inline через `error` пропс Input (или эквивалент для
 *     select).
 *   - На шаге 1 ошибки: пустое название (после trim), не выбранная
 *     категория, или категория не из списка `categories`.
 *   - На шаге 2: difficulty не в `1..5`, длительность не число
 *     или вне `[5..240]`.
 *
 * Поведение submit:
 *   - На шаге 3 кнопка «Создать» вызывает `props.onSubmit(draft)`.
 *   - На время Promise-резолва Button показывает spinner и блокирует
 *     повторный клик (Req 20.4). Параллельно мы сами держим локальный
 *     `isSubmitting`/`submitError` стейт, чтобы при reject отрисовать
 *     inline `<ErrorState />` (Req 20.3) и оставить пользователя на
 *     шаге 3 с заполненными данными.
 *
 * Стили: только токены DS — `--space-*`, `--radius-*`, `--fs-*`,
 * `--fw-*`, `--surface-*`, `--accent-*`, `--border-*`,
 * `--danger`, `--info-soft` (Req 1.8). Никакого хардкода.
 *
 * Локализация: все строки через `t(...)` (Req 24.2).
 */

import {
    useCallback,
    useId,
    useMemo,
    useState,
    type CSSProperties,
    type FormEvent,
} from 'react'

import {
    Badge,
    Button,
    ErrorState,
    GlassCard,
    Input,
    ProgressBar,
} from '@/components/ui'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { getDifficultyLabel } from '@/lib/utils'
import type { Difficulty } from '@/types/database'

// ── Public types ────────────────────────────────────────────────────────

/**
 * Нормализованный draft мок-интервью, как его отдаёт stepper в
 * `onSubmit`. Преднамеренно не использует `MockSet` из
 * `types/database.ts`: это «вход» формы, а не доменная модель.
 * Маппинг draft → insert-строки Supabase делает страница
 * `/mock/create` (task 20.4).
 */
export interface MockDraft {
    title: string
    categoryId: string
    difficulty: number
    durationMin: number
}

export interface MockCreateStepperProps {
    /**
     * Хэндлер финального submit. Должен вернуть Promise; reject
     * приводит к рендеру inline `<ErrorState />` над футером.
     */
    onSubmit: (data: MockDraft) => Promise<void>
    /**
     * Доступные категории. Если пуст — select на шаге 1
     * остаётся пустым (валидатор не пропускает дальше шаг 1).
     */
    categories: ReadonlyArray<{ id: string; name: string }>
    /** Дополнительный className на корневом `<form>`. */
    className?: string
}

// ── Constants ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 3
const DIFFICULTY_VALUES: ReadonlyArray<Difficulty> = [1, 2, 3, 4, 5]
const DURATION_MIN = 5
const DURATION_MAX = 240

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const FORM_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    width: '100%',
}

const CARD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    padding: 'var(--space-6)',
    borderRadius: 'var(--radius-lg)',
}

const STEP_HEADING_STYLE: CSSProperties = {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    color: 'var(--border-900)',
    margin: 0,
}

const FOOTER_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
}

const FOOTER_ACTIONS_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
}

// — Difficulty chip selector — single-select, токены DS.
const CHIPS_ROW_STYLE: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--space-2)',
    margin: 0,
    padding: 0,
    listStyle: 'none',
}

const CHIP_BASE_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-1)',
    minHeight: 'var(--space-11)', // ≥ 44px touch-target (Req 11.8)
    paddingBlock: 'var(--space-2)',
    paddingInline: 'var(--space-4)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1,
    cursor: 'pointer',
    transition:
        'background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
    background: 'var(--surface-300)',
    color: 'var(--border-800)',
    borderColor: 'var(--border-200)',
}

const CHIP_ACTIVE_STYLE: CSSProperties = {
    background: 'var(--info-soft)',
    color: 'var(--accent-600)',
    borderColor: 'var(--accent-600)',
}

// — Review-list — пары label/value.
const REVIEW_LIST_STYLE: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(8rem, max-content) 1fr',
    gap: 'var(--space-2) var(--space-4)',
    margin: 0,
    padding: 0,
    fontSize: 'var(--fs-md)',
    color: 'var(--border-900)',
}

const REVIEW_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-700)',
    margin: 0,
}

const REVIEW_VALUE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-md)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--border-900)',
    margin: 0,
    minWidth: 0,
    overflowWrap: 'anywhere',
}

// ── Validation ──────────────────────────────────────────────────────────

interface DraftErrors {
    title?: string
    categoryId?: string
    difficulty?: string
    durationMin?: string
}

interface DraftState {
    title: string
    categoryId: string
    difficulty: number | null
    durationMin: number | null
}

function validateStep(
    step: 1 | 2 | 3,
    draft: DraftState,
    categories: ReadonlyArray<{ id: string; name: string }>,
): DraftErrors {
    const errors: DraftErrors = {}
    if (step === 1) {
        if (draft.title.trim().length === 0) {
            errors.title = t('mock.create.titleError')
        }
        const known = categories.some((c) => c.id === draft.categoryId)
        if (!draft.categoryId || !known) {
            errors.categoryId = t('mock.create.categoryError')
        }
    }
    if (step === 2) {
        const d = draft.difficulty
        if (
            d === null ||
            !Number.isFinite(d) ||
            d < 1 ||
            d > 5 ||
            !Number.isInteger(d)
        ) {
            errors.difficulty = t('mock.create.difficultyError')
        }
        const dur = draft.durationMin
        if (
            dur === null ||
            !Number.isFinite(dur) ||
            dur < DURATION_MIN ||
            dur > DURATION_MAX
        ) {
            errors.durationMin = t('mock.create.durationError')
        }
    }
    if (step === 3) {
        // Финальный шаг просто агрегирует ошибки шагов 1+2 — это
        // защита от состояния «пользователь пошёл назад и сломал
        // ранее валидное поле».
        return {
            ...validateStep(1, draft, categories),
            ...validateStep(2, draft, categories),
        }
    }
    return errors
}

function isStepValid(
    step: 1 | 2 | 3,
    draft: DraftState,
    categories: ReadonlyArray<{ id: string; name: string }>,
): boolean {
    return Object.keys(validateStep(step, draft, categories)).length === 0
}

// ── Component ───────────────────────────────────────────────────────────

export function MockCreateStepper({
    onSubmit,
    categories,
    className,
}: MockCreateStepperProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [draft, setDraft] = useState<DraftState>({
        title: '',
        categoryId: '',
        difficulty: null,
        durationMin: null,
    })
    /** Ошибки появляются только после нажатия «Далее»/«Создать». */
    const [showErrors, setShowErrors] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<Error | null>(null)

    // Stable id для select-label/select-error связки (Input делает то же
    // самое внутри себя; для нашего собственного <select> делаем руками).
    const reactId = useId()
    const categorySelectId = `${reactId}-category`
    const categoryErrorId = `${categorySelectId}-error`

    // Валидация текущего шага — пересчитывается на каждом рендере.
    const errors = useMemo(
        () => validateStep(step, draft, categories),
        [step, draft, categories],
    )
    const showFieldErrors = showErrors

    const isFinalStep = step === TOTAL_STEPS

    const goBack = useCallback(() => {
        setShowErrors(false)
        setSubmitError(null)
        setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))
    }, [])

    const goNext = useCallback(() => {
        if (!isStepValid(step, draft, categories)) {
            setShowErrors(true)
            return
        }
        setShowErrors(false)
        setSubmitError(null)
        setStep((s) => (s < TOTAL_STEPS ? ((s + 1) as 1 | 2 | 3) : s))
    }, [step, draft, categories])

    const handleSubmit = useCallback(async () => {
        // Финальная валидация по всем шагам.
        if (!isStepValid(3, draft, categories)) {
            setShowErrors(true)
            return
        }
        setSubmitError(null)
        setIsSubmitting(true)
        try {
            await onSubmit({
                title: draft.title.trim(),
                categoryId: draft.categoryId,
                difficulty: draft.difficulty as number,
                durationMin: draft.durationMin as number,
            })
        } catch (err) {
            // Сохраняем ошибку для inline <ErrorState />; пользователь
            // остаётся на шаге 3 с заполненными данными (Req 20.3).
            setSubmitError(
                err instanceof Error ? err : new Error(String(err)),
            )
        } finally {
            setIsSubmitting(false)
        }
    }, [draft, categories, onSubmit])

    // Form submit (Enter в любом инпуте) делегируется в goNext/handleSubmit.
    const onFormSubmit = useCallback(
        (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            if (isFinalStep) {
                void handleSubmit()
            } else {
                goNext()
            }
        },
        [isFinalStep, handleSubmit, goNext],
    )

    // Field updaters — сбрасывают `submitError`, чтобы пользователь
    // не видел старую ошибку после правки данных.
    const setTitle = useCallback(
        (v: string) => {
            setDraft((d) => ({ ...d, title: v }))
            setSubmitError(null)
        },
        [],
    )
    const setCategoryId = useCallback(
        (v: string) => {
            setDraft((d) => ({ ...d, categoryId: v }))
            setSubmitError(null)
        },
        [],
    )
    const setDifficulty = useCallback(
        (v: number) => {
            setDraft((d) => ({ ...d, difficulty: v }))
            setSubmitError(null)
        },
        [],
    )
    const setDurationMin = useCallback(
        (raw: string) => {
            // Пустой ввод → null (триггерит ошибку валидации,
            // но не падает на parseInt(NaN)).
            const trimmed = raw.trim()
            if (trimmed === '') {
                setDraft((d) => ({ ...d, durationMin: null }))
                setSubmitError(null)
                return
            }
            const parsed = Number(trimmed)
            setDraft((d) => ({
                ...d,
                durationMin: Number.isFinite(parsed) ? parsed : null,
            }))
            setSubmitError(null)
        },
        [],
    )

    const progressLabel = t('mock.create.step', {
        current: step,
        total: TOTAL_STEPS,
    })

    // Категория для review.
    const selectedCategoryName = useMemo(() => {
        const found = categories.find((c) => c.id === draft.categoryId)
        return found?.name ?? '—'
    }, [categories, draft.categoryId])

    const selectedDifficultyLabel = useMemo(() => {
        const d = draft.difficulty
        if (d === 1 || d === 2 || d === 3 || d === 4 || d === 5) {
            return getDifficultyLabel(d as Difficulty)
        }
        return '—'
    }, [draft.difficulty])

    return (
        <form
            className={cn(className)}
            data-ds="mock-create-stepper"
            data-step={step}
            data-testid="mock-create-stepper"
            style={FORM_STYLE}
            onSubmit={onFormSubmit}
            noValidate
        >
            <ProgressBar
                value={step / TOTAL_STEPS}
                label={progressLabel}
                data-testid="mock-create-stepper-progress"
            />

            <GlassCard style={CARD_STYLE} data-testid="mock-create-stepper-step">
                {step === 1 ? (
                    <>
                        <h2 style={STEP_HEADING_STYLE}>
                            {t('mock.create.step1.heading')}
                        </h2>
                        <Input
                            label={t('mock.create.titleLabel')}
                            placeholder={t('mock.create.titlePlaceholder')}
                            value={draft.title}
                            onChange={(e) => setTitle(e.target.value)}
                            error={
                                showFieldErrors ? errors.title : undefined
                            }
                            data-testid="mock-create-stepper-title"
                            autoComplete="off"
                            maxLength={200}
                        />
                        <CategorySelect
                            id={categorySelectId}
                            errorId={categoryErrorId}
                            label={t('mock.create.categoryLabel')}
                            placeholder={t('mock.create.categoryPlaceholder')}
                            value={draft.categoryId}
                            categories={categories}
                            onChange={setCategoryId}
                            error={
                                showFieldErrors
                                    ? errors.categoryId
                                    : undefined
                            }
                        />
                    </>
                ) : null}

                {step === 2 ? (
                    <>
                        <h2 style={STEP_HEADING_STYLE}>
                            {t('mock.create.step2.heading')}
                        </h2>
                        <DifficultyChips
                            value={draft.difficulty}
                            onChange={setDifficulty}
                            error={
                                showFieldErrors
                                    ? errors.difficulty
                                    : undefined
                            }
                        />
                        <Input
                            label={t('mock.create.durationLabel')}
                            placeholder={t(
                                'mock.create.durationPlaceholder',
                            )}
                            type="number"
                            inputMode="numeric"
                            min={DURATION_MIN}
                            max={DURATION_MAX}
                            step={1}
                            value={
                                draft.durationMin === null
                                    ? ''
                                    : String(draft.durationMin)
                            }
                            onChange={(e) => setDurationMin(e.target.value)}
                            error={
                                showFieldErrors
                                    ? errors.durationMin
                                    : undefined
                            }
                            data-testid="mock-create-stepper-duration"
                        />
                    </>
                ) : null}

                {step === 3 ? (
                    <>
                        <h2 style={STEP_HEADING_STYLE}>
                            {t('mock.create.step3.heading')}
                        </h2>
                        <dl
                            style={REVIEW_LIST_STYLE}
                            data-testid="mock-create-stepper-review"
                        >
                            <dt style={REVIEW_LABEL_STYLE}>
                                {t('mock.create.reviewLabel.title')}
                            </dt>
                            <dd style={REVIEW_VALUE_STYLE}>
                                {draft.title.trim() || '—'}
                            </dd>
                            <dt style={REVIEW_LABEL_STYLE}>
                                {t('mock.create.reviewLabel.category')}
                            </dt>
                            <dd style={REVIEW_VALUE_STYLE}>
                                {selectedCategoryName}
                            </dd>
                            <dt style={REVIEW_LABEL_STYLE}>
                                {t('mock.create.reviewLabel.difficulty')}
                            </dt>
                            <dd style={REVIEW_VALUE_STYLE}>
                                {draft.difficulty != null ? (
                                    <Badge
                                        variant={difficultyBadgeVariant(
                                            draft.difficulty,
                                        )}
                                    >
                                        {selectedDifficultyLabel}
                                    </Badge>
                                ) : (
                                    '—'
                                )}
                            </dd>
                            <dt style={REVIEW_LABEL_STYLE}>
                                {t('mock.create.reviewLabel.duration')}
                            </dt>
                            <dd style={REVIEW_VALUE_STYLE}>
                                {draft.durationMin != null
                                    ? t('mock.create.reviewDurationValue', {
                                          value: draft.durationMin,
                                      })
                                    : '—'}
                            </dd>
                        </dl>
                    </>
                ) : null}
            </GlassCard>

            <div style={FOOTER_STYLE}>
                {submitError ? (
                    <ErrorState
                        messageKey="mock.create.submitError"
                        retry={() => {
                            void handleSubmit()
                        }}
                    />
                ) : null}
                <div style={FOOTER_ACTIONS_STYLE}>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={goBack}
                        disabled={step === 1 || isSubmitting}
                        data-testid="mock-create-stepper-back"
                    >
                        {t('common.back')}
                    </Button>
                    {isFinalStep ? (
                        <Button
                            type="submit"
                            variant="primary"
                            loading={isSubmitting}
                            data-testid="mock-create-stepper-submit"
                        >
                            {t('mock.create.submit')}
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="primary"
                            data-testid="mock-create-stepper-next"
                        >
                            {t('common.next')}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    )
}

// ── CategorySelect — DS-стилизованный native <select> ───────────────────

interface CategorySelectProps {
    id: string
    errorId: string
    label: string
    placeholder: string
    value: string
    categories: ReadonlyArray<{ id: string; name: string }>
    onChange: (value: string) => void
    error?: string
}

const SELECT_FIELD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    width: '100%',
    fontFamily: 'var(--font-sans)',
}

const SELECT_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-900)',
    lineHeight: 1.4,
}

const SELECT_ERROR_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--danger)',
    margin: 0,
}

function CategorySelect({
    id,
    errorId,
    label,
    placeholder,
    value,
    categories,
    onChange,
    error,
}: CategorySelectProps) {
    const hasError = typeof error === 'string' && error.length > 0
    return (
        <div style={SELECT_FIELD_STYLE}>
            <label htmlFor={id} style={SELECT_LABEL_STYLE}>
                {label}
            </label>
            <select
                id={id}
                className="ds-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={hasError ? true : undefined}
                aria-describedby={hasError ? errorId : undefined}
                data-testid="mock-create-stepper-category"
            >
                <option value="" disabled>
                    {placeholder}
                </option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name}
                    </option>
                ))}
            </select>
            {hasError ? (
                <p id={errorId} role="alert" style={SELECT_ERROR_STYLE}>
                    {error}
                </p>
            ) : null}
        </div>
    )
}

// ── DifficultyChips — chip-selector 1…5 (single-select) ─────────────────

interface DifficultyChipsProps {
    value: number | null
    onChange: (value: number) => void
    error?: string
}

const CHIP_FIELD_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
}

const CHIP_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-900)',
    lineHeight: 1.4,
}

function DifficultyChips({ value, onChange, error }: DifficultyChipsProps) {
    const hasError = typeof error === 'string' && error.length > 0
    const groupId = useId()
    const errorId = `${groupId}-error`
    return (
        <div
            style={CHIP_FIELD_STYLE}
            role="radiogroup"
            aria-labelledby={`${groupId}-label`}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? errorId : undefined}
        >
            <span id={`${groupId}-label`} style={CHIP_LABEL_STYLE}>
                {t('mock.create.difficultyLabel')}
            </span>
            <ul
                style={CHIPS_ROW_STYLE}
                data-testid="mock-create-stepper-difficulty"
            >
                {DIFFICULTY_VALUES.map((level) => {
                    const isActive = value === level
                    const style: CSSProperties = {
                        ...CHIP_BASE_STYLE,
                        ...(isActive ? CHIP_ACTIVE_STYLE : null),
                    }
                    return (
                        <li key={level}>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                data-ds="mock-create-stepper-difficulty-chip"
                                data-level={level}
                                data-active={isActive ? 'true' : undefined}
                                onClick={() => onChange(level)}
                                style={style}
                            >
                                {getDifficultyLabel(level)}
                            </button>
                        </li>
                    )
                })}
            </ul>
            {hasError ? (
                <p id={errorId} role="alert" style={SELECT_ERROR_STYLE}>
                    {error}
                </p>
            ) : null}
        </div>
    )
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Маппинг Difficulty → вариант Badge для review-шага. Совпадает с
 * MockCard для визуальной консистентности DS.
 */
function difficultyBadgeVariant(
    d: number,
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    if (!Number.isFinite(d)) return 'neutral'
    if (d <= 1) return 'success'
    if (d === 2) return 'info'
    if (d === 3) return 'info'
    if (d === 4) return 'warning'
    if (d >= 5) return 'danger'
    return 'neutral'
}

export default MockCreateStepper
