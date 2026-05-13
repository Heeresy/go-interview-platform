import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'

import {
  DRAFT_DEBOUNCE_MS,
  DRAFT_SAVED_VISIBLE_MS,
  clearDraft,
  draftKey,
  readDraft,
  useDraftAutosave,
  writeDraft,
} from './useDraftAutosave'

/**
 * useDraftAutosave — minimal localStorage-based draft autosave.
 *
 * Покрытие:
 *   - round-trip значений (включая пустые/unicode/многострочные);
 *   - debounce до фактической записи;
 *   - статусы `idle → saving → saved → idle`;
 *   - SSR/quota safety: `writeDraft` в failing storage не бросает
 *     и переводит статус в `error`.
 */

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false })
  window.localStorage.clear()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

describe('draftKey()', () => {
  it('builds key as "draft:question:{id}"', () => {
    expect(draftKey('q-1')).toBe('draft:question:q-1')
    expect(draftKey('42')).toBe('draft:question:42')
  })
})

describe('writeDraft / readDraft round-trip', () => {
  it('writes and reads back the exact value (simple text)', () => {
    expect(writeDraft('q-1', 'hello')).toBe(true)
    expect(readDraft('q-1')).toBe('hello')
  })

  it('preserves empty string', () => {
    expect(writeDraft('q-empty', '')).toBe(true)
    expect(readDraft('q-empty')).toBe('')
  })

  it('preserves unicode and emoji', () => {
    const value = 'Русский текст с эмодзи 🚀🌍\nна двух строках'
    expect(writeDraft('q-uni', value)).toBe(true)
    expect(readDraft('q-uni')).toBe(value)
  })

  it('readDraft returns null for missing key', () => {
    expect(readDraft('q-missing')).toBeNull()
  })

  it('clearDraft removes value from storage', () => {
    writeDraft('q-del', 'text')
    clearDraft('q-del')
    expect(readDraft('q-del')).toBeNull()
  })

  it('writeDraft returns false when storage setItem throws (quota / SecurityError)', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError')
      })
    try {
      expect(writeDraft('q-err', 'oops')).toBe(false)
    } finally {
      setItem.mockRestore()
    }
  })
})

describe('useDraftAutosave()', () => {
  it('does not write on first render (skipFirst=true default)', () => {
    renderHook(
      ({ v }: { v: string }) => useDraftAutosave('q-first', v),
      { initialProps: { v: 'initial' } },
    )
    // Даже если debounce истёк — запись на первом render не должна произойти.
    act(() => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS)
    })
    expect(readDraft('q-first')).toBeNull()
  })

  it('writes after debounce on value change', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDraftAutosave('q-dbnc', v),
      { initialProps: { v: '' } },
    )
    rerender({ v: 'typed' })

    // Сразу после изменения — статус `saving`, запись ещё не прошла.
    expect(result.current.status).toBe('saving')
    expect(readDraft('q-dbnc')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS)
    })

    expect(readDraft('q-dbnc')).toBe('typed')
    expect(result.current.status).toBe('saved')

    act(() => {
      vi.advanceTimersByTime(DRAFT_SAVED_VISIBLE_MS)
    })
    expect(result.current.status).toBe('idle')
  })

  it('debounce resets on each new change', () => {
    const { rerender } = renderHook(
      ({ v }: { v: string }) => useDraftAutosave('q-reset', v),
      { initialProps: { v: '' } },
    )
    rerender({ v: 'a' })
    act(() => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS - 50)
    })
    expect(readDraft('q-reset')).toBeNull()

    rerender({ v: 'ab' })
    act(() => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS - 50)
    })
    // Всё ещё ничего не записано — предыдущий таймер сброшен.
    expect(readDraft('q-reset')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS)
    })
    expect(readDraft('q-reset')).toBe('ab')
  })

  it('flush() writes immediately, bypassing debounce', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDraftAutosave('q-flush', v),
      { initialProps: { v: '' } },
    )
    rerender({ v: 'flushed' })
    act(() => {
      result.current.flush()
    })
    expect(readDraft('q-flush')).toBe('flushed')
    expect(result.current.status).toBe('saved')
  })

  it('status switches to "error" if storage is unavailable', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError')
      })
    try {
      const { result, rerender } = renderHook(
        ({ v }: { v: string }) => useDraftAutosave('q-fail', v),
        { initialProps: { v: '' } },
      )
      rerender({ v: 'x' })
      act(() => {
        vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS)
      })
      expect(result.current.status).toBe('error')
    } finally {
      setItem.mockRestore()
    }
  })
})
