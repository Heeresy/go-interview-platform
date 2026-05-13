'use client'

/**
 * `<CommandPalette />` — DS v2 command palette (task 11.4).
 *
 * Контракт (Requirements 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 7.8, 8.7, 11.7,
 *          23.2, 25.3, 25.4):
 *
 *  - Открывается по Cmd+K (mac) / Ctrl+K (другие ОС) — Req 7.1, 8.7.
 *    Хоткей активен только при `user !== null` (Req 7.8); для гостя
 *    компонент возвращает `null` и listener не регистрируется.
 *  - На открытии:
 *      * сохраняется `document.activeElement` (для восстановления фокуса);
 *      * эмитится `trackEvent("command_palette_opened")` ровно ОДИН раз
 *        на открытие (Req 25.4). Повторный toggle open→close→open
 *        порождает новое событие; многократный рендер или ввод текста
 *        внутри одной открытой сессии — не порождает.
 *  - Рендерится в portal (`createPortal` → `document.body`), с
 *    `.glass`-панелью, focus-trap и Esc-закрытием через тот же
 *    `focusTrap.ts`, что используется в `Dialog`/`Drawer` (Req 11.7).
 *  - Две группы — "nav" и "action" (Req 7.3); заголовки групп локализованы:
 *    `t('commandPalette.group.nav')` / `t('commandPalette.group.action')`.
 *  - Клавиатурная навигация ↑/↓ по уплощённому списку результатов;
 *    Enter подтверждает (Req 7.6).
 *  - На каждое изменение `query`:
 *      * создаётся новый `AbortController`;
 *      * предыдущий `controller.abort()` (Req 7.5 — отмена медленного
 *        фильтра не блокирует запуск для нового запроса);
 *      * вызывается `fuzzyFilter(items, query, { deadlineMs: 50, signal })`
 *        на клиенте, без сетевых запросов (Req 23.2, 7.4, 7.5).
 *  - Confirm (Enter/click) — close **безусловно** (Req 7.7):
 *      1. сначала `close()` + восстановление фокуса;
 *      2. затем через `queueMicrotask(() => ...)` — `router.push(href)`
 *         для nav или `item.run()` для action. Если навигация не
 *         произошла (middleware отбросил, роут совпал, роутер no-op) —
 *         палитра всё равно уже закрыта.
 *  - Esc закрывает + восстанавливает фокус (Req 7.2).
 *
 * Design System: все отступы/радиусы/цвета/motion — из DS v2 CSS vars
 * (`--space-*`, `--radius-*`, `--bg-*`, `--surface-*`, `--border-*`,
 * `--z-modal`, `--dur-*`, `--ease-*`, `--fs-*`, `--fw-*`). Хардкод-
 * значений нет (Req 1.8).
 */

import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
    collectFocusable,
    handleFocusTrapKeyDown,
    restoreFocus,
    saveActiveElement,
} from '@/components/ui/focusTrap'
import { fuzzyFilter } from '@/lib/fuzzy'
import {
    createCommandItems,
    type CommandItem,
} from '@/lib/command-palette-items'
import { trackEvent } from '@/lib/analytics'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { useGlobalHotkey } from './useGlobalHotkey'

export interface CommandPaletteProps {
    /**
     * Текущий авторизованный пользователь. Если `null` — палитра
     * не рендерится и хоткей не регистрируется (Req 7.8).
     */
    user: User | null
}

// ---- styles (DS v2 tokens only) --------------------------------------------

const BACKDROP_STYLE: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 'var(--z-modal)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 'var(--space-16) var(--space-4) var(--space-4)',
    background: 'color-mix(in oklch, var(--bg-0) 60%, transparent)',
    WebkitBackdropFilter: 'blur(8px)',
    backdropFilter: 'blur(8px)',
    animation: 'ds-dialog-backdrop-in var(--dur-fast) var(--ease-standard)',
}

const CONTAINER_STYLE: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: 'calc(var(--space-32) * 5)', // ≈ 640px
    maxHeight: 'calc(100dvh - var(--space-32))',
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--space-2)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    animation: 'ds-dialog-in var(--dur-base) var(--ease-emphasised)',
}

