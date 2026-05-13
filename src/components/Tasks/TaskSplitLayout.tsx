/**
 * TaskSplitLayout — three-pane resizable layout для страницы задачи.
 *
 * Контракт:
 *   - Клиентский компонент (нужен localStorage + pointer events).
 *   - Viewport_Desktop (≥ 1024px): три горизонтальные панели — описание / редактор
 *     / execution — с двумя drag-хэндлами между ними. Пользователь тянет
 *     хэндл, процентные ширины панелей пересчитываются и сохраняются
 *     в `localStorage["tasks:splitLayout"]` (try/catch).
 *   - Viewport_Mobile / Tablet (< 1024px): панели стекируются вертикально,
 *     resize отключён, хэндлы не рендерятся.
 *   - Переключение режимов через `window.matchMedia("(min-width: 1024px)")`
 *     на клиенте; до первого монтирования рендерится mobile-layout (safe
 *     fallback без гидрационных рассогласований).
 *
 * Токены: `--space-*`, `--radius-lg`, `--surface-500`, `--border-300`,
 * `--border-500`, `--accent-600`, `--dur-fast`, `--ease-standard`, `--z-content`.
 * Хардкод-значений цвета / spacing / radius нет (Req 1.8).
 *
 * Requirements: 15.1, 15.4
 */

'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

export interface TaskSplitLayoutProps {
  description: ReactNode
  editor: ReactNode
  execution: ReactNode
}

/** Ключ persist-стораджа. */
const STORAGE_KEY = 'tasks:splitLayout'

/**
 * Минимальная ширина панели в процентах — защита от «коллапса» панели в
 * ноль при активном drag. С тремя панелями и `MIN_PCT = 15` гарантируем
 * минимум 15% для каждой и запас 55% на две оставшиеся.
 */
const MIN_PCT = 15

/** Значения по умолчанию: 30% / 40% / 30%. */
const DEFAULT_SIZES: PaneSizes = { left: 30, middle: 40, right: 30 }

interface PaneSizes {
  left: number
  middle: number
  right: number
}

/** 1024px — брейкпоинт Viewport_Desktop согласно design.md. */
const DESKTOP_MQ = '(min-width: 1024px)'

function isValidSizes(value: unknown): value is PaneSizes {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const { left, middle, right } = v
  if (
    typeof left !== 'number' ||
    typeof middle !== 'number' ||
    typeof right !== 'number'
  ) {
    return false
  }
  if (!Number.isFinite(left) || !Number.isFinite(middle) || !Number.isFinite(right)) {
    return false
  }
  if (left < MIN_PCT || middle < MIN_PCT || right < MIN_PCT) return false
  const sum = left + middle + right
  return Math.abs(sum - 100) < 0.5
}

function readStoredSizes(): PaneSizes {
  if (typeof window === 'undefined') return DEFAULT_SIZES
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SIZES
    const parsed: unknown = JSON.parse(raw)
    return isValidSizes(parsed) ? parsed : DEFAULT_SIZES
  } catch {
    return DEFAULT_SIZES
  }
}

function writeStoredSizes(sizes: PaneSizes): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
  } catch {
    // Storage недоступен (private mode / quota / policy) — no-op.
  }
}

/**
 * Применяет drag к паре соседних панелей: `a` отдаёт/получает `delta`
 * процентов у `b`. Соблюдает `MIN_PCT` с обеих сторон и возвращает
 * скорректированные значения.
 */
function applyDelta(
  a: number,
  b: number,
  delta: number,
): [number, number] {
  let nextA = a + delta
  let nextB = b - delta
  if (nextA < MIN_PCT) {
    nextB -= MIN_PCT - nextA
    nextA = MIN_PCT
  }
  if (nextB < MIN_PCT) {
    nextA -= MIN_PCT - nextB
    nextB = MIN_PCT
  }
  return [nextA, nextB]
}

// --- styles ----------------------------------------------------------------

const WRAPPER_BASE_STYLE: CSSProperties = {
  display: 'flex',
  width: '100%',
  minHeight: 0,
  gap: 'var(--space-3)',
  position: 'relative',
  zIndex: 'var(--z-content)' as unknown as number,
}

const PANE_STYLE: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}

const HANDLE_STYLE: CSSProperties = {
  flex: '0 0 auto',
  width: 'var(--space-1)',
  cursor: 'col-resize',
  background: 'var(--border-300)',
  borderRadius: 'var(--radius-sm)',
  transition:
    'background var(--dur-fast) var(--ease-standard), width var(--dur-fast) var(--ease-standard)',
  touchAction: 'none',
  userSelect: 'none',
}

// --- component -------------------------------------------------------------

