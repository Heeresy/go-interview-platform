/**
 * Source of items for Command_Palette (Requirement 7.3).
 *
 * Две группы:
 *   - "nav"    — ссылки на разделы App_Shell (Dashboard, Questions, Tasks,
 *                Trainer, Mock, Profile, Status). Конечное поведение — router.push(href).
 *   - "action" — действия пользователя: создать мок-интервью, начать тренировку,
 *                выйти из аккаунта. Конечное поведение — item.run().
 *
 * Nav-элементы статичны и экспортируются как `NAV_ITEMS`. Action-элементы
 * требуют внешних зависимостей (роутер для навигационных действий, обработчик
 * signOut для выхода из аккаунта), поэтому собираются через фабрику
 * `createActionItems(deps)`. Полный список для `CommandPalette` собирается
 * через `createCommandItems(deps)`.
 *
 * Все строки — человекочитаемые RU-метки (Req 24.1). Вынос в i18n-словарь
 * `src/lib/i18n/ru.ts` произойдёт в рамках task 4.1.
 */

import type { ComponentType, SVGProps } from 'react'
import {
    Activity,
    BookOpen,
    Dumbbell,
    LayoutDashboard,
    LogOut,
    Play,
    Plus,
    Terminal,
    User,
    Users,
} from 'lucide-react'

/**
 * Структурный тип иконки CommandItem — совместим с lucide-react-компонентами,
 * но не зависит от внутренних типов библиотеки (LucideIcon не экспортируется).
 */
export type CommandItemIcon = ComponentType<
    SVGProps<SVGSVGElement> & { size?: number | string }
>

/** Единица элемента палитры согласно design.md §Command_Palette. */
export interface CommandItem {
    /** Стабильный идентификатор; используется как React key и ключ аналитики. */
    id: string
    /** Отображаемое имя в списке палитры (участвует в fuzzy-скоринге). */
    title: string
    /** Группа для рендеринга секциями в UI палитры. */
    group: 'nav' | 'action'
    /** Дополнительные синонимы для fuzzy-поиска (reserved для дальнейшего использования). */
    keywords?: string[]
    /** Для nav: целевой маршрут, по которому будет вызван `router.push(href)`. */
    href?: string
    /**
     * Для action: произвольный обработчик подтверждения.
     * Поддерживает async через возврат Promise — палитра всё равно закрывается
     * безусловно и в первую очередь (Req 7.7), а `run()` вызывается через
     * `queueMicrotask` из `CommandPalette` (см. task 11.4).
     */
    run?: () => void | Promise<void>
    /** Опциональная иконка для визуальной подсказки. */
    icon?: CommandItemIcon
}

/**
 * Зависимости, необходимые для построения action-элементов.
 * Используем минимально-достаточный структурный контракт:
 *   - `router.push(href)` — совместим с `useRouter()` из `next/navigation`;
 *   - `signOut()` — обёртка над `supabase.auth.signOut()` (см. task 11.4);
 * это избавляет модуль от прямой зависимости от Next.js и Supabase клиента,
 * оставляя его чисто декларативным источником данных (Req 21.2).
 */
export interface CommandActionDeps {
    router: { push: (href: string) => void }
    signOut: () => void | Promise<void>
}

/**
 * Статические nav-элементы для всех разделов App_Shell (Req 6.2, 7.3).
 * Порядок совпадает с порядком в `Sidebar` (см. task 10.1), чтобы палитра
 * визуально отражала основную навигацию.
 */
export const NAV_ITEMS: readonly CommandItem[] = [
    {
        id: 'nav.dashboard',
        title: 'Главная',
        group: 'nav',
        href: '/',
        keywords: ['dashboard', 'home', 'главная'],
        icon: LayoutDashboard,
    },
    {
        id: 'nav.questions',
        title: 'Вопросы',
        group: 'nav',
        href: '/questions',
        keywords: ['questions', 'вопросы'],
        icon: BookOpen,
    },
    {
        id: 'nav.tasks',
        title: 'Задачи',
        group: 'nav',
        href: '/tasks',
        keywords: ['tasks', 'code', 'задачи'],
        icon: Terminal,
    },
    {
        id: 'nav.trainer',
        title: 'Тренажёр',
        group: 'nav',
        href: '/trainer',
        keywords: ['trainer', 'practice', 'тренажёр', 'тренажер'],
        icon: Dumbbell,
    },
    {
        id: 'nav.mock',
        title: 'Mock-интервью',
        group: 'nav',
        href: '/mock',
        keywords: ['mock', 'interview', 'интервью'],
        icon: Users,
    },
    {
        id: 'nav.profile',
        title: 'Профиль',
        group: 'nav',
        href: '/profile',
        keywords: ['profile', 'account', 'профиль'],
        icon: User,
    },
    {
        id: 'nav.status',
        title: 'Статус',
        group: 'nav',
        href: '/status',
        keywords: ['status', 'health', 'статус'],
        icon: Activity,
    },
] as const

/**
 * Фабрика action-элементов. Три элемента согласно Req 7.3:
 *   1. Создать мок-интервью → router.push('/mock/create')
 *   2. Начать тренировку    → router.push('/trainer')
 *   3. Выйти из аккаунта    → deps.signOut()
 *
 * Возвращается свежий массив на каждый вызов, чтобы вызывающий код мог
 * безопасно мутировать/сортировать результат без влияния на другие инстансы.
 */
export function createActionItems(deps: CommandActionDeps): CommandItem[] {
    return [
        {
            id: 'action.create-mock',
            title: 'Создать мок-интервью',
            group: 'action',
            keywords: ['create', 'mock', 'interview', 'создать', 'интервью'],
            icon: Plus,
            run: () => {
                deps.router.push('/mock/create')
            },
        },
        {
            id: 'action.start-training',
            title: 'Начать тренировку',
            group: 'action',
            keywords: ['trainer', 'start', 'practice', 'начать', 'тренировка'],
            icon: Play,
            run: () => {
                deps.router.push('/trainer')
            },
        },
        {
            id: 'action.sign-out',
            title: 'Выйти из аккаунта',
            group: 'action',
            keywords: ['logout', 'signout', 'exit', 'выйти', 'выход'],
            icon: LogOut,
            run: () => deps.signOut(),
        },
    ]
}

/**
 * Полный список элементов палитры: nav + actions, в этом порядке.
 * Потребитель (`CommandPalette`) рендерит элементы секциями по `group`.
 */
export function createCommandItems(deps: CommandActionDeps): CommandItem[] {
    return [...NAV_ITEMS, ...createActionItems(deps)]
}
