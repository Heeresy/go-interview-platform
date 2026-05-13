'use client'

/**
 * `<Drawer />` — DS v2 side drawer primitive (task 7.4).
 *
 * Контракт совпадает с `<Dialog />` по focus-trap / Esc / portal, но слайдится
 * от края экрана (`position: 'left' | 'right' | 'bottom'`, по умолчанию
 * `'right'`). Mobile-first usage: Topbar-меню на Viewport_Mobile (Req 8.6).
 *
 *  - Рендерится в portal на `document.body` через `createPortal`.
 *  - При `open=true` сохраняет `document.activeElement`, фокусирует первый
 *    focusable внутри.
 *  - При `open=false` / unmount восстанавливает сохранённый фокус.
 *  - Focus trap на Tab / Shift+Tab — тот же модуль `focusTrap.ts`, что у Dialog.
 *  - Esc закрывает.
 *  - Клик по backdrop закрывает, если `closeOnBackdropClick !== false`.
 *  - Контейнер: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
 *    (при наличии `title`).
 *  - Визуально — `.glass`-панель, слайдится от края.
 *
 * Токены: все отступы / цвета / motion — из DS v2 (`--space-*`, `--radius-*`,
 * `--z-modal`, `--dur-base`, `--ease-emphasised`). Хардкода нет (Req 1.8).
 *
 * Requirements: 11.7, 22.1
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
  collectFocusable,
  handleFocusTrapKeyDown,
  restoreFocus,
  saveActiveElement,
} from './focusTrap'

export type DrawerPosition = 'left' | 'right' | 'bottom'

export interface DrawerProps {
  /** Управляемое состояние открытия. */
  open: boolean
  /** Обработчик закрытия: Esc + backdrop-click. */
  onClose: () => void
  /** Заголовок — если передан, связывается через `aria-labelledby`. */
  title?: string
  /** Тело drawer. */
  children: ReactNode
  /** Край экрана, от которого выезжает drawer. По умолчанию `'right'`. */
  position?: DrawerPosition
  /** Закрывать при клике на backdrop. По умолчанию `true`. */
  closeOnBackdropClick?: boolean
}

const BACKDROP_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--z-modal)',
  background:
    'color-mix(in oklch, var(--bg-0) 60%, transparent)',
  WebkitBackdropFilter: 'blur(6px)',
  backdropFilter: 'blur(6px)',
  animation:
    'ds-dialog-backdrop-in var(--dur-fast) var(--ease-standard)',
}

/**
 * Base styles common to all positions. `.glass` class contributes background,
 * blur, border, shadow. Border-radius is overridden per position so only the
 * inner corners are rounded.
 */
const BASE_CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  overflow: 'auto',
  animationDuration: 'var(--dur-base)',
  animationTimingFunction: 'var(--ease-emphasised)',
  animationFillMode: 'both',
}

const POSITION_STYLE: Record<DrawerPosition, CSSProperties> = {
  left: {
    top: 0,
    bottom: 0,
    left: 0,
    width: 'min(calc(var(--space-32) * 3), 100vw)',
    maxWidth: '100vw',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 'var(--radius-lg)',
    borderBottomRightRadius: 'var(--radius-lg)',
    animationName: 'ds-drawer-in-left',
  },
  right: {
    top: 0,
    bottom: 0,
    right: 0,
    width: 'min(calc(var(--space-32) * 3), 100vw)',
    maxWidth: '100vw',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 'var(--radius-lg)',
    borderBottomLeftRadius: 'var(--radius-lg)',
    animationName: 'ds-drawer-in-right',
  },
  bottom: {
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxHeight: 'calc(100dvh - var(--space-12))',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 'var(--radius-lg)',
    borderTopRightRadius: 'var(--radius-lg)',
    paddingBottom:
      'max(var(--space-6), env(safe-area-inset-bottom))',
    animationName: 'ds-drawer-in-bottom',
  },
}

const TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-lg)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
  color: 'var(--border-900)',
  margin: 0,
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  position = 'right',
  closeOnBackdropClick = true,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const reactId = useId()
  const titleId = `ds-drawer-title-${reactId}`

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = saveActiveElement()

    const container = containerRef.current
    let raf: number | null = null

    if (container) {
      const focusables = collectFocusable(container)
      const target = focusables[0] ?? container
      if (target === container && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1')
      }
      if (
        typeof window !== 'undefined' &&
        'requestAnimationFrame' in window
      ) {
        raf = window.requestAnimationFrame(() => {
          try {
            target.focus()
          } catch {
            // ignore
          }
        })
      }
    }

    return () => {
      if (raf !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(raf)
      }
      restoreFocus(previouslyFocusedRef.current)
      previouslyFocusedRef.current = null
    }
  }, [open])

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

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, onClose])

  const handleBackdropMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!closeOnBackdropClick) return
      if (e.target !== e.currentTarget) return
      onClose()
    },
    [closeOnBackdropClick, onClose],
  )

  if (!open) return null
  if (!mounted || typeof document === 'undefined') return null

  const containerStyle: CSSProperties = {
    ...BASE_CONTAINER_STYLE,
    ...POSITION_STYLE[position],
  }

  return createPortal(
    <div
      data-ds="drawer-backdrop"
      style={BACKDROP_STYLE}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        data-ds="drawer"
        data-position={position}
        className="glass"
        style={containerStyle}
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

export default Drawer
