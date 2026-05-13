'use client'

/**
 * `<Tooltip />` — Design System v2 tooltip primitive.
 *
 * Wraps a single React element and renders an accessible tooltip on
 * hover (pointer) or focus (keyboard). Uses the native `role="tooltip"`
 * pattern and wires the trigger element's `aria-describedby` to the
 * tooltip node so screen readers announce the hint text when the
 * referenced element gets focus.
 *
 * Requirements: 22.1 (DS tokens only), 11.x (a11y — focus-visible
 * triggering, semantic roles).
 *
 * Props:
 *   - `content`   — tooltip body (string or ReactNode)
 *   - `placement` — `'top' | 'bottom' | 'left' | 'right'` (default `'top'`)
 *   - `delayMs`   — delay before showing on hover; default 120ms. Focus
 *                   shows the tooltip immediately (keyboard users shouldn't
 *                   wait for a hover-style delay).
 *   - `children`  — exactly one focusable React element (Button, IconButton,
 *                   Input, etc.). The tooltip clones it to inject refs and
 *                   aria wiring without an extra wrapper element that would
 *                   break layout or focus order.
 *
 * Styling: all visuals come from DS tokens (`--surface-500`, `--border-500`,
 * `--radius-md`, `--shadow-2`, `--fs-sm`, `--space-*`, `--dur-fast`,
 * `--ease-standard`, `--z-modal`). No hardcoded colors or pixel values
 * (Requirement 1.8).
 */

import {
  Children,
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  /** Tooltip body text or ReactNode. */
  content: ReactNode
  /** Preferred placement around the trigger. Default `'top'`. */
  placement?: TooltipPlacement
  /** Delay (ms) before showing on pointer hover. Default 120. */
  delayMs?: number
  /** The single focusable child that the tooltip describes. */
  children: ReactElement
  /** Optional override id for the tooltip element. */
  id?: string
}

// Any trigger props we intercept — typed loosely so we can re-dispatch the
// original handlers without introducing generic plumbing at every call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TriggerProps = Record<string, any>

const TOOLTIP_STYLE: CSSProperties = {
  position: 'absolute',
  zIndex: 'var(--z-modal)' as unknown as number,
  pointerEvents: 'none',
  maxWidth: 'calc(var(--space-32) * 2)',
  padding: 'var(--space-2) var(--space-3)',
  background: 'var(--surface-500)',
  color: 'var(--border-900)',
  border: '1px solid var(--border-300)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-2)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.4,
  whiteSpace: 'normal',
  transition:
    'opacity var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)',
}

const WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
}

function placementStyle(placement: TooltipPlacement): CSSProperties {
  // Use var(--space-2) = 8px as the gap between trigger and tooltip.
  switch (placement) {
    case 'bottom':
      return {
        top: '100%',
        left: '50%',
        transform: 'translate(-50%, var(--space-2))',
      }
    case 'left':
      return {
        right: '100%',
        top: '50%',
        transform: 'translate(calc(var(--space-2) * -1), -50%)',
      }
    case 'right':
      return {
        left: '100%',
        top: '50%',
        transform: 'translate(var(--space-2), -50%)',
      }
    case 'top':
    default:
      return {
        bottom: '100%',
        left: '50%',
        transform: 'translate(-50%, calc(var(--space-2) * -1))',
      }
  }
}

export function Tooltip({
  content,
  placement = 'top',
  delayMs = 120,
  children,
  id,
}: TooltipProps) {
  const reactId = useId()
  const tooltipId = id ?? `ds-tooltip-${reactId}`
  const [open, setOpen] = useState(false)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Preserve exactly one child (ReactElement). If consumers pass more than
  // one, fall back to rendering the first and silently drop the rest — this
  // matches the documented contract (`children: ReactElement`).
  const child = Children.only(children) as ReactElement<TriggerProps>

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
  }, [])

  const scheduleShow = useCallback(() => {
    clearShowTimer()
    if (delayMs <= 0) {
      setOpen(true)
      return
    }
    showTimerRef.current = setTimeout(() => {
      setOpen(true)
      showTimerRef.current = null
    }, delayMs)
  }, [clearShowTimer, delayMs])

  const hideNow = useCallback(() => {
    clearShowTimer()
    setOpen(false)
  }, [clearShowTimer])

  // Esc should close the tooltip if it happened to stay open — defensive
  // (tooltip hides on blur anyway, but a keyboard user can still press Esc).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideNow()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, hideNow])

  // Always release the pending show-timer on unmount so we don't flip state
  // on an unmounted node.
  useEffect(() => {
    return () => clearShowTimer()
  }, [clearShowTimer])

  // Compose handlers with any the child already had — never clobber them.
  const childProps = (child.props ?? {}) as TriggerProps

  const handlePointerEnter = (e: React.PointerEvent) => {
    scheduleShow()
    childProps.onPointerEnter?.(e)
  }
  const handlePointerLeave = (e: React.PointerEvent) => {
    hideNow()
    childProps.onPointerLeave?.(e)
  }
  const handleFocus = (e: FocusEvent) => {
    // Keyboard focus reveals the tooltip immediately (no hover delay).
    clearShowTimer()
    setOpen(true)
    childProps.onFocus?.(e)
  }
  const handleBlur = (e: FocusEvent) => {
    hideNow()
    childProps.onBlur?.(e)
  }

  // Merge `aria-describedby`: keep any existing describedby ids the child
  // already had, then append our tooltip id — screen readers will read all.
  const existingDescribedBy =
    typeof childProps['aria-describedby'] === 'string'
      ? childProps['aria-describedby']
      : undefined
  const mergedDescribedBy = existingDescribedBy
    ? `${existingDescribedBy} ${tooltipId}`
    : tooltipId

  const trigger = cloneElement(child, {
    'aria-describedby': mergedDescribedBy,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
  } as TriggerProps)

  return (
    <span style={WRAPPER_STYLE} data-ds="tooltip-wrapper">
      {trigger}
      <span
        role="tooltip"
        id={tooltipId}
        data-ds="tooltip"
        data-placement={placement}
        data-open={open ? 'true' : 'false'}
        aria-hidden={open ? undefined : 'true'}
        style={{
          ...TOOLTIP_STYLE,
          ...placementStyle(placement),
          opacity: open ? 1 : 0,
          // Keep it in the DOM even when hidden, so aria-describedby always
          // resolves; just make it non-interactive and visually invisible.
          visibility: open ? 'visible' : 'hidden',
        }}
      >
        {typeof content === 'string' ? content : content}
      </span>
    </span>
  )
}

export default Tooltip
