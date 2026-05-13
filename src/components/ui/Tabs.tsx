'use client'

/**
 * `<Tabs />` — Design System v2 accessible tabs primitive.
 *
 * Implements the WAI-ARIA authoring tabs pattern:
 *   - `role="tablist"` container with `aria-orientation="horizontal"`
 *   - `role="tab"` for each trigger, wired with `aria-selected`,
 *     `aria-controls`, `id`, and manual `tabIndex` (activation follows
 *     focus — "automatic" activation model: ArrowLeft/ArrowRight/Home/End
 *     change focus and also change the selected panel).
 *   - `role="tabpanel"` for each content section, wired with
 *     `aria-labelledby` and `hidden` when not active.
 *
 * Keyboard:
 *   - ArrowRight / ArrowLeft → move focus between tabs (wraps around).
 *   - Home                   → focus first tab.
 *   - End                    → focus last tab.
 *
 * State: uncontrolled — the active tab id lives in a `useState` seeded from
 * `defaultActiveId` (or the first item, if the default is missing or not in
 * the list). Consumers can observe changes through the optional `onChange`
 * callback.
 *
 * Styling comes from DS tokens only (`--surface-*`, `--border-*`,
 * `--accent-600`, `--radius-*`, `--space-*`, `--fs-*`, `--fw-*`, `--dur-fast`,
 * `--ease-standard`). No hardcoded colors / pixel values (Requirement 1.8).
 *
 * Requirements: 22.1, 11.x (a11y).
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

export interface TabItem {
  id: string
  label: ReactNode
  content: ReactNode
}

export interface TabsProps {
  /** Tab items. `id` values must be unique within a given Tabs instance. */
  items: TabItem[]
  /**
   * Initially selected tab id. Falls back to the first item's id if the value
   * is missing, empty, or not found in `items`.
   */
  defaultActiveId?: string
  /** Called with the new active id every time the selection changes. */
  onChange?: (id: string) => void
}

const LIST_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  padding: 'var(--space-1)',
  background: 'var(--surface-200)',
  border: '1px solid var(--border-200)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-1)',
}

const TAB_BASE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  paddingBlock: 'var(--space-2)',
  paddingInline: 'var(--space-4)',
  minHeight: 'var(--space-10)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1,
  color: 'var(--border-700)',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition:
    'background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
}

const TAB_ACTIVE_STYLE: CSSProperties = {
  color: 'var(--bg-0)',
  background: 'var(--accent-600)',
  borderColor: 'var(--accent-600)',
}

const PANEL_STYLE: CSSProperties = {
  paddingBlockStart: 'var(--space-4)',
}

export function Tabs({ items, defaultActiveId, onChange }: TabsProps) {
  const groupId = useId()

  // Resolve the initial active id exactly once — subsequent `defaultActiveId`
  // changes are ignored to preserve the uncontrolled contract.
  const resolvedInitial = useMemo(() => {
    const first = items[0]?.id
    if (
      defaultActiveId &&
      items.some((i) => i.id === defaultActiveId)
    ) {
      return defaultActiveId
    }
    return first ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [activeId, setActiveId] = useState<string>(resolvedInitial)

  // If items ever shrink so that the active id disappears, clamp to first.
  useEffect(() => {
    if (items.length === 0) return
    if (!items.some((i) => i.id === activeId)) {
      setActiveId(items[0].id)
    }
  }, [items, activeId])

  // Keep refs to all tab buttons so keyboard navigation can focus them.
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const select = useCallback(
    (id: string) => {
      if (id === activeId) return
      setActiveId(id)
      onChange?.(id)
    },
    [activeId, onChange],
  )

  const focusTab = useCallback((id: string) => {
    tabRefs.current[id]?.focus()
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (items.length === 0) return
    const currentIndex = items.findIndex((i) => i.id === activeId)
    // If something weird happened (active id not in items), fall back to 0.
    const idx = currentIndex >= 0 ? currentIndex : 0

    let nextIdx: number | null = null
    switch (e.key) {
      case 'ArrowRight':
        nextIdx = (idx + 1) % items.length
        break
      case 'ArrowLeft':
        nextIdx = (idx - 1 + items.length) % items.length
        break
      case 'Home':
        nextIdx = 0
        break
      case 'End':
        nextIdx = items.length - 1
        break
      default:
        return
    }

    if (nextIdx === null) return
    e.preventDefault()
    const nextId = items[nextIdx].id
    select(nextId)
    // ARIA tabs pattern with automatic activation: move focus along with
    // the selection so screen-reader users know which panel they'll land in.
    focusTab(nextId)
  }

  if (items.length === 0) {
    // Nothing to render — stay silent rather than emitting an empty tablist
    // that would confuse assistive tech.
    return null
  }

  return (
    <div data-ds="tabs">
      <div
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        style={LIST_STYLE}
      >
        {items.map((item) => {
          const isActive = item.id === activeId
          const tabId = `${groupId}-tab-${item.id}`
          const panelId = `${groupId}-panel-${item.id}`
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el
              }}
              type="button"
              role="tab"
              id={tabId}
              aria-selected={isActive}
              aria-controls={panelId}
              // Roving tabindex: only the active tab is in the document's
              // tab order. Keyboard users reach the group once, then navigate
              // between tabs with arrow keys.
              tabIndex={isActive ? 0 : -1}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => select(item.id)}
              style={{
                ...TAB_BASE_STYLE,
                ...(isActive ? TAB_ACTIVE_STYLE : null),
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {items.map((item) => {
        const isActive = item.id === activeId
        const tabId = `${groupId}-tab-${item.id}`
        const panelId = `${groupId}-panel-${item.id}`
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            hidden={!isActive}
            // `tabIndex={0}` so users can scroll long panels with the
            // keyboard even when there's no focusable child inside.
            tabIndex={0}
            style={PANEL_STYLE}
          >
            {isActive ? item.content : null}
          </div>
        )
      })}
    </div>
  )
}

export default Tabs
