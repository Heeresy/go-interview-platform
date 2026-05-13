'use client'

/**
 * Sidebar — основная вертикальная навигация App_Shell (Design System v2).
 *
 * Контракт (Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 22.2):
 *
 *  - Ссылки на семь разделов — Dashboard, Questions, Tasks, Trainer, Mock,
 *    Profile, Status. Источник — статический массив, согласованный с
 *    `NAV_ITEMS` из `@/lib/command-palette-items`, чтобы палитра и sidebar
 *    всегда показывали идентичный набор разделов в одинаковом порядке.
 *  - Лейблы берутся из словаря RU через `t('nav.*')` — никаких хардкодных
 *    строк в компоненте (Req 24.1).
 *  - Активный маршрут определяется через `usePathname()`:
 *      - для корневого `/` — строгое равенство `pathname === '/'`;
 *      - для любого другого `href` — `pathname === href ||
 *        pathname.startsWith(href + '/')`, что корректно обрабатывает
 *        подмаршруты (напр., `/questions/abc` считается активным для
 *        `/questions`, но `/tasks` не попадает в активные для `/ta`).
 *    Активная ссылка получает атрибут `data-active="true"` (используется
 *    CSS для подсветки + акцентного индикатора слева) и `aria-current="page"`
 *    для скринридеров.
 *  - Состояние `collapsed` хранится в `localStorage["sidebar_collapsed"]`
 *    как `"1"` / `"0"`. Чтение и запись обёрнуты в try/catch: при
 *    недоступности storage (приватный режим, квота, политика браузера)
 *    — fallback к in-memory state без `console.error`.
 *  - Ширина: expanded ≥ 240px (реализовано как `calc(var(--space-32) * 2)`
 *    = 256px), collapsed ≤ 72px (`var(--space-18)` = 72px). Оба значения
 *    живут в `Sidebar.css` как токены Design_System.
 *  - В collapsed режиме метки визуально скрыты, а при hover/focus над
 *    иконкой показывается текст через `<Tooltip>` из `@/components/ui`.
 *    Tooltip оборачивает `<Link>` и пробрасывает aria-describedby.
 *  - Кнопка сворачивания — `IconButton` с `ChevronLeft`/`ChevronRight`,
 *    `aria-label={t('a11y.toggleSidebar')}`, располагается внизу.
 *
 *  SSR-корректность:
 *    - `useState(() => false)` — первый рендер всегда выдаёт expanded,
 *      чтобы совпадало с серверной отрисовкой. Восстановление значения
 *      из `localStorage` происходит в `useEffect` после mount; это может
 *      вызвать разовый переход ширины, что покрывается CSS-transition.
 *      Альтернатива (inline bootstrap как у темы) здесь не нужна — сам
 *      sidebar не вызывает FOUC у контента (контент не «прыгает» между
 *      256px и 72px так же остро, как тема меняет цвета).
 */

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    useCallback,
    useMemo,
    useState,
    useSyncExternalStore,
    type ComponentType,
    type ReactNode,
    type SVGProps,
} from 'react'
import {
    Activity,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Dumbbell,
    LayoutDashboard,
    Terminal,
    User,
    Users,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { t, type TranslationKey } from '@/lib/i18n'
import { IconButton } from '@/components/ui/IconButton'
import { Tooltip } from '@/components/ui/Tooltip'

import './Sidebar.css'

/**
 * Ключ `localStorage` для состояния collapsed.
 * Экспорт — чтобы тесты и сопутствующие модули могли ссылаться на тот же
 * ключ, исключая рассинхрон из-за дублирования литерала.
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar_collapsed'

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

interface SidebarNavItem {
    /** Стабильный идентификатор (используется как React key). */
    id: string
    /** Целевой маршрут. Ровно тот же, что в `NAV_ITEMS` палитры. */
    href: string
    /** Ключ i18n для локализованной метки (Req 24.1). */
    labelKey: TranslationKey
    /** Lucide-иконка раздела. */
    icon: IconType
}

