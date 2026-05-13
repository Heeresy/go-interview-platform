'use client'

/**
 * `<QuestionDetail />` — страничный layout вопроса для `Questions_Module`
 * (task 17.2; Requirements 14.1, 14.5, 14.6).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       question: Question;
 *       children?: ReactNode;   // AnswerEditor-slot (правая колонка на Desktop)
 *       className?: string;
 *     }
 *
 *   Layout (Req 14.5, 14.6) — через CSS Grid в `QuestionDetail.css`:
 *     - Viewport_Mobile (< 768px) и Viewport_Tablet (768..1024px):
 *         grid-template-columns: 1fr — одноколоночный вертикальный
 *         стек; двухколоночный режим ЗАПРЕЩЁН.
 *     - Viewport_Desktop/Wide (>= 1024px):
 *         grid-template-columns: 1fr 1fr — ДВЕ колонки; слева —
 *         содержимое вопроса (GlassPanel), справа — AnswerEditor-slot.
 *
 *   Брейкпоинт реализован ИСКЛЮЧИТЕЛЬНО через CSS
 *   `@media (min-width: 1024px)` — без JS width-check
 *   (`window.innerWidth`, `matchMedia` listener и т.п.), чтобы
 *   исключить промежуточные состояния при resize (прямое ограничение
 *   постановки задачи 17.2).
 *
 *   Левая колонка:
 *     - GlassPanel с заголовком (`question.title`);
 *     - Badge сложности + Badge категории;
 *     - полное описание (`question.description`) — рендерится через
 *       существующий `MarkdownContent`, если описание непустое;
 *       если описание пусто — ничего не рендерится для description-блока;
 *     - подсказка (`question.hint`) в свёрнутом виде — кнопка «Показать
 *       подсказку»; по клику раскрывает текст. Если `hint === null`
 *       или пусто — блок подсказки не рендерится.
 *
 *   Правая колонка:
 *     - рендерит `children` (AnswerEditor инжектится консьюмером).
 *       Если `children` не переданы — колонка остаётся пустой (контракт
 *       задачи: слот опционален для переиспользования компонента).
 *
 *   i18n (Req 24.2): все строки через `t('questions.*')`; хардкод-текста
 *   в компоненте нет.
 *
 *   Design_System (Req 1.8): значения spacing / radius / typography
 *   приходят из CSS-токенов в `QuestionDetail.css`; визуальный контракт
 *   `.glass` наследуется от GlassPanel. В TSX нет px / `#xxx` / `rgb()`.
 */

import * as React from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { Badge, GlassPanel } from '@/components/ui'
import MarkdownContent from '@/components/ui/MarkdownContent'
import { t } from '@/lib/i18n'
import { getDifficultyLabel } from '@/lib/utils'
import type { Difficulty, Question } from '@/types/database'

import './QuestionDetail.css'

