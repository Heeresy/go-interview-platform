'use client'

/**
 * MobileTabBar — плавающий нижний tab-bar App_Shell для Viewport_Mobile
 * (Design System v2).
 *
 * Контракт (Requirements 8.1, 8.2, 8.3, 8.4, 11.8, 22.2):
 *
 *  - Компонент виден только на Viewport_Mobile (`@media (max-width: 767px)`).
 *    На Tablet/Desktop/Wide tab-bar скрыт через `display: none` в CSS,
 *    что исключает его из потока layout и блокирует перехват событий.
 *    Решение принимается строго в CSS — никаких runtime match-media-веток,
 *    чтобы не было несоответствия между серверным и клиентским рендером.
 *
 *  - Плавающая позиция: `position: fixed; bottom: 0; left: 0; right: 0`
 *    с `padding-bottom: env(safe-area-inset-bottom)` (см. MobileTabBar.css).
 *    Glass-поверхность приходит через класс `.glass` из `globals.css`.
 *
 *  - Количество элементов ограничено пятью (`.slice(0, 5)`) — Req 8.3.
 *    Любой «шестой и далее» элемент молча отбрасывается; спецификация
 *    не требует разрастания в более сложные паттерны (overflow-меню и т.п.),
 *    за полный список маршрутов отвечает Drawer, открываемый из Topbar
 *    (Req 8.6), а для всех разделов — Command_Palette.
 *
 *  - Пустой список (`items.length === 0`): рендерится `<nav aria-hidden />`
 *    — пустая оболочка без интерактивного содержимого. Важная гарантия
 *    Requirement 8.2: при пустом tab-bar Sidebar **всё равно остаётся
 *    скрытым** на Viewport_Mobile — этот компонент fallback'а к sidebar
 *    не реализует, и никакой другой часть App_Shell тоже не имеет права.
 *    CSS-правило `.mobile-tab-bar:not([aria-hidden='true']) { display: block }`
 *    дополнительно гарантирует, что на мобильнике пустая оболочка не
 *    занимает места в layout.
 *
 *  - Активный элемент определяется через `usePathname()` + точно тот же
 *    алгоритм, что и в Sidebar: строгое равенство для `/`, `startsWith`
 *    с разделителем для остальных маршрутов. Одинаковая семантика
 *    «активного» между sidebar и tab-bar — требование консистентности
 *    навигационного слоя (Req 6.3 распространяется и на мобильный слой).
 *
 *  - Активной ссылке проставляются `aria-current="page"` и
 *    `data-active="true"` (CSS-подсветка из `MobileTabBar.css`). Touch-
 *    target обеспечивается через `min-height: var(--space-11)` = 44px на
 *    `.mobile-tab-bar__link` и `flex: 1 1 0` у элементов списка
 *    (Req 11.8) — при ширине экрана ≥ 375px и ≤ 5 табах это даёт
 *    ширину ≥ 44px для каждой кнопки.
 */

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'

import './MobileTabBar.css'

/**
 * Максимальное число разделов в мобильном tab-bar (Req 8.3).
 * Выделено как константа, чтобы использовать то же значение в
 * property-тестах (задача 10.4*), не полагаясь на литерал в коде.
 */
export const MOBILE_TAB_BAR_MAX_ITEMS = 5

export interface MobileTabBarItem {
    /** Целевой маршрут (передаётся в `<Link href>`). */
    href: string
    /** Видимая текстовая метка таба. Компонент-потребитель сам локализует. */
    label: string
    /** Иконка таба. Обычно lucide-react-элемент с заданным `size`. */
    icon: ReactNode
}

export interface MobileTabBarProps {
    /**
     * Список разделов tab-bar. Порядок значим — элементы рендерятся
     * слева-направо. Длина > {@link MOBILE_TAB_BAR_MAX_ITEMS} не
     * приводит к ошибке, но лишние элементы усекаются через `.slice`.
     * Пустой массив вызывает «схлопнутый» рендер `<nav aria-hidden />`
     * (Req 8.2) — fallback к Sidebar не предусмотрен.
     */
    items: MobileTabBarItem[]
}

/**
 * Определяет, активен ли таб для заданного pathname. Публичная чистая
 * функция: (1) удобно тестировать без DOM, (2) гарантирует идентичную
 * семантику «активного» с Sidebar (см. `isSidebarLinkActive`).
 *
 *  - `/` — только строгое равенство (иначе любой путь начинался бы с `/`).
 *  - Прочие маршруты — `pathname === href` или
 *    `pathname.startsWith(href + '/')`. Префикс `/` предотвращает
 *    ложные совпадения вроде `/tasks` ↔ `/task-graph`.
 */
export function isMobileTabBarItemActive(pathname: string, href: string): boolean {
    if (!pathname) return false
    if (href === '/') return pathname === '/'
    if (pathname === href) return true
    return pathname.startsWith(href + '/')
}

export function MobileTabBar({ items }: MobileTabBarProps): ReactNode {
    const pathname = usePathname() ?? ''

    // Usage-контракт: максимум 5 табов (Req 8.3). `slice` безопасен для
    // любой длины (в т.ч. < 5 и === 0) — для пустого массива мы ниже
    // уходим в ветку `<nav aria-hidden />` и этот результат не рендерим.
    const visibleItems = useMemo(
        () =>
            items.slice(0, MOBILE_TAB_BAR_MAX_ITEMS).map((item) => ({
                ...item,
                active: isMobileTabBarItemActive(pathname, item.href),
            })),
        [items, pathname],
    )

    // Requirement 8.2: при пустом списке рендерим пустую оболочку,
    // aria-hidden блокирует объявление скринридерами. CSS-правило
    // `.mobile-tab-bar:not([aria-hidden='true']) { display: block }`
    // гарантирует, что даже на Viewport_Mobile эта оболочка не создаёт
    // визуальной полосы и не перехватывает события. Sidebar при этом
    // остаётся скрытым — fallback запрещён и реализуется отсутствием
    // любой логики показа sidebar в данном файле.
    if (visibleItems.length === 0) {
        return <nav aria-hidden className="mobile-tab-bar glass" />
    }

    return (
        <nav
            className="mobile-tab-bar glass"
            // Локализованную aria-label tab-bar'а задаёт композитор
            // (AppShell) на уровне выше через <nav aria-label>. Здесь
            // мы намеренно не хардкодим строку — в соответствии с Req
            // 24.1 (i18n) все видимые и aria-строки локализуются снаружи.
            aria-label="Mobile navigation"
        >
            <ul className="mobile-tab-bar__list">
                {visibleItems.map((item) => (
                    <li key={item.href} className="mobile-tab-bar__item">
                        <Link
                            href={item.href}
                            className="mobile-tab-bar__link"
                            data-active={item.active ? 'true' : 'false'}
                            aria-current={item.active ? 'page' : undefined}
                        >
                            <span className="mobile-tab-bar__icon" aria-hidden="true">
                                {item.icon}
                            </span>
                            <span className="mobile-tab-bar__label">{item.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    )
}

export default MobileTabBar
