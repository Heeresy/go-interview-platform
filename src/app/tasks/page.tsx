'use client'

/**
 * `/tasks` — список задач Tasks_Module (task 18.6, UI Redesign 2026).
 *
 * Структурно повторяет паттерн `/trainer` / `/`: клиентский
 * `<AuthGate />` решает, что показывать; авторизованная ветка обёрнута
 * в `<AppShell />` и рендерит DS v2 связку `<TaskFilters />` +
 * `<TasksList />` (Req 15.1, 21.1, 21.5, 22.4, 22.5).
 *
 * Старая UI-реализация полностью заменена: `motion.*`-обёртки,
 * хардкод-CSS классы (`task-card`, `filter-chip`, `filters-panel`),
 * `Search`/`Filter` lucide-иконки и inline `<style jsx>`-блок здесь
 * больше не используются. Их заменили DS v2 примитивы из
 * `@/components/tasks` и `@/components/ui` со 100%-ным покрытием
 * токенов Design_System (Req 1.8).
 *
 * Бизнес-логика и API-контракты не меняются (Req 21.2):
 *   - `createClient()` → `@supabase/ssr` browser-клиент;
 *   - таблицы `categories` и `tasks` (с join на `category`) читаются
 *     теми же селекторами `select('*, category:categories(*)')` и
 *     теми же `.order(...)`;
 *   - фильтры `category_id` и `difficulty` применяются на стороне
 *     Supabase, поиск по `title`/`description` — на клиенте после
 *     загрузки (как и было в legacy-странице).
 *
 * Почему `'use client'`: `<AuthGate />` принимает render-функцию
 * `authenticated={({ user }) => ...}`, а функции не сериализуются
 * через границу server→client в Next.js App Router — та же причина,
 * что в `src/app/page.tsx` и `src/app/trainer/page.tsx`. На клиенте
 * `<AuthGate />` всё равно требует prop `guest`, поэтому передаём
 * `null` как безопасный fallback на случай гонок при первичной
 * загрузке: к моменту рендера `src/middleware.ts` (Supabase session
 * refresh) уже выровнял состояние сессии для guest'ов, и в production
 * до этого узла guest не доходит.
 *
 * UI-стейт (`tasks`, `categories`, `search`, `selectedCategory`,
 * `selectedDifficulties`, `isLoading`, `error`) живёт в локальном
 * state внутри клиентской `<TasksPageContent />` — `<AppShell />`
 * монтируется один раз и сохраняется при смене сессии (внутри
 * `AuthGate` user меняется, но компонент-обёртка остаётся).
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

import { AppShell, AuthGate } from '@/components/shell'
import { TaskFilters, TasksList } from '@/components/Tasks'
import { GlassPanel } from '@/components/ui'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import type { Category, Task } from '@/types/database'

// ── Layout (tokens only; Req 1.8) ────────────────────────────────────────

/**
 * Корневая обёртка маршрута внутри `<AppShell />.app-shell__main-inner`.
 * Вертикальный flex с DS-spacing — заголовок, фильтры, список задач.
 */
const PAGE_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
    width: '100%',
    minWidth: 0,
}

const HEADER_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
}

const TITLE_STYLE: CSSProperties = {
    margin: 0,
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-2xl)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    color: 'var(--border-900)',
}

/**
 * Sticky-обёртка над фильтрами + grid-сеткой задач. На Desktop/Wide
 * задействуется двухколоночный grid (sticky фильтры слева, карточки
 * справа); на Mobile/Tablet — вертикальный стек.
 */
const FILTERS_LAYOUT_STYLE: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 'var(--space-6)',
    minWidth: 0,
}

const CATEGORY_CHIPS_PANEL_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    padding: 'var(--space-5)',
    borderRadius: 'var(--radius-lg)',
}

const CATEGORY_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--border-700)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    margin: 0,
}

const CATEGORY_ROW_STYLE: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
    margin: 0,
    padding: 0,
    listStyle: 'none',
}

const CATEGORY_CHIP_BASE_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'var(--space-8)',
    paddingBlock: 'var(--space-2)',
    paddingInline: 'var(--space-3)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-200)',
    background: 'var(--surface-300)',
    color: 'var(--border-800)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1,
    cursor: 'pointer',
    transition:
        'background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
}

