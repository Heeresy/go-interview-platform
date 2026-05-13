'use client'

/**
 * `useDraftAutosave` — минимальный hook автосохранения черновиков
 * ответов пользователя (Requirement 14.3, 21.2).
 *
 * Контракт:
 *
 *   const { status, flush } = useDraftAutosave(questionId, value, opts?)
 *
 *   - `questionId` — идентификатор вопроса. Ключ черновика строится
 *                    строго как `draft:question:{questionId}` (точный
 *                    формат требует постановка задачи 17.3).
 *   - `value`      — текущее значение поля ответа (контролируемое
 *                    состояние, которое обычно живёт в `AnswerEditor`).
 *   - `opts.debounceMs` — задержка между изменением `value` и записью
 *                    (default `DRAFT_DEBOUNCE_MS = 500`). Любое новое
 *                    изменение сбрасывает таймер.
 *   - `opts.skipFirst`  — пропустить первое срабатывание после монтажа
 *                    (default `true`). Начальный рендер с
 *                    `value === initialValue` не должен порождать запись.
 *
 *   Возврат:
 *     - `status` — `"idle" | "saving" | "saved" | "error"`:
 *         * `saving` — между правкой и истечением debounce;
 *         * `saved`  — короткое окно после успешной записи (1500ms);
 *         * `error`  — последняя запись не прошла (storage недоступен /
 *                      превышена квота / SecurityError). Новая правка
 *                      автоматически переводит статус обратно в `saving`.
 *     - `flush`  — форсированная немедленная запись текущего значения
 *                      (используется, например, при unmount страницы).
 *
 * Контракт round-trip (Req 14.3, Property 10, task 17.4):
 *
 *   writeDraft(id, v) → readDraft(id) === v
 *
 *   поэтому мы сохраняем значение как есть (без JSON-wrap, без
 *   trim / нормализации). Любой непустой `string` (включая эмодзи,
 *   перевод строк, нулевой символ) должен прочитаться идентично.
 *
 * Безопасность хранилища (Req 21.2, параллель с `theme.ts` / `Sidebar.tsx`):
 *
 *   - SSR-safe: все обращения к `window.localStorage` обёрнуты
 *     `typeof window === 'undefined'` чеком + try/catch;
 *   - при недоступности storage (приватный режим, quota exceeded,
 *     политика браузера) — `writeDraft` возвращает `false`, `readDraft`
 *     возвращает `null`, `clearDraft` — no-op; ничего не кидается
 *     и ничего не логгируется в консоль.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Default debounce window between keystrokes and storage write. */
export const DRAFT_DEBOUNCE_MS = 500

/** Окно, в течение которого статус `"saved"` остаётся видимым. */
export const DRAFT_SAVED_VISIBLE_MS = 1500

/** Статус цикла автосохранения. */
export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Возвращает ключ `localStorage` для черновика конкретного вопроса.
 *
 * Формат строго `draft:question:{id}` — диктуется постановкой задачи
 * 17.3 и сохраняется как единственная точка истины, чтобы все
 * читатели/писатели ссылались на тот же ключ без дублирования литерала.
 */
export function draftKey(questionId: string): string {
  return `draft:question:${questionId}`
}

/**
 * Безопасное чтение черновика.
 *
 * Возвращает:
 *   - сохранённую строку, если ключ присутствует;
 *   - `null`, если ключ отсутствует или storage недоступен.
 */
export function readDraft(questionId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(draftKey(questionId))
  } catch {
    return null
  }
}

/**
 * Безопасная запись черновика.
 *
 * Возвращает `true` при успехе, `false` — если storage недоступен
 * (приватный режим, превышена квота, SecurityError). Ничего
 * не бросает и не пишет в консоль.
 */
export function writeDraft(questionId: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(draftKey(questionId), value)
    return true
  } catch {
    return false
  }
}

/**
 * Безопасное удаление черновика.
 */
export function clearDraft(questionId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(draftKey(questionId))
  } catch {
    /* no-op */
  }
}

export interface UseDraftAutosaveOptions {
  /** Задержка debounce в мс. По умолчанию `DRAFT_DEBOUNCE_MS`. */
  debounceMs?: number
  /**
   * Пропустить первое срабатывание после mount (default `true`).
   * Начальный рендер, где `value === initialValue`, не должен
   * триггерить запись.
   */
  skipFirst?: boolean
}

export interface UseDraftAutosaveResult {
  /** Текущий статус цикла автосохранения. */
  status: DraftSaveStatus
  /**
   * Принудительно записать текущее значение прямо сейчас (bypass debounce).
   * Используется, например, при submit или unmount страницы.
   */
  flush: () => void
}

/**
 * Hook автосохранения черновика на `localStorage` с debounce.
 *
 * Инвариант round-trip: после завершения цикла `writeDraft`,
 * `readDraft(questionId)` возвращает ровно `value` (Property 10,
 * Req 14.3).
 */
export function useDraftAutosave(
  questionId: string,
  value: string,
  opts?: UseDraftAutosaveOptions,
): UseDraftAutosaveResult {
  const debounceMs = opts?.debounceMs ?? DRAFT_DEBOUNCE_MS
  const skipFirst = opts?.skipFirst ?? true

  const [status, setStatus] = useState<DraftSaveStatus>('idle')

  // Таймер debounce-записи. `null` — нет ожидающих записей.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Таймер возврата статуса "saved" → "idle".
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Флаг «это первый рендер» — для пропуска начального save (skipFirst).
  const isFirstRenderRef = useRef(true)
  // Последнее значение — читается из таймера при срабатывании, чтобы
  // не замыкаться на устаревший `value`.
  const latestValueRef = useRef(value)
  latestValueRef.current = value
  // Последний id — читается из таймера. Если id меняется между
  // запуском таймера и его срабатыванием, пишем в уже текущий ключ.
  const latestIdRef = useRef(questionId)
  latestIdRef.current = questionId

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [])

  const clearRevertTimer = useCallback(() => {
    if (revertTimerRef.current !== null) {
      clearTimeout(revertTimerRef.current)
      revertTimerRef.current = null
    }
  }, [])

  const performSave = useCallback(() => {
    const ok = writeDraft(latestIdRef.current, latestValueRef.current)
    if (ok) {
      setStatus('saved')
      clearRevertTimer()
      revertTimerRef.current = setTimeout(() => {
        revertTimerRef.current = null
        setStatus('idle')
      }, DRAFT_SAVED_VISIBLE_MS)
    } else {
      setStatus('error')
    }
  }, [clearRevertTimer])

  // Основной эффект: на изменение value планирует debounce-save.
  useEffect(() => {
    if (skipFirst && isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }

    // Новая правка: убираем "saved"-indicator (если он висит) и переходим
    // в "saving". Debounce-таймер пересоздаём.
    setStatus('saving')
    clearRevertTimer()
    clearSaveTimer()

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      performSave()
    }, debounceMs)
    // Cleanup выполняется только на unmount (см. второй useEffect);
    // здесь возврата нет сознательно — иначе cleanup между рендерами
    // будет отменять наш же свежесозданный таймер.
  }, [value, debounceMs, skipFirst, clearRevertTimer, clearSaveTimer, performSave])

  // Cleanup при unmount: гарантированно убиваем все таймеры, чтобы
  // не было «висящих» setState после размонтирования компонента.
  useEffect(() => {
    return () => {
      clearSaveTimer()
      clearRevertTimer()
    }
  }, [clearSaveTimer, clearRevertTimer])

  const flush = useCallback(() => {
    clearSaveTimer()
    performSave()
  }, [clearSaveTimer, performSave])

  return { status, flush }
}