export function TaskSplitLayout({
  description,
  editor,
  execution,
}: TaskSplitLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [sizes, setSizes] = useState<PaneSizes>(DEFAULT_SIZES)
  const [activeHandle, setActiveHandle] = useState<'left' | 'right' | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const sizesRef = useRef<PaneSizes>(DEFAULT_SIZES)
  const rafRef = useRef<number | null>(null)
  const pendingSizesRef = useRef<PaneSizes | null>(null)

  // Keep ref in sync for pointer-move handlers (avoid stale closures).
  useEffect(() => {
    sizesRef.current = sizes
  }, [sizes])

  // Hydrate from localStorage + subscribe to breakpoint changes after mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = readStoredSizes()
    setSizes(stored)
    sizesRef.current = stored

    const mq = window.matchMedia(DESKTOP_MQ)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => {
      mq.removeEventListener('change', update)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  const flushPending = useCallback(() => {
    rafRef.current = null
    const next = pendingSizesRef.current
    if (!next) return
    pendingSizesRef.current = null
    sizesRef.current = next
    setSizes(next)
  }, [])

  const schedule = useCallback(
    (next: PaneSizes) => {
      pendingSizesRef.current = next
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(flushPending)
    },
    [flushPending],
  )

  const makeHandlePointerDown = useCallback(
    (which: 'left' | 'right') =>
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return
        const container = containerRef.current
        if (!container) return

        event.preventDefault()
        const handleEl = event.currentTarget
        try {
          handleEl.setPointerCapture(event.pointerId)
        } catch {
          // setPointerCapture can throw in edge cases; ignore and rely on
          // window pointermove/pointerup fallback below.
        }
        setActiveHandle(which)

        const rect = container.getBoundingClientRect()
        const totalWidth = rect.width
        const startX = event.clientX
        const startSizes = sizesRef.current

        const onMove = (ev: globalThis.PointerEvent) => {
          if (ev.pointerId !== event.pointerId) return
          const dxPx = ev.clientX - startX
          const dxPct = (dxPx / totalWidth) * 100
          let next: PaneSizes
          if (which === 'left') {
            const [left, middle] = applyDelta(startSizes.left, startSizes.middle, dxPct)
            next = { left, middle, right: startSizes.right }
          } else {
            const [middle, right] = applyDelta(startSizes.middle, startSizes.right, dxPct)
            next = { left: startSizes.left, middle, right }
          }
          schedule(next)
        }

        const onUp = (ev: globalThis.PointerEvent) => {
          if (ev.pointerId !== event.pointerId) return
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
          try {
            handleEl.releasePointerCapture(event.pointerId)
          } catch {
            // ignore
          }
          // Flush any pending frame before committing to storage so the
          // persisted value matches the last rendered frame.
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
            flushPending()
          }
          setActiveHandle(null)
          writeStoredSizes(sizesRef.current)
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      },
    [flushPending, schedule],
  )

  const wrapperStyle = useMemo<CSSProperties>(() => {
    if (isDesktop) {
      return {
        ...WRAPPER_BASE_STYLE,
        flexDirection: 'row',
        height: '100%',
      }
    }
    return {
      ...WRAPPER_BASE_STYLE,
      flexDirection: 'column',
      height: 'auto',
    }
  }, [isDesktop])

  if (!isDesktop) {
    return (
      <div
        ref={containerRef}
        data-ds="task-split-layout"
        data-orientation="vertical"
        style={wrapperStyle}
      >
        <section data-pane="description" style={PANE_STYLE}>
          {description}
        </section>
        <section data-pane="editor" style={PANE_STYLE}>
          {editor}
        </section>
        <section data-pane="execution" style={PANE_STYLE}>
          {execution}
        </section>
      </div>
    )
  }

  const leftHandleActive = activeHandle === 'left'
  const rightHandleActive = activeHandle === 'right'

  return (
    <div
      ref={containerRef}
      data-ds="task-split-layout"
      data-orientation="horizontal"
      style={wrapperStyle}
    >
      <section
        data-pane="description"
        style={{ ...PANE_STYLE, flex: `0 0 ${sizes.left}%` }}
      >
        {description}
      </section>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize description and editor"
        aria-valuemin={MIN_PCT}
        aria-valuemax={100 - 2 * MIN_PCT}
        aria-valuenow={Math.round(sizes.left)}
        tabIndex={0}
        data-handle="left"
        data-active={leftHandleActive || undefined}
        onPointerDown={makeHandlePointerDown('left')}
        style={{
          ...HANDLE_STYLE,
          background: leftHandleActive ? 'var(--accent-600)' : 'var(--border-300)',
        }}
      />
      <section
        data-pane="editor"
        style={{ ...PANE_STYLE, flex: `0 0 ${sizes.middle}%` }}
      >
        {editor}
      </section>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize editor and execution"
        aria-valuemin={MIN_PCT}
        aria-valuemax={100 - 2 * MIN_PCT}
        aria-valuenow={Math.round(sizes.middle)}
        tabIndex={0}
        data-handle="right"
        data-active={rightHandleActive || undefined}
        onPointerDown={makeHandlePointerDown('right')}
        style={{
          ...HANDLE_STYLE,
          background: rightHandleActive ? 'var(--accent-600)' : 'var(--border-300)',
        }}
      />
      <section
        data-pane="execution"
        style={{ ...PANE_STYLE, flex: `0 0 ${sizes.right}%` }}
      >
        {execution}
      </section>
    </div>
  )
}

export default TaskSplitLayout