const INPUT_STYLE: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 'var(--space-3) var(--space-4)',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--border-900)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-md)',
    fontWeight: 'var(--fw-regular)',
    lineHeight: 1.4,
}

const INPUT_WRAP_STYLE: CSSProperties = {
    padding: 'var(--space-1)',
    borderBottom:
        '1px solid color-mix(in oklch, var(--border-500) 12%, transparent)',
}

const LIST_STYLE: CSSProperties = {
    listStyle: 'none',
    margin: 0,
    padding: 'var(--space-2) 0',
    overflowY: 'auto',
    maxHeight: 'calc(100dvh - var(--space-32) - var(--space-16))',
}

const GROUP_TITLE_STYLE: CSSProperties = {
    padding: 'var(--space-2) var(--space-4) var(--space-1)',
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--border-600)',
    userSelect: 'none',
}

const ITEM_BASE_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    color: 'var(--border-800)',
    fontSize: 'var(--fs-md)',
    lineHeight: 1.3,
}

const ITEM_ACTIVE_STYLE: CSSProperties = {
    ...ITEM_BASE_STYLE,
    background:
        'color-mix(in oklch, var(--accent-600) 14%, transparent)',
    color: 'var(--border-900)',
}

const EMPTY_STYLE: CSSProperties = {
    padding: 'var(--space-6) var(--space-4)',
    textAlign: 'center',
    color: 'var(--border-600)',
    fontSize: 'var(--fs-sm)',
}

// ---- component -------------------------------------------------------------

interface FlatGroup {
    key: 'nav' | 'action'
    label: string
    items: CommandItem[]
}

/** Группирует отфильтрованный список в стабильном порядке групп [nav, action]. */
function groupItems(items: readonly CommandItem[]): FlatGroup[] {
    const nav: CommandItem[] = []
    const action: CommandItem[] = []
    for (const i of items) {
        if (i.group === 'nav') nav.push(i)
        else action.push(i)
    }
    const groups: FlatGroup[] = []
    if (nav.length > 0) {
        groups.push({
            key: 'nav',
            label: t('commandPalette.group.nav'),
            items: nav,
        })
    }
    if (action.length > 0) {
        groups.push({
            key: 'action',
            label: t('commandPalette.group.action'),
            items: action,
        })
    }
    return groups
}

