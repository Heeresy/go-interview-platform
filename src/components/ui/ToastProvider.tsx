'use client'

/**
 * `<ToastProvider />` — React Context для постановки и удаления тостов (Req 20.5, 22.1).
 *
 * API хука:
 *   const { toast, dismiss } = useToast()
 *   const id = toast({ title, description?, variant?, durationMs? })
 *   dismiss(id)
 *
 * Поведение:
 *   - `variant`     — один из `success | error | info | warning`; default `info`.
 *   - `durationMs`  — положительное число мс до авто-закрытия; default 4000.
 *                     Значения `<= 0` либо нечисловые приводятся к дефолту.
 *                     `Infinity` — тост не закрывается автоматически (только через `dismiss`).
 *   - `toast(...)`  — возвращает id (предоставленный в opts.id или сгенерированный).
 *                     Если id уже существует — тост с этим id заменяется (таймер
 *                     сбрасывается), иначе добавляется в список.
 *   - `dismiss(id)` — удаляет тост и очищает его таймер.
 *
 * Layout (Req 20.5):
 *   - Контейнер — `position: fixed`, `z-index: var(--z-toast)`, `pointer-events: none`.
 *   - Desktop (≥ 768px): `top: var(--space-6); right: var(--space-6)`.
 *   - Mobile  (< 768px): `top: var(--space-4); left: 50%; transform: translateX(-50%)`.
 *   - Переключение — чистое CSS через `@media`, без JS-resize listener.
 *
 * SSR: на сервере провайдер не рендерит портал; монтирование в DOM выполняется
 * только после `useEffect` (`mounted`), чтобы `createPortal(document.body)` не
 * падал при серверном рендере.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Toast, type ToastVariant } from './Toast'

/**
 * Параметры одиночного тоста.
 *
 * Соответствует `ToastInput` из design.md (см. `.kiro/specs/ui-redesign-2026/design.md`).
 */
export interface ToastOptions {
  /** Опциональный id; если не задан — генерируется. */
  id?: string
  /** Вариант; default `info`. */
  variant?: ToastVariant
  /** Заголовок. */
  title?: string
  /** Опциональное описание. */
  description?: string
  /** Время жизни в мс; default 4000; `Infinity` — не закрывать автоматически. */
  durationMs?: number
}

export interface ToastHandle {
  /** Ставит тост в очередь; возвращает его id. */
  toast: (opts: ToastOptions) => string
  /** Закрывает тост по id (no-op, если id не найден). */
  dismiss: (id: string) => void
}

interface ToastItem {
  id: string
  variant: ToastVariant
  title?: string
  description?: string
}

const ToastContext = createContext<ToastHandle | null>(null)

const DEFAULT_DURATION_MS = 4000
const DEFAULT_VARIANT: ToastVariant = 'info'

/**
 * Класс контейнера (CSS определён в globals.css в составе DS v2):
 *   - `position: fixed; z-index: var(--z-toast); pointer-events: none;
 *      display: flex; flex-direction: column; gap: var(--space-3);`
 *   - `top: var(--space-4); left: 50%; transform: translateX(-50%);`
 *   - `@media (min-width: 768px)` → `top: var(--space-6); right: var(--space-6);
 *                                   left: auto; transform: none;`
 *
 * Если класс отсутствует (CI/тесты без prod CSS), fallback-стили ниже
 * устанавливают ту же разметку inline, чтобы компонент оставался
 * функционально корректным.
 */
const CONTAINER_CLASS = 'ds-toast-container'

/**
 * Inline fallback-стили контейнера: Mobile-first (верх по центру).
 * Desktop-позиционирование (правый верх) добавляется через `<style>`-блок
 * ниже в `MEDIA_DESKTOP_CSS`. Это убирает зависимость от внешнего CSS
 * в тестовом окружении (jsdom без globals.css), не ломая token-only политику:
 * все значения — CSS-переменные Design_System.
 */
const CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  zIndex: 'var(--z-toast)' as unknown as number,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  top: 'var(--space-4)',
  left: '50%',
  transform: 'translateX(-50%)',
}

/**
 * CSS, применяемый через `<style>`: Desktop (≥ 768px) переназначает позицию
 * тост-контейнера в правый верхний угол, Mobile остаётся вверху по центру.
 * Значения — строго токены DS (`--space-6`).
 */
const MEDIA_DESKTOP_CSS = `
@media (min-width: 768px) {
  .${CONTAINER_CLASS} {
    top: var(--space-6);
    right: var(--space-6);
    left: auto;
    transform: none;
  }
}
`

function genId(): string {
  // Вариант без зависимостей: timestamp + случайный хвост.
  return `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function resolveDuration(raw: number | undefined): number {
  if (raw === undefined) return DEFAULT_DURATION_MS
  if (typeof raw !== 'number' || Number.isNaN(raw)) return DEFAULT_DURATION_MS
  if (raw === Infinity) return Infinity
  if (raw <= 0) return DEFAULT_DURATION_MS
  return raw
}

export interface ToastProviderProps {
  children?: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)
  // Храним id → timeoutId, чтобы можно было сбросить таймер при replace/dismiss.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    setMounted(true)
  }, [])

  const clearTimer = useCallback((id: string) => {
    const timers = timersRef.current
    const handle = timers.get(id)
    if (handle !== undefined) {
      clearTimeout(handle)
      timers.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id)
      setItems((prev) => prev.filter((t) => t.id !== id))
    },
    [clearTimer],
  )

  const toast = useCallback(
    (opts: ToastOptions): string => {
      const id = opts.id ?? genId()
      const variant = opts.variant ?? DEFAULT_VARIANT
      const duration = resolveDuration(opts.durationMs)
      const next: ToastItem = {
        id,
        variant,
        title: opts.title,
        description: opts.description,
      }

      // Если id уже существует — replace (сбрасываем таймер, обновляем payload).
      clearTimer(id)
      setItems((prev) => {
        const idx = prev.findIndex((t) => t.id === id)
        if (idx === -1) return [...prev, next]
        const copy = prev.slice()
        copy[idx] = next
        return copy
      })

      if (duration !== Infinity) {
        const handle = setTimeout(() => {
          timersRef.current.delete(id)
          setItems((prev) => prev.filter((t) => t.id !== id))
        }, duration)
        timersRef.current.set(id, handle)
      }

      return id
    },
    [clearTimer],
  )

  // Очистка всех таймеров при анмонте провайдера.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const handle of timers.values()) clearTimeout(handle)
      timers.clear()
    }
  }, [])

  const value = useMemo<ToastHandle>(
    () => ({ toast, dismiss }),
    [toast, dismiss],
  )

  const portal =
    mounted && typeof document !== 'undefined'
      ? createPortal(
          <>
            <style>{MEDIA_DESKTOP_CSS}</style>
            <div
              className={CONTAINER_CLASS}
              data-ds="toast-container"
              // Inline-fallback: держит layout корректным, даже если DS CSS
              // отсутствует в текущем окружении (например, jsdom без globals.css).
              style={CONTAINER_STYLE}
            >
              {items.map((item) => (
                <Toast
                  key={item.id}
                  id={item.id}
                  variant={item.variant}
                  title={item.title}
                  description={item.description}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portal}
    </ToastContext.Provider>
  )
}

/**
 * Хук доступа к ToastProvider.
 *
 * Бросает `Error`, если вызывается вне `<ToastProvider />` — это делает
 * контрактную ошибку видимой при разработке, а не приводит к silent-no-op.
 */
export function useToast(): ToastHandle {
  const ctx = useContext(ToastContext)
  if (ctx === null) {
    throw new Error('useToast() must be used within <ToastProvider />')
  }
  return ctx
}