/**
 * Навигационные пункты Sidebar. Порядок идентичен `NAV_ITEMS` из
 * `@/lib/command-palette-items` (см. task 11.3): Dashboard, Questions,
 * Tasks, Trainer, Mock, Profile, Status (Req 6.2).
 *
 * Иконки — из спецификации задачи 10.1:
 *   LayoutDashboard, BookOpen, Terminal, Dumbbell, Users, User, Activity.
 */
const SIDEBAR_ITEMS: readonly SidebarNavItem[] = [
    { id: 'dashboard', href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'questions', href: '/questions', labelKey: 'nav.questions', icon: BookOpen },
    { id: 'tasks', href: '/tasks', labelKey: 'nav.tasks', icon: Terminal },
    { id: 'trainer', href: '/trainer', labelKey: 'nav.trainer', icon: Dumbbell },
    { id: 'mock', href: '/mock', labelKey: 'nav.mock', icon: Users },
    { id: 'profile', href: '/profile', labelKey: 'nav.profile', icon: User },
    { id: 'status', href: '/status', labelKey: 'nav.status', icon: Activity },
] as const

/**
 * Определяет, является ли ссылка активной для заданного pathname.
 *
 *  - Для `/` требуется строгое равенство: иначе любой маршрут начинался бы
 *    с `/` и дашборд всегда был бы «активным».
 *  - Для остальных `href` активны сам маршрут и его подмаршруты:
 *    `pathname === href` или `pathname.startsWith(href + '/')`.
 *    Префикс с `/` гарантирует, что `/tasks` не совпадёт с `/task-graph`
 *    или `/tasksuffix`.
 *
 * Экспортируем чистую функцию отдельно — удобно для unit- и property-тестов
 * (task 10.2).
 */
export function isSidebarLinkActive(pathname: string, href: string): boolean {
    if (!pathname) return false
    if (href === '/') return pathname === '/'
    if (pathname === href) return true
    return pathname.startsWith(href + '/')
}

/** Безопасное чтение collapsed-флага из `localStorage`. */
function readCollapsedFromStorage(): boolean {
    if (typeof window === 'undefined') return false
    try {
        const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
        return raw === '1'
    } catch {
        // Storage недоступен — остаёмся в expanded, без console.error.
        return false
    }
}

/** Безопасная запись collapsed-флага в `localStorage`. */
function writeCollapsedToStorage(collapsed: boolean): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(
            SIDEBAR_COLLAPSED_STORAGE_KEY,
            collapsed ? '1' : '0',
        )
    } catch {
        // Storage недоступен — no-op, без console.error.
    }
}

/**
 * Внешний «store» для collapsed-флага поверх `localStorage`.
 *
 * Используется с `useSyncExternalStore`, чтобы:
 *  1) Избежать `setState` в `useEffect` (React 19 ESLint-правило
 *     `react-hooks/set-state-in-effect`);
 *  2) Получить корректное поведение при SSR через `getServerSnapshot`
 *     — первый клиентский рендер совпадает с серверным (expanded),
 *     и после гидратации значение подтягивается из storage без
 *     cascading re-render;
 *  3) Синхронизировать sidebar-состояние между вкладками через
 *     событие `storage` (вторичная, но полезная семантика).
 */
const collapsedStore = {
    subscribe(onChange: () => void): () => void {
        if (typeof window === 'undefined') return () => {}
        const handler = (e: StorageEvent) => {
            if (e.key === null || e.key === SIDEBAR_COLLAPSED_STORAGE_KEY) {
                onChange()
            }
        }
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
    },
    getSnapshot(): boolean {
        return readCollapsedFromStorage()
    },
    getServerSnapshot(): boolean {
        // Сервер не имеет storage; возвращаем expanded, чтобы совпадало
        // с первым клиентским snapshot до того, как браузер применит
        // реальное значение (React гарантирует идентичность SSR и
        // первого клиентского рендера при одинаковом server snapshot).
        return false
    },
}

export interface SidebarProps {
    /**
     * Дополнительный className для корневого `<aside>`. Используется
     * `AppShell`, чтобы отвечать за layout-позиционирование (grid-column,
     * display toggle по брейкпоинтам). Внутренние стили Sidebar от этого
     * не зависят.
     */
    className?: string
    /**
     * Необязательная начальная установка collapsed-состояния —
     * например, на Viewport_Tablet `AppShell` может отдавать `true`
     * (Req 8.5). При отсутствии используется значение из localStorage.
     */
    defaultCollapsed?: boolean
    /**
     * Опциональный колбэк, вызываемый при каждом переключении состояния.
     * Позволяет `AppShell` синхронизировать ширину sidebar со своей
     * grid-template-columns без дублирующего чтения storage.
     */
    onCollapsedChange?: (collapsed: boolean) => void
}