export function CommandPalette({ user }: CommandPaletteProps) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')

    // --- refs
    const containerRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const previouslyFocusedRef = useRef<HTMLElement | null>(null)
    const abortRef = useRef<AbortController | null>(null)
    const reactId = useId()
    const inputId = `ds-cmdp-input-${reactId}`
    const listId = `ds-cmdp-list-${reactId}`

    // Устойчивые deps для createCommandItems: router — стабильная ссылка
    // между рендерами, signOut завязан на supabase-клиент, создаваемый
    // один раз через lazy-ref (см. ниже).
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
    const signOut = useCallback(async () => {
        if (supabaseRef.current === null) {
            supabaseRef.current = createClient()
        }
        try {
            await supabaseRef.current.auth.signOut()
        } catch {
            // Ошибка signOut не должна крашить UI.
        }
    }, [])

    // Список элементов палитры — пересобирается только при смене router/signOut.
    const items = useMemo<CommandItem[]>(
        () => createCommandItems({ router, signOut }),
        [router, signOut],
    )

    // Mount flag для createPortal (SSR-safe).
    useEffect(() => {
        setMounted(true)
    }, [])

    // --- фильтрация: AbortController на каждый ввод (Req 7.5, 23.2) ---------
    const filtered = useMemo<CommandItem[]>(() => {
        // Отменяем предыдущую (возможно, ещё не завершившуюся) фильтрацию.
        if (abortRef.current !== null) {
            abortRef.current.abort()
        }
        const controller = new AbortController()
        abortRef.current = controller
        return fuzzyFilter(items, query, {
            deadlineMs: 50,
            signal: controller.signal,
        })
    }, [items, query])

    // Очистка abort-контроллера при размонтировании.
    useEffect(() => {
        return () => {
            if (abortRef.current !== null) {
                abortRef.current.abort()
                abortRef.current = null
            }
        }
    }, [])

    // Группы для рендера + плоский список для keyboard-навигации.
    const groups = useMemo(() => groupItems(filtered), [filtered])
    const flat = useMemo<CommandItem[]>(
        () => groups.flatMap((g) => g.items),
        [groups],
    )

    // Индекс активной строки для ↑/↓/Enter.
    const [activeIndex, setActiveIndex] = useState(0)
    useEffect(() => {
        // При смене query список меняется; сбрасываем курсор на начало.
        setActiveIndex(0)
    }, [query])
    useEffect(() => {
        // Clamp: при резком сужении flat (например, фильтр отсёк всё кроме 1).
        if (flat.length === 0) {
            if (activeIndex !== 0) setActiveIndex(0)
            return
        }
        if (activeIndex >= flat.length) {
            setActiveIndex(flat.length - 1)
        }
    }, [flat.length, activeIndex])

    // --- hotkey (Req 7.1, 7.8): активен только для авторизованных -----------
    // Callback toggle стабильно ссылается на актуальный open через функциональную форму.
    const toggle = useCallback(() => {
        setOpen((o) => !o)
    }, [])
    useGlobalHotkey('mod+k', toggle, user !== null)

    // --- open-side effects: save focus + emit analytics once per open ------
    // Важно: эмитим ровно один раз на КАЖДОЕ открытие, не на каждый рендер.
    const openedOnceRef = useRef(false)
    useLayoutEffect(() => {
        if (!open) {
            // close-side: восстанавливаем фокус один раз при закрытии
            // (эффект запустится при переходе open: true → false).
            restoreFocus(previouslyFocusedRef.current)
            previouslyFocusedRef.current = null
            setQuery('')
            openedOnceRef.current = false
            return
        }

        if (openedOnceRef.current) return

        // open: true (новая сессия)
        previouslyFocusedRef.current = saveActiveElement()
        openedOnceRef.current = true
        // Req 25.4: один event per open.
        trackEvent('command_palette_opened')

        // Фокус на input — через RAF, чтобы элемент точно смонтировался.
        const raf =
            typeof window !== 'undefined' && 'requestAnimationFrame' in window
                ? window.requestAnimationFrame(() => {
                      try {
                          inputRef.current?.focus()
                      } catch {
                          // ignore
                      }
                  })
                : null

        return () => {
            if (raf !== null && typeof window !== 'undefined') {
                window.cancelAnimationFrame(raf)
            }
        }
    }, [open])

    // Если пользователь разлогинился при открытой палитре — закрываем.
    useEffect(() => {
        if (user === null && open) setOpen(false)
    }, [user, open])

    // --- close(): единая точка закрытия + восстановление фокуса ------------
    // Используется и в Esc, и в confirm. Закрытие идёт через React state,
    // восстановление фокуса происходит в useLayoutEffect выше (одинаковый путь).
    const close = useCallback(() => {
        setOpen(false)
    }, [])

    // --- глобальный keydown: Esc + focus-trap (Tab) -------------------------
    useEffect(() => {
        if (!open) return

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                close()
                return
            }
            handleFocusTrapKeyDown(e, containerRef.current)
        }

        document.addEventListener('keydown', onKeyDown, true)
        return () => {
            document.removeEventListener('keydown', onKeyDown, true)
        }
    }, [open, close])

    // --- confirm: close сначала, navigation/run — через microtask ----------
    // Req 7.7: палитра гарантированно закрыта даже если навигация
    // не произошла (middleware/совпадение роута/no-op роутера).
    const confirmItem = useCallback(
        (item: CommandItem) => {
            // 1) синхронно закрыть; restoreFocus отработает в layout-effect.
            close()
            // 2) отложить нав./run на microtask — close() уже случился.
            queueMicrotask(() => {
                try {
                    if (item.group === 'nav' && item.href) {
                        router.push(item.href)
                    } else if (typeof item.run === 'function') {
                        void item.run()
                    }
                } catch {
                    // Промахи навигации не должны возвращать палитру в open.
                }
            })
        },
        [close, router],
    )

    // --- input keydown: ↑/↓/Enter -----------------------------------------
    const onInputKeyDown = useCallback(
        (e: ReactKeyboardEvent<HTMLInputElement>) => {
            if (flat.length === 0) {
                // Enter на пустом списке не делает ничего — палитра остаётся открытой,
                // курсор возвращается в input для следующего ввода.
                if (e.key === 'Enter') {
                    e.preventDefault()
                }
                return
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => (i + 1) % flat.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => (i - 1 + flat.length) % flat.length)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                const item = flat[activeIndex] ?? flat[0]
                if (item) confirmItem(item)
            }
        },
        [flat, activeIndex, confirmItem],
    )

    // --- backdrop click: закрытие ------------------------------------------
    const onBackdropMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close()
        },
        [close],
    )

    // --- не рендерим для гостя (Req 7.8) и до hydration (SSR-safe) ---------
    if (user === null) return null
    if (!open) return null
    if (!mounted || typeof document === 'undefined') return null

    // --- render ------------------------------------------------------------
    // Используем глобальный счётчик индекса по плоскому списку, чтобы
    // активная подсветка однозначно соответствовала keyboard-позиции.
    let flatCursor = -1

    return createPortal(
        <div
            data-ds="command-palette-backdrop"
            style={BACKDROP_STYLE}
            onMouseDown={onBackdropMouseDown}
        >
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('commandPalette.placeholder')}
                data-ds="command-palette"
                className="glass"
                style={CONTAINER_STYLE}
            >
                <div style={INPUT_WRAP_STYLE}>
                    <input
                        ref={inputRef}
                        id={inputId}
                        type="text"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={
                            flat.length > 0
                                ? `${listId}-opt-${activeIndex}`
                                : undefined
                        }
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={t('commandPalette.placeholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onInputKeyDown}
                        style={INPUT_STYLE}
                    />
                </div>

                {flat.length === 0 ? (
                    <div style={EMPTY_STYLE} role="status">
                        {t('commandPalette.empty')}
                    </div>
                ) : (
                    <ul
                        id={listId}
                        role="listbox"
                        aria-label={t('commandPalette.placeholder')}
                        style={LIST_STYLE}
                    >
                        {groups.map((group) => (
                            <li key={group.key} role="presentation">
                                <div
                                    style={GROUP_TITLE_STYLE}
                                    role="presentation"
                                    data-ds="command-palette-group"
                                    data-group={group.key}
                                >
                                    {group.label}
                                </div>
                                <ul
                                    role="group"
                                    aria-label={group.label}
                                    style={{
                                        listStyle: 'none',
                                        margin: 0,
                                        padding: 0,
                                    }}
                                >
                                    {group.items.map((item) => {
                                        flatCursor += 1
                                        const myIndex = flatCursor
                                        const isActive = myIndex === activeIndex
                                        const Icon = item.icon
                                        return (
                                            <li
                                                key={item.id}
                                                id={`${listId}-opt-${myIndex}`}
                                                role="option"
                                                aria-selected={isActive}
                                                data-ds="command-palette-item"
                                                data-active={
                                                    isActive ? 'true' : 'false'
                                                }
                                                style={
                                                    isActive
                                                        ? ITEM_ACTIVE_STYLE
                                                        : ITEM_BASE_STYLE
                                                }
                                                onMouseEnter={() =>
                                                    setActiveIndex(myIndex)
                                                }
                                                onMouseDown={(e) => {
                                                    // mousedown вместо click:
                                                    // не даём input потерять
                                                    // фокус перед confirm.
                                                    e.preventDefault()
                                                    confirmItem(item)
                                                }}
                                            >
                                                {Icon ? (
                                                    <span
                                                        aria-hidden="true"
                                                        style={{
                                                            display:
                                                                'inline-flex',
                                                            width:
                                                                'var(--space-4)',
                                                            height:
                                                                'var(--space-4)',
                                                            flex: '0 0 auto',
                                                        }}
                                                    >
                                                        <Icon size={16} />
                                                    </span>
                                                ) : null}
                                                <span
                                                    style={{
                                                        flex: '1 1 auto',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {item.title}
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>,
        document.body,
    )
}

export default CommandPalette
