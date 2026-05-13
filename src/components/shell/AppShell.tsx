'use client'

/**
 * AppShell — основной каркас авторизованного приложения (Design System v2).
 *
 * Контракт (Requirements 6.1, 6.8, 8.1, 8.2, 8.5, 9.1, 9.2, 9.3, 22.2):
 *
 *  - `user === null` → компонент возвращает `null` (Req 6.8). Родитель
 *    (обычно `AuthGate`) сам решает, что рендерить для гостя: Public_Landing
 *    или Auth_Module.
 *
 *  - Композиция брейкпоинтов (делается исключительно через CSS, см.
 *    `AppShell.css`) — mobile-first подход (Req 9.3):
 *      * Viewport_Mobile  (< 768px):  `Topbar` + `<main>` + `MobileTabBar`;
 *                                     `Sidebar` принудительно скрыт
 *                                     (`display: none`), даже если tab-bar
 *                                     пуст (прямая гарантия Req 8.1, 8.2).
 *      * Viewport_Tablet  (≥ 768px <1024px): `Sidebar` (collapsed по
 *                                     умолчанию, Req 8.5) + `Topbar`.
 *      * Viewport_Desktop (≥ 1024px): `Sidebar` (expanded) + `Topbar`.
 *      * Viewport_Wide    (≥ 1440px): то же, что Desktop, но max-width
 *                                     main'а = 1440px с центрированием
 *                                     (Req 9.2).
 *
 *  - CSS Grid как примитив раскладки:
 *      * `< 768px`:  `grid-template-columns: 1fr` (только контент).
 *      * `≥ 768px`:  `grid-template-columns: auto 1fr` (sidebar | main).
 *    CSS-правила для Tablet/Mobile живут в `AppShell.css`; JS не
 *    манипулирует `grid-template-columns` — это даёт SSR-корректный
 *    layout без hydration mismatch.
 *
 *  - Max-width контент-области = `min(1440px, 100%)`, центрирование
 *    через `margin-inline: auto` (Req 9.2). Реализовано в CSS на
 *    `.app-shell__main-inner` — чтобы `<main>` тянулся на всю колонку
 *    grid, а контент внутри ограничивался до 1440px.
 *
 *  - `CommandPalette` монтируется ровно один раз (Req 7.1, 25.4). Он сам
 *    слушает Cmd/Ctrl+K хоткей и рендерится через portal — поэтому не
 *    влияет на layout AppShell. Для триггера из Topbar используется
 *    проп `onOpenCommandPalette`, который имитирует тот же хоткей на
 *    уровне окна: это единая точка открытия палитры, без дублирующего
 *    state-контроллера в AppShell (палитра остаётся source of truth для
 *    своего `open`-состояния).
 *
 *  - `MobileTabBar` всегда смонтирован, скрывается CSS'ом на Tablet+;
 *    первые 5 элементов из NAV_ITEMS — Dashboard, Questions, Tasks,
 *    Trainer, Mock (Req 8.3).
 *
 *  - Никаких `100vw`/`100vh`/hex-литералов — все величины приходят
 *    через токены DS v2 в AppShell.css (Req 1.8, 22.2).
 *
 *  - Next.js layout уже обёрнут в `<main id="main">` (см. `src/app/layout.tsx`).
 *    Чтобы не создавать вложенных `<main>` (невалидный HTML), AppShell
 *    использует `<section>` как контейнер контент-области. Скролл-цель
 *    `SkipLink` остаётся на глобальном `<main id="main">`.
 */

import { useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import {
    Activity,
    BookOpen,
    Dumbbell,
    LayoutDashboard,
    Terminal,
    User as UserIcon,
    Users,
} from 'lucide-react'

import { t } from '@/lib/i18n'
import { NAV_ITEMS } from '@/lib/command-palette-items'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileTabBar, type MobileTabBarItem } from './MobileTabBar'
import { CommandPalette } from './CommandPalette'

import './AppShell.css'

export interface AppShellProps {
    /**
     * Текущий авторизованный пользователь. Если `null` — AppShell не
     * рендерится вовсе (Req 6.8). Родитель (AuthGate) рендерит вместо
     * него Public_Landing или Auth_Module.
     */
    user: User | null
    /**
     * Контент текущего маршрута (Dashboard/Questions/Tasks/…). Рендерится
     * внутри `<section class="app-shell__main">`.
     */
    children: ReactNode
}

/**
 * Иконки для мобильного tab-bar. Ключ — `href` раздела, значение —
 * React-узел иконки с фиксированным размером 20 (совместимо с touch
 * target ≥ 44×44 на контейнере `.mobile-tab-bar__link`).
 */
const TAB_ICON_BY_HREF: Record<string, ReactNode> = {
    '/': <LayoutDashboard size={20} aria-hidden="true" />,
    '/questions': <BookOpen size={20} aria-hidden="true" />,
    '/tasks': <Terminal size={20} aria-hidden="true" />,
    '/trainer': <Dumbbell size={20} aria-hidden="true" />,
    '/mock': <Users size={20} aria-hidden="true" />,
    '/profile': <UserIcon size={20} aria-hidden="true" />,
    '/status': <Activity size={20} aria-hidden="true" />,
}

/**
 * Строит список табов для MobileTabBar. Берём первые 5 разделов из
 * `NAV_ITEMS` (Dashboard, Questions, Tasks, Trainer, Mock) — Req 8.3.
 *
 * Метки локализуем через `t('nav.*')` по стабильным id элементов из
 * `NAV_ITEMS` (`nav.dashboard`, `nav.questions`, …) — не полагаемся
 * на строку `title`, которую команда палитры задаёт в RU «как есть»:
 * это сохраняет i18n-контракт (Req 24.1) и даёт консистентные метки
 * между Sidebar и MobileTabBar.
 */
