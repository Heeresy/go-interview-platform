'use client'

/**
 * `<Dialog />` — DS v2 modal dialog primitive (task 7.4).
 *
 * Контракт (Requirements 11.7, 22.1):
 *
 *  - Рендерится в portal на `document.body` через `createPortal`.
 *  - При `open=true` сохраняет `document.activeElement` в `previouslyFocusedRef`
 *    и фокусирует первый focusable внутри контейнера.
 *  - При `open=false` / unmount восстанавливает сохранённый фокус.
 *  - Собственный focus trap на `keydown[Tab] / Shift+Tab`:
 *      * Tab с последнего focusable → переносит фокус на первый.
 *      * Shift+Tab с первого focusable → переносит фокус на последний.
 *      * Если фокус оказался вне контейнера (например, программно),
 *        следующий Tab/Shift+Tab вернёт его на первый/последний элемент.
 *  - Esc закрывает диалог (вызывает `onClose`).
 *  - Клик по backdrop закрывает диалог, если `closeOnBackdropClick !== false`
 *    (по умолчанию `true`). Клик внутри карточки не закрывает.
 *  - Контейнер — `role="dialog"` + `aria-modal="true"` + (при наличии `title`)
 *    `aria-labelledby`, указывающий на заголовок.
 *  - Визуально диалог — `.glass`-карточка из Design_System v2.
 *
 * Токены: все отступы / радиусы / цвета / motion берутся из DS v2 CSS vars
 * (`--space-*`, `--radius-*`, `--bg-*`, `--surface-*`, `--border-*`,
 * `--z-modal`, `--dur-*`, `--ease-*`). Хардкод-значений нет (Req 1.8).
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  FOCUSABLE_SELECTOR,
  collectFocusable,
  handleFocusTrapKeyDown,
  restoreFocus,
  saveActiveElement,
} from './focusTrap'

export interface DialogProps {
  /** Управляемое состояние открытия. */
  open: boolean
  /** Обработчик закрытия: вызывается на Esc и на backdrop-click (если разрешён). */
  onClose: () => void
  /** Заголовок диалога. Если передан — отображается и связывается через `aria-labelledby`. */
  title?: string
  /** Тело диалога. */
  children: ReactNode
  /** Закрывать при клике на backdrop. По умолчанию `true`. */
  closeOnBackdropClick?: boolean
}

const BACKDROP_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--z-modal)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-4)',
  background:
    'color-mix(in oklch, var(--bg-0) 60%, transparent)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
  animation:
    'ds-dialog-backdrop-in var(--dur-fast) var(--ease-standard)',
}

const CONTAINER_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 'calc(var(--space-32) * 4)', // ≈ 512px
  maxHeight: 'calc(100dvh - var(--space-8))',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'auto',
  animation:
    'ds-dialog-in var(--dur-base) var(--ease-emphasised)',
}

const TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-lg)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
  color: 'var(--border-900)',
  margin: 0,
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  closeOnBackdropClick = true,
}: DialogProps) {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const reactId = useId()
  const titleId = `ds-dialog-title-${reactId}`

  useEffect(() => {
    setMounted(true)
  }, [])

  // Save previous focus + focus first focusable on open;
  // restore previous focus on close/unmount.
  useLayoutEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = saveActiveElement()

    const container = containerRef.current
    if (container) {
      const focusables = collectFocusable(container)
      const target = focusables[0] ?? container
      // Ensure the container itself is focusable as a last resort.
      if (target === container && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1')
      }
      // Defer focus one tick so that the element is actually mounted/visible.
      const raf =
        typeof window !== 'undefined' && 'requestAnimationFrame' in window
          ? window.requestAnimationFrame(() => {
              try {
                target.focus()
              } catch {
                // ignore — target may have been unmounted between frames
              }
            })
          : null

      return () => {
        if (raf !== null && typeof window !== 'undefined') {
          window.cancelAnimationFrame(raf)
        }
        restoreFocus(previouslyFocusedRef.current)
        previouslyFocusedRef.current = null
      }
    }

    return () => {
      restoreFocus(previouslyFocusedRef.current)
      previouslyFocusedRef.current = null
    }
  }, [open])

  // Keyboard handling: Tab focus trap + Esc close.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      handleFocusTrapKeyDown(e, containerRef.current)
    }

    // capture phase so we win against child stopPropagation.
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, onClose])

  const handleBackdropMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!closeOnBackdropClick) return
      // Only close when mousedown originated on backdrop itself, not inside card.
      if (e.target !== e.currentTarget) return
      onClose()
    },
    [closeOnBackdropClick, onClose],
  )

  if (!open) return null
  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div
      data-ds="dialog-backdrop"
      style={BACKDROP_STYLE}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        data-ds="dialog"
        className="glass"
        style={CONTAINER_STYLE}
      >
        {title ? (
          <h2 id={titleId} style={TITLE_STYLE}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export default Dialog
// Re-export focusable selector for consumers/tests.
export { FOCUSABLE_SELECTOR }
