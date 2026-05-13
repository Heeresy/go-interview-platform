'use client'

/**
 * `<AnswerEditor />` — редактор ответа на вопрос (task 17.3;
 * Requirements 14.1, 14.3, 21.2, 24.2).
 *
 * Контракт:
 *
 *   Props:
 *     {
 *       questionId: string;
 *       initialValue?: string;
 *       onSubmit?: (value: string) => Promise<void>;
 *       onAiHint?: () => void | Promise<void>;
 *     }
 *
 *   Поведение:
 *
 *   - Автосохранение черновика через `useDraftAutosave(questionId, value)`
 *     (Req 14.3). Существующий контракт сохранён: ключ `localStorage`
 *     имеет формат `draft:question:{id}`, значение — сырой текст без
 *     обёртки/нормализации. API существующих модулей бизнес-логики
 *     (`src/lib/**`, `src/app/api/**`) не затрагивается (Req 21.2).
 *
 *   - При монтаже `value` инициализируется так:
 *       1) если в `localStorage` есть черновик — используется он
 *          (приоритет для восстановления незавершённой работы);
 *       2) иначе — переданный `initialValue` (default `''`).
 *
 *   - Индикатор сохранения (Req 14.3): подпись «Сохраняем…» во время
 *     debounce-save, кратковременная «Черновик сохранён» после
 *     успешной записи. Обе строки берутся через `t()` (Req 24.2).
 *
 *   - Submit `<Button>`-примитив DS v2 (`t('questions.detail.evaluate')`).
 *     loading-состояние кнопки работает по контракту DS Button:
 *     onClick возвращает Promise → внутренний `loading=true` до его
 *     резолва/реджекта; повторный клик заблокирован (Req 20.4).
 *
 *   - Опциональная кнопка AI-подсказки (`t('questions.detail.aiHint')`);
 *     рендерится только если передан `onAiHint`. Тоже async-aware
 *     через тот же Button-примитив.
 *
 *   - Textarea — DS `<Textarea />`-примитив с
 *     `placeholder={t('questions.detail.answerPlaceholder')}`.
 *
 *   - Все строки UI — через `t()` (Req 24.2); никакого хардкода
 *     строк на русском/английском. Все цвета/spacing/radius — токены
 *     Design_System (Req 1.8), никаких `#xxx` / `rgb()` / px-литералов.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'

import { Button, Textarea } from '@/components/ui'
import { t } from '@/lib/i18n'

import {
  readDraft,
  useDraftAutosave,
  type DraftSaveStatus,
} from './useDraftAutosave'

export interface AnswerEditorProps {
  /** Идентификатор вопроса; используется как ключ черновика. */
  questionId: string
  /**
   * Начальное значение (например, ответ, ранее сохранённый на сервере).
   * Используется только если в `localStorage` нет черновика. По
   * умолчанию `''`.
   */
  initialValue?: string
  /**
   * Обработчик submit. Должен вернуть Promise — тогда кнопка сама
   * покажет loading и заблокирует повторный клик.
   */
  onSubmit?: (value: string) => Promise<void>
  /**
   * Опциональный обработчик кнопки AI-подсказки. Если не передан,
   * кнопка не рендерится.
   */
  onAiHint?: () => void | Promise<void>
  /** Доп. className на корневой контейнер. */
  className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  width: '100%',
  minWidth: 0,
}

const ACTIONS_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  flexWrap: 'wrap',
  minWidth: 0,
}

const STATUS_STYLE: CSSProperties = {
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.4,
  color: 'var(--border-700)',
  minHeight: 'var(--space-5)',
  userSelect: 'none',
}

const STATUS_SAVED_STYLE: CSSProperties = {
  ...STATUS_STYLE,
  color: 'var(--success)',
}

const STATUS_ERROR_STYLE: CSSProperties = {
  ...STATUS_STYLE,
  color: 'var(--danger)',
}

const BUTTONS_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
}

// ── Helpers ──────────────────────────────────────────────────────────────

function statusLabel(status: DraftSaveStatus): string | null {
  switch (status) {
    case 'saving':
      return t('questions.detail.draftSaving')
    case 'saved':
      return t('questions.detail.draftSaved')
    case 'error':
      return t('state.error.unknown')
    case 'idle':
    default:
      return null
  }
}