export interface QuestionDetailProps {
    /** Вопрос для рендера (с опциональным joined `category`). */
    question: Question
    /**
     * AnswerEditor-slot. Когда задан — рендерится в правой колонке
     * на Desktop/Wide и ниже описания на Mobile/Tablet.
     */
    children?: ReactNode
    /** Дополнительный className на корневой grid-контейнер. */
    className?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Маппинг Difficulty → вариант Badge. Согласован с `QuestionsList`:
 * 1 — success, 2–3 — info, 4 — warning, 5 — danger. Цветовая семантика
 * всегда берётся из токенов DS.
 */
function difficultyBadgeVariant(
    d: Difficulty,
): 'success' | 'info' | 'warning' | 'danger' {
    if (d <= 1) return 'success'
    if (d === 2 || d === 3) return 'info'
    if (d === 4) return 'warning'
    return 'danger'
}

/**
 * Эвристика «описание похоже на markdown».
 *
 * Мы НЕ анализируем `question.description` потенциально сложным
 * парсером. Вместо этого применяем дешёвую эвристику: если в строке
 * встречаются типичные markdown-токены (заголовки, список, код,
 * ссылки, bold/italic), — отдаём её в `MarkdownContent`. Иначе —
 * рендерим как plain-text с `white-space: pre-wrap` (CSS-правило
 * `.question-detail__description`), что тоже полностью закрывает
 * контракт постановки задачи «markdown-rendered if supported,
 * otherwise plain text with white-space: pre-wrap».
 *
 * Никаких runtime-побочных эффектов эвристика не имеет.
 */
function looksLikeMarkdown(text: string): boolean {
    // Быстрые проверки наиболее частых md-конструкций.
    // Каждая строка может начинаться с заголовка или списка;
    // fence-блок кода \`\`\`; инлайн-код; ссылка [text](url);
    // bold **text**; italic *text* / _text_.
    if (/```/.test(text)) return true
    if (/(^|\n)#{1,6}\s/.test(text)) return true
    if (/(^|\n)\s*[-*+]\s/.test(text)) return true
    if (/(^|\n)\s*\d+\.\s/.test(text)) return true
    if (/`[^`\n]+`/.test(text)) return true
    if (/\[[^\]]+\]\([^)]+\)/.test(text)) return true
    if (/\*\*[^*\n]+\*\*/.test(text)) return true
    if (/(^|\s)_[^_\n]+_(\s|$)/.test(text)) return true
    return false
}

// ── Hint (collapsible) ──────────────────────────────────────────────────

interface HintBlockProps {
    hint: string
}

function HintBlock({ hint }: HintBlockProps) {
    const [open, setOpen] = React.useState(false)
    const hintId = React.useId()

    return (
        <div
            className="question-detail__hint"
            data-ds="question-detail-hint"
            data-open={open ? 'true' : 'false'}
        >
            <button
                type="button"
                className="question-detail__hint-toggle"
                aria-expanded={open}
                aria-controls={hintId}
                onClick={() => setOpen((v) => !v)}
                data-testid="question-detail-hint-toggle"
            >
                <span>
                    {open
                        ? t('questions.detail.hint.hide')
                        : t('questions.detail.hint.show')}
                </span>
                <span className="question-detail__hint-chevron" aria-hidden>
                    <ChevronDown size={16} aria-hidden />
                </span>
            </button>
            {open ? (
                <p
                    id={hintId}
                    className="question-detail__hint-body"
                    data-testid="question-detail-hint-body"
                >
                    {hint}
                </p>
            ) : null}
        </div>
    )
}

// ── Public component ─────────────────────────────────────────────────────

export function QuestionDetail({
    question,
    children,
    className,
}: QuestionDetailProps) {
    const rootClassName = className
        ? `question-detail ${className}`
        : 'question-detail'

    const categoryName = question.category?.name ?? null
    const difficultyVariant = difficultyBadgeVariant(question.difficulty)
    const description = question.description ?? ''
    const hint = question.hint && question.hint.trim() ? question.hint : null

    return (
        <div
            className={rootClassName}
            data-ds="question-detail"
            data-question-id={question.id}
        >
            <GlassPanel
                className="question-detail__content"
                data-testid="question-detail-content"
            >
                <header className="question-detail__header">
                    <div
                        className="question-detail__badges"
                        data-testid="question-detail-badges"
                    >
                        <Badge variant={difficultyVariant}>
                            {getDifficultyLabel(question.difficulty)}
                        </Badge>
                        {categoryName ? (
                            <Badge variant="neutral">{categoryName}</Badge>
                        ) : null}
                    </div>
                    <h1 className="question-detail__title">{question.title}</h1>
                </header>

                {description ? (
                    <section
                        aria-label={t('questions.detail.description')}
                        data-testid="question-detail-description"
                    >
                        {looksLikeMarkdown(description) ? (
                            <MarkdownContent content={description} />
                        ) : (
                            <p className="question-detail__description">
                                {description}
                            </p>
                        )}
                    </section>
                ) : null}

                {hint ? <HintBlock hint={hint} /> : null}
            </GlassPanel>

            <div
                className="question-detail__answer"
                data-testid="question-detail-answer-slot"
            >
                {children}
            </div>
        </div>
    )
}

export default QuestionDetail
