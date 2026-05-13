'use client'

/**
 * `useGlobalHotkey(combo, handler, enabled?)` — window-scoped keyboard shortcut.
 *
 * Парсит combo-строку вида `"mod+k"` / `"mod+shift+/"` и вызывает `handler`
 * при совпадении `keydown`. `mod` разворачивается в `metaKey` на macOS
 * (Command) и в `ctrlKey` на прочих ОС — как требует Requirement 7.1
 * (Cmd+K на macOS, Ctrl+K на остальных).
 *
 * Контракт:
 *  - Listener навешивается на `window` с опцией `capture: false`.
 *  - Поддерживаются модификаторы: `mod` (Cmd/Ctrl по ОС), `meta`, `ctrl`,
 *    `alt`, `shift`. Регистр combo игнорируется.
 *  - Основная клавиша — одиночный символ или спец-ключ (`Escape`, `Enter`,
 *    `ArrowUp`, `/` и т.п.); сравнивается case-insensitive через `e.key`.
 *  - При совпадении handler вызывается, затем `e.preventDefault()` —
 *    чтобы браузерный Cmd/Ctrl+K (смена фокуса на адресную строку
 *    в некоторых браузерах/сборках) не сработал.
 *  - Cleanup при unmount; перестроение при смене `combo` или `enabled`.
 *  - Если `enabled === false` — listener вообще не регистрируется (нет
 *    скрытой работы для гостей, Req 7.8).
 *  - `handler` хранится в ref, поэтому новые замыкания не пересоздают
 *    listener (стабильность против inline-функций в рендере).
 */

import { useEffect, useRef } from 'react'

type Modifier = 'mod' | 'meta' | 'ctrl' | 'alt' | 'shift'

interface ParsedCombo {
    meta: boolean
    ctrl: boolean
    alt: boolean
    shift: boolean
    /** `mod` не распадается в parse — разворачивается по ОС в момент сравнения. */
    mod: boolean
    /** Основная (не-модификатор) клавиша в нижнем регистре. */
    key: string
}

const MODIFIERS: readonly Modifier[] = ['mod', 'meta', 'ctrl', 'alt', 'shift']

function isModifier(part: string): part is Modifier {
    return (MODIFIERS as readonly string[]).includes(part)
}

function parseCombo(combo: string): ParsedCombo | null {
    const parts = combo
        .split('+')
        .map((p) => p.trim().toLowerCase())
        .filter((p) => p.length > 0)

    if (parts.length === 0) return null

    let meta = false
    let ctrl = false
    let alt = false
    let shift = false
    let mod = false
    let key: string | null = null

    for (const part of parts) {
        if (isModifier(part)) {
            if (part === 'mod') mod = true
            else if (part === 'meta') meta = true
            else if (part === 'ctrl') ctrl = true
            else if (part === 'alt') alt = true
            else if (part === 'shift') shift = true
        } else {
            // В combo допускается ровно одна не-модификаторная клавиша.
            if (key !== null) return null
            key = part
        }
    }

    if (key === null) return null
    return { meta, ctrl, alt, shift, mod, key }
}

/**
 * Эвристика платформы: macOS → `mod = Cmd (metaKey)`, остальные → `ctrlKey`.
 * `navigator.platform` устарел, но всё ещё работает в jsdom и во всех
 * современных браузерах как неофициальный fallback. Если ничего не
 * получилось определить — по умолчанию считаем не-macOS (Ctrl), что
 * корректно для серверного рендера и для unit-тестов.
 */
function isMacLike(): boolean {
    if (typeof navigator === 'undefined') return false
    const p =
        (navigator.platform ?? '') ||
        (navigator.userAgent ?? '')
    return /mac|iphone|ipad|ipod/i.test(p)
}

function matches(parsed: ParsedCombo, e: KeyboardEvent, isMac: boolean): boolean {
    // Разворачиваем `mod` в meta (mac) или ctrl (other).
    const needMeta = parsed.meta || (parsed.mod && isMac)
    const needCtrl = parsed.ctrl || (parsed.mod && !isMac)

    if (e.metaKey !== needMeta) return false
    if (e.ctrlKey !== needCtrl) return false
    if (e.altKey !== parsed.alt) return false
    if (e.shiftKey !== parsed.shift) return false

    // event.key сравниваем без учёта регистра.
    // Для одиночных символов e.key — это сам символ ("k"); для
    // специальных клавиш — имя ("Escape", "ArrowUp"), тоже приведём к lower.
    return e.key.toLowerCase() === parsed.key
}

export function useGlobalHotkey(
    combo: string,
    handler: () => void,
    enabled: boolean = true,
): void {
    // Держим handler в ref, чтобы не пересоздавать listener на каждом
    // новом замыкании (стабильно для inline-колбэков в рендере).
    const handlerRef = useRef(handler)
    useEffect(() => {
        handlerRef.current = handler
    }, [handler])

    useEffect(() => {
        if (!enabled) return
        if (typeof window === 'undefined') return

        const parsed = parseCombo(combo)
        if (!parsed) return

        const isMac = isMacLike()

        const onKeyDown = (e: KeyboardEvent) => {
            if (!matches(parsed, e, isMac)) return
            // preventDefault обязателен: иначе Cmd/Ctrl+K в некоторых
            // браузерах перехватывается как «фокус на адресную строку».
            e.preventDefault()
            handlerRef.current()
        }

        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [combo, enabled])
}

export default useGlobalHotkey
