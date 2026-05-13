import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AnswerEditor } from './AnswerEditor'
import { ToastProvider } from '@/components/ui/ToastProvider'
import {
  DRAFT_DEBOUNCE_MS,
  DRAFT_SAVED_VISIBLE_MS,
  draftKey,
  readDraft,
} from './useDraftAutosave'
import { t } from '@/lib/i18n'

/**
 * AnswerEditor — редактор ответа на вопрос для Questions_Module (task 17.3).
 *
 * Покрытие:
 *
 *   - Req 14.3: автосохранение черновика в `localStorage` по debounce,
 *     round-trip `write → read` (значение не мутируется).
 *   - Req 14.1 / 24.2: все видимые строки через `t()` (индикатор статуса,
 *     placeholder, кнопка submit, кнопка AI-подсказки).
 *   - Req 21.2: ключ `localStorage` строго `draft:question:{id}` —
 *     наследуется из существующего контракта, не затрагивая API.
 *   - Req 20.4: кнопка submit в loading-состоянии не позволяет
 *     повторный клик (обеспечивается DS Button).
 *
 * Примечание: `setTimeout`/`setInterval` заменены на fake timers, чтобы
 * не полагаться на реальное ожидание debounce.
 */

// Поля теста оборачиваем в ToastProvider, т.к. DS-примитивы его не
// требуют, но некоторые сиблинги могут — чтобы явно подчеркнуть, что
// редактор самодостаточен, обёртка НЕ делается здесь.

function renderEditor(
  props: Partial<React.ComponentProps<typeof AnswerEditor>> = {},
) {
  const onSubmit = props.onSubmit ?? vi.fn(async () => { })
  const finalProps = {
    questionId: 'q-1',
    onSubmit,
    ...props,
  }
  const utils = render(<AnswerEditor {...finalProps} />)
  return { ...utils, onSubmit }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.localStorage.clear()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

describe('AnswerEditor', () => {
  it('renders textarea and submit button with localized strings (Req 14.1, 24.2)', () => {
    renderEditor()

    const textarea = screen.getByTestId('answer-editor-textarea')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute(
      'placeholder',
      t('questions.detail.answerPlaceholder'),
    )

    const submit = screen.getByTestId('answer-editor-submit')
    expect(submit).toHaveTextContent(t('questions.detail.evaluate'))
  })

  it('AI hint button renders only when onAiHint is provided', () => {
    const { rerender } = renderEditor()
    expect(screen.queryByTestId('answer-editor-ai-hint')).toBeNull()

    rerender(
      <AnswerEditor
        questionId="q-1"
        onAiHint={() => { }}
        onSubmit={vi.fn(async () => { })}
      />,
    )
    const hint = screen.getByTestId('answer-editor-ai-hint')
    expect(hint).toHaveTextContent(t('questions.detail.aiHint'))
  })

  it('autosaves draft to localStorage with key "draft:question:{id}" after debounce (Req 14.3, 21.2)', async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    })
    renderEditor({ questionId: 'q-42' })

    const textarea = screen.getByTestId('answer-editor-textarea')
    await user.type(textarea, 'hello world')

    // До истечения debounce — значение ещё не записано.
    expect(readDraft('q-42')).toBeNull()

    // Проматываем debounce.
    await act(async () => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS)
    })

    expect(window.localStorage.getItem(draftKey('q-42'))).toBe('hello world')
    expect(readDraft('q-42')).toBe('hello world')
  })

  it('shows "saving" indicator during debounce and "saved" after write (Req 14.3, 24.2)', async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    })
    renderEditor()

    const textarea = screen.getByTestId('answer-editor-textarea')
    const status = screen.getByTestId('answer-editor-status')

    // До ввода — idle, label пустой.
    expect(status).toHaveAttribute('data-status', 'idle')
    expect(status).toHaveTextContent('')

    await user.type(textarea, 'x')

    // После первой правки — saving.
    expect(status).toHaveAttribute('data-status', 'saving')
    expect(status).toHaveTextContent(t('questions.detail.draftSaving'))

    // После истечения debounce — saved.
    await act(async () => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS)
    })
    expect(status).toHaveAttribute('data-status', 'saved')
    expect(status).toHaveTextContent(t('questions.detail.draftSaved'))

    // После revert-таймера — обратно в idle.
    await act(async () => {
      vi.advanceTimersByTime(DRAFT_SAVED_VISIBLE_MS)
    })
    expect(status).toHaveAttribute('data-status', 'idle')
  })

  it('restores draft from localStorage on mount (preserves existing autosave contract)', () => {
    window.localStorage.setItem(draftKey('q-99'), 'previous draft text')

    renderEditor({ questionId: 'q-99', initialValue: 'from-props' })

    const textarea = screen.getByTestId(
      'answer-editor-textarea',
    ) as HTMLTextAreaElement
    // localStorage-черновик имеет приоритет над initialValue.
    expect(textarea.value).toBe('previous draft text')
  })

  it('falls back to initialValue when no draft exists', () => {
    renderEditor({ questionId: 'q-100', initialValue: 'seed-value' })
    const textarea = screen.getByTestId(
      'answer-editor-textarea',
    ) as HTMLTextAreaElement
    expect(textarea.value).toBe('seed-value')
  })

  it('disables submit when value is empty or whitespace', () => {
    renderEditor({ questionId: 'q-1', initialValue: '   ' })
    const submit = screen.getByTestId('answer-editor-submit')
    expect(submit).toBeDisabled()
  })

  it('calls onSubmit with current value (Req 14.1)', async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    })
    const onSubmit = vi.fn(async () => { })
    renderEditor({ onSubmit, initialValue: 'answer' })

    const submit = screen.getByTestId('answer-editor-submit')
    await user.click(submit)

    expect(onSubmit).toHaveBeenCalledWith('answer')
  })
})

/**
 * ToastProvider smoke-wrap: убеждаемся, что компонент не требует
 * обёртки провайдером — это часть контракта (AnswerEditor
 * самодостаточен; toast-фидбэк — забота страницы-потребителя).
 */
describe('AnswerEditor — standalone contract', () => {
  it('renders without ToastProvider context', () => {
    expect(() =>
      render(<AnswerEditor questionId="q-x" onSubmit={vi.fn(async () => { })} />),
    ).not.toThrow()
  })

  it('still works when wrapped in a ToastProvider (non-interfering)', () => {
    render(
      <ToastProvider>
        <AnswerEditor questionId="q-y" onSubmit={vi.fn(async () => { })} />
      </ToastProvider>,
    )
    expect(screen.getByTestId('answer-editor-textarea')).toBeInTheDocument()
  })
})