/**
 * Sidebar — клиентский компонент. `usePathname` требует CSR, `localStorage`
 * недоступен на сервере, поэтому `"use client"` обязателен.
 */
export function Sidebar({
    className,
    defaultCollapsed,
    onCollapsedChange,
}: SidebarProps = {}): ReactNode {
    const pathname = usePathname() ?? ''

    // Основное collapsed-состояние приходит из `localStorage` через
    // `useSyncExternalStore`. На сервере и на первом клиентском рендере
    // возвращается `false` (expanded) — это совпадает с серверным HTML
    // и исключает hydration mismatch. После гидратации snapshot
    // пересчитывается, и сайдбар визуально принимает сохранённую ширину
    // (CSS-transition делает переход плавным).
    const storedCollapsed = useSyncExternalStore(
        collapsedStore.subscribe,
        collapsedStore.getSnapshot,
        collapsedStore.getServerSnapshot,
    )

    // Локальный override — активен после клика пользователя или когда
    // родитель явно прокидывает `defaultCollapsed`. Пока override = null,
    // компонент следует за storage; как только override выставлен,
    // `storage` больше не мутирует визуальное состояние (пользователь
    // явно выбрал — это приоритетно).
    const [override, setOverride] = useState<boolean | null>(() =>
        typeof defaultCollapsed === 'boolean' ? defaultCollapsed : null,
    )

    const collapsed: boolean =
        override !== null ? override : storedCollapsed

    const setCollapsed = useCallback(
        (next: boolean) => {
            setOverride(next)
            writeCollapsedToStorage(next)
            onCollapsedChange?.(next)
        },
        [onCollapsedChange],
    )

    const handleToggle = useCallback(() => {
        setCollapsed(!collapsed)
    }, [collapsed, setCollapsed])

    // Подготовим активные элементы ровно один раз на изменение pathname,
    // чтобы избежать повторного вычисления isActive в цикле рендера.
    const decoratedItems = useMemo(
        () =>
            SIDEBAR_ITEMS.map((item) => ({
                ...item,
                active: isSidebarLinkActive(pathname, item.href),
                label: t(item.labelKey),
            })),
        [pathname],
    )

    return (
        <aside
            className={cn('sidebar glass', className)}
            data-collapsed={collapsed ? 'true' : 'false'}
            aria-label={t('nav.dashboard')}
        >
            <nav className="sidebar__nav" aria-label={t('nav.dashboard')}>
                <ul className="sidebar__list">
                    {decoratedItems.map((item) => {
                        const Icon = item.icon
                        const linkNode = (
                            <Link
                                href={item.href}
                                className="sidebar__link"
                                data-active={item.active ? 'true' : 'false'}
                                aria-current={item.active ? 'page' : undefined}
                                // В collapsed-режиме даём native-title как
                                // запасную подсказку, если Tooltip по какой-то
                                // причине не отрисуется (напр., portal-контейнер
                                // ещё не готов на первом paint).
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="sidebar__icon" aria-hidden="true">
                                    <Icon size={20} />
                                </span>
                                <span className="sidebar__label">{item.label}</span>
                            </Link>
                        )

                        return (
                            <li key={item.id} className="sidebar__item">
                                {collapsed ? (
                                    <Tooltip content={item.label} placement="right">
                                        {linkNode}
                                    </Tooltip>
                                ) : (
                                    linkNode
                                )}
                            </li>
                        )
                    })}
                </ul>
            </nav>

            <div className="sidebar__footer">
                <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={t('a11y.toggleSidebar')}
                    aria-expanded={!collapsed}
                    onClick={handleToggle}
                    icon={
                        collapsed ? (
                            <ChevronRight size={18} />
                        ) : (
                            <ChevronLeft size={18} />
                        )
                    }
                />
            </div>
        </aside>
    )
}

export default Sidebar