const CATEGORY_CHIP_ACTIVE_STYLE: CSSProperties = {
    background: 'var(--info-soft)',
    color: 'var(--accent-600)',
    borderColor: 'var(--accent-600)',
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * Клиентский контент страницы `/tasks`. Вынесен в отдельную функцию,
 * чтобы быть `children` AppShell-а из `AuthGate.authenticated` (Req 6.8,
 * 21.5).
 */
function TasksPageContent() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
        null,
    )
    const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>(
        [],
    )

    /**
     * Загрузка данных из Supabase. Контракт идентичен legacy-странице
     * (Req 21.2, 21.5):
     *   - категории — `select('*').order('sort_order')`;
     *   - задачи    — `select('*, category:categories(*)')` с join,
     *                 `.order('difficulty').order('created_at', desc)`;
     *   - server-side filters: `category_id`, `difficulty`. `difficulty`
     *     передаётся через `.in(...)` если выбрано несколько уровней;
     *     поиск по `title`/`description` остаётся клиентским.
     */
    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        const supabase = createClient()

        try {
            const { data: cats, error: catsErr } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order')
            if (catsErr) throw catsErr
            if (cats) setCategories(cats)

            let query = supabase
                .from('tasks')
                .select('*, category:categories(*)')
                .order('difficulty')
                .order('created_at', { ascending: false })

            if (selectedCategory) {
                query = query.eq('category_id', selectedCategory)
            }
            if (selectedDifficulties.length > 0) {
                query = query.in('difficulty', selectedDifficulties)
            }

            const { data, error: tasksErr } = await query
            if (tasksErr) throw tasksErr
            setTasks(data ?? [])
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Failed to load tasks'))
            setTasks([])
        } finally {
            setIsLoading(false)
        }
    }, [selectedCategory, selectedDifficulties])

    useEffect(() => {
        loadData()
    }, [loadData])

    /**
     * Поиск по `title` / `description` на клиенте — то же поведение,
     * что в legacy-странице. Регистронезависимое включение подстроки.
     */
    const filteredTasks = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return tasks
        return tasks.filter(
            (task) =>
                task.title.toLowerCase().includes(q) ||
                task.description.toLowerCase().includes(q),
        )
    }, [tasks, search])

    return (
        <div style={PAGE_STYLE} data-ds="tasks-page">
            <header style={HEADER_STYLE}>
                <h1 style={TITLE_STYLE}>{t('tasks.list.title')}</h1>
            </header>

            <div style={FILTERS_LAYOUT_STYLE}>
                <TaskFilters
                    search={search}
                    onSearchChange={setSearch}
                    selectedDifficulties={selectedDifficulties}
                    onDifficultiesChange={setSelectedDifficulties}
                />

                {categories.length > 0 ? (
                    <GlassPanel
                        style={CATEGORY_CHIPS_PANEL_STYLE}
                        data-ds="tasks-page-categories"
                        aria-label={t('tasks.filters.category')}
                    >
                        <p style={CATEGORY_LABEL_STYLE}>
                            {t('tasks.filters.category')}
                        </p>
                        <ul style={CATEGORY_ROW_STYLE}>
                            <li>
                                <button
                                    type="button"
                                    aria-pressed={selectedCategory === null}
                                    onClick={() => setSelectedCategory(null)}
                                    data-active={
                                        selectedCategory === null
                                            ? 'true'
                                            : undefined
                                    }
                                    style={{
                                        ...CATEGORY_CHIP_BASE_STYLE,
                                        ...(selectedCategory === null
                                            ? CATEGORY_CHIP_ACTIVE_STYLE
                                            : null),
                                    }}
                                >
                                    {t('tasks.filters.category.all')}
                                </button>
                            </li>
                            {categories.map((cat) => {
                                const isActive = selectedCategory === cat.id
                                return (
                                    <li key={cat.id}>
                                        <button
                                            type="button"
                                            aria-pressed={isActive}
                                            data-active={
                                                isActive ? 'true' : undefined
                                            }
                                            onClick={() =>
                                                setSelectedCategory(cat.id)
                                            }
                                            style={{
                                                ...CATEGORY_CHIP_BASE_STYLE,
                                                ...(isActive
                                                    ? CATEGORY_CHIP_ACTIVE_STYLE
                                                    : null),
                                            }}
                                        >
                                            {cat.name}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </GlassPanel>
                ) : null}

                <TasksList
                    tasks={filteredTasks}
                    isLoading={isLoading}
                    error={error}
                />
            </div>
        </div>
    )
}

export default function TasksPage() {
    return (
        <AuthGate
            guest={null}
            authenticated={({ user }) => (
                <AppShell user={user}>
                    <TasksPageContent />
                </AppShell>
            )}
        />
    )
}