function buildMobileTabItems(): MobileTabBarItem[] {
    return NAV_ITEMS.slice(0, 5).map((item) => ({
        href: item.href ?? '/',
        // Ключи `NAV_ITEMS[i].id` имеют вид `"nav.xxx"` — это
        // одновременно валидные TranslationKey (см. src/lib/i18n/ru.ts).
        label: t(item.id as Parameters<typeof t>[0]),
        icon: TAB_ICON_BY_HREF[item.href ?? '/'] ?? null,
    }))
}

/**
 * Имитирует Cmd/Ctrl+K на window. CommandPalette слушает этот хоткей
 * через `useGlobalHotkey` и сам тогглит своё открытое состояние.
 * Используем `navigator.platform` эвристику, идентичную той, что
 * живёт в `useGlobalHotkey` — это гарантирует, что synthetic event
 * пройдёт matcher без подмены mod на другой ключ.
 *
 * Почему не через `useState` + prop-drilling в CommandPalette?
 *  - CommandPalette умышленно инкапсулирует своё `open`-состояние
 *    (Req 25.4: одна эмиссия `command_palette_opened` на открытие).
 *    Два источника истины (внешний prop + внутренний state) усложняют
 *    инвариант. Поэтому делаем ровно одну точку входа — хоткей —
 *    и вся логика открытия живёт внутри CommandPalette.
 */
function dispatchCommandPaletteHotkey(): void {
    if (typeof window === 'undefined') return
    const isMac =
        typeof navigator !== 'undefined' &&
        /mac|iphone|ipad|ipod/i.test(
            (navigator.platform ?? '') || (navigator.userAgent ?? ''),
        )
    const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
        cancelable: true,
    })
    window.dispatchEvent(event)
}

export function AppShell({ user, children }: AppShellProps) {
    // Req 6.8 — гость не видит AppShell. Компонент выходит раньше любых
    // подписок/эффектов, поэтому Sidebar/Topbar/CommandPalette не монтируются
    // и не подписываются на keydown для неавторизованного пользователя
    // (дополнительная гарантия к Req 7.8).
    const handleOpenCommandPalette = useCallback(() => {
        dispatchCommandPaletteHotkey()
    }, [])

    if (user === null) return null

    const mobileTabs = buildMobileTabItems()

    return (
        <div className="app-shell" data-ds="app-shell">
            {/*
              Sidebar:
                - Mobile  (< 768px): скрыт через `display: none` (см. CSS);
                  prop `defaultCollapsed` не принципиален на этом брейкпоинте,
                  т.к. сайдбар не в потоке.
                - Tablet  (768–1023px): `defaultCollapsed={true}` (Req 8.5).
                  Ширина автоматически = 72px.
                - Desktop/Wide (≥ 1024px): состояние из `localStorage`
                  (Req 6.4), default = expanded.

                Мы **не переключаем** `defaultCollapsed` через JS match-media,
                чтобы избежать hydration mismatch. Вместо этого рендерим ДВА
                инстанса сайдбара (один для Tablet с `defaultCollapsed`,
                один для Desktop/Wide без), показывая нужный по CSS. Это
                немного дублирует DOM, но даёт SSR-идентичный рендер и
                корректные ширины колонок на каждом брейкпоинте без
                JS-костылей. На Mobile оба инстанса скрыты через CSS.
            */}
            <Sidebar className="app-shell__sidebar app-shell__sidebar--desktop" />
            <Sidebar
                className="app-shell__sidebar app-shell__sidebar--tablet"
                defaultCollapsed={true}
            />

            {/*
              Правая колонка: Topbar (sticky) + основной контент. Вынесена
              в отдельный grid-child, чтобы sidebar оставался полной
              высоты viewport, а sticky-topbar прилипал к верху области
              контента (внутри скроллящегося контейнера).
            */}
            <div className="app-shell__content">
                <Topbar onOpenCommandPalette={handleOpenCommandPalette} />

                {/*
                  <section> вместо <main>: в корневом layout уже есть
                  <main id="main">, а вложенные <main> невалидны. Роль
                  main уже принадлежит родителю, здесь — просто
                  контент-секция с max-width / центрированием (Req 9.2).
                */}
                <section
                    className="app-shell__main"
                    aria-label={t('nav.dashboard')}
                >
                    <div className="app-shell__main-inner">{children}</div>
                </section>
            </div>

            {/*
              MobileTabBar — всегда смонтирован. CSS в MobileTabBar.css
              скрывает его на Tablet/Desktop/Wide (`display: none`
              вне `max-width: 767px`). При `items.length === 0` сам
              MobileTabBar рендерит `<nav aria-hidden />` и Sidebar
              всё равно остаётся скрытым на Mobile (Req 8.2) — это
              гарантирует CSS-правило `.app-shell__sidebar { display: none }`
              в mobile-first базовом слое.
            */}
            <MobileTabBar items={mobileTabs} />

            {/*
              CommandPalette — один инстанс на всё приложение. Портал
              в `document.body`, поэтому не участвует в grid layout.
              Открывается хоткеем (Cmd/Ctrl+K) или через synthetic
              dispatch из Topbar (`handleOpenCommandPalette`).
            */}
            <CommandPalette user={user} />
        </div>
    )
}

export default AppShell