function statusStyle(status: DraftSaveStatus): CSSProperties {
  if (status === 'saved') return STATUS_SAVED_STYLE
  if (status === 'error') return STATUS_ERROR_STYLE
  return STATUS_STYLE
}

/**
 * Начальное значение textarea.
 *
 * Порядок приоритетов:
 *   1) значение из `localStorage` под ключом `draft:question:{id}`,
 *      если оно присутствует (чтобы пользователь видел свою
 *      незавершённую работу);
 *   2) переданный `initialValue` (default `''`).
 *
 * SSR-safe: `readDraft` сам проверяет `typeof window` и try/catch,
 * поэтому на сервере возвращает `null`, и мы падаем на `initialValue`.
 */
function computeInitialValue(questionId: string, initialValue: string): string {
  const stored = readDraft(questionId)
  if (stored !== null) return stored
  return initialValue
}

// ── Component ────────────────────────────────────────────────────────────

export const AnswerEditor = forwardRef<HTMLTextAreaElement, AnswerEditorProps>(
  function AnswerEditor(
    { questionId, initialValue = '', onSubmit, onAiHint, className },
    ref,
  ) {
    // ВАЖНО: `useState(() => …)` — ленивая инициализация, чтобы
    // `readDraft(...)` вызвался ровно один раз на mount. Последующие
    // ре-рендеры не должны перечитывать localStorage.
    //
    // Примечание по SSR: `readDraft` на сервере возвращает `null`,
    // поэтому initial state там равен `initialValue`. После гидратации
    // клиентский эффект ниже синхронизирует стейт, если в localStorage
    // обнаружится более свежий черновик.
    const [value, setValue] = useState<string>(() =>
      computeInitialValue(questionId, initialValue),
    )

    // Гидратационная синхронизация: если компонент смонтировался
    // на сервере с `initialValue`, но в браузере уже есть черновик
    // — подтягиваем его после mount. Выполняется только один раз
    // на (mount × questionId).
    useEffect(() => {
      const stored = readDraft(questionId)
      if (stored !== null && stored !== value) {
        setValue(stored)
      }
      // Зависим только от questionId: смена value в результате
      // последующего ввода пользователем не должна триггерить
      // перечитывание storage.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionId])

    // Автосохранение. Hook сам хранит debounce-таймер, cleanup,
    // статус и round-trip-инвариант.
    const { status } = useDraftAutosave(questionId, value)

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value)
      },
      [],
    )

    // Submit: async-коллбек прокидывается напрямую в DS Button.
    // Button сам выставит `loading=true` на время Promise и
    // заблокирует повторный клик (Req 20.4, Req 20.5).
    const handleSubmit = useCallback(async () => {
      if (!onSubmit) return
      await onSubmit(value)
    }, [onSubmit, value])

    const handleAiHint = useCallback(async () => {
      if (!onAiHint) return
      await onAiHint()
    }, [onAiHint])

    const label = useMemo(() => statusLabel(status), [status])
    const labelStyle = useMemo(() => statusStyle(status), [status])

    // Кнопка submit блокируется, если онSubmit не передан вовсе
    // или значение пустое после trim (типичный UX — пустой ответ
    // не имеет смысла оценивать). Проверка по trim, а не по raw,
    // чтобы строки из одних пробелов не считались валидными.
    const submitDisabled = !onSubmit || value.trim().length === 0

    return (
      <div
        className={className}
        style={ROOT_STYLE}
        data-ds="answer-editor"
      >
        <Textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          placeholder={t('questions.detail.answerPlaceholder')}
          aria-label={t('questions.detail.answerPlaceholder')}
          rows={8}
          spellCheck
          data-testid="answer-editor-textarea"
        />

        <div style={ACTIONS_ROW_STYLE}>
          <span
            role="status"
            aria-live="polite"
            style={labelStyle}
            data-testid="answer-editor-status"
            data-status={status}
          >
            {label ?? ''}
          </span>

          <div style={BUTTONS_STYLE}>
            {onAiHint ? (
              <Button
                variant="ghost"
                size="md"
                onClick={handleAiHint}
                data-testid="answer-editor-ai-hint"
              >
                {t('questions.detail.aiHint')}
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="md"
              disabled={submitDisabled}
              onClick={handleSubmit}
              data-testid="answer-editor-submit"
            >
              {t('questions.detail.evaluate')}
            </Button>
          </div>
        </div>
      </div>
    )
  },
)

export default AnswerEditor
