'use client'

/**
 * `<TaskFilters />` — sticky-панель фильтров и поиска для
 * `Tasks_Module` (task 18.1; Requirements 15.1, 20.1, 20.2, 20.3, 14.4,
 * 22.1, 22.4, 24.2).
 *
 * Зеркалит `QuestionFilters.tsx` (task 17.1): та же sticky `GlassPanel`,
 * тот же `Input` для поиска, тот же визуальный rhythm чипов — но вместо
 * категориальных tag-чипов здесь (опционально) подключается фильтр по
 * `Difficulty` (1…5 уровней из `src/types/database.ts`).
 *
 * Контракт:
 *
 *   Props:
 *     {
 *       search: string;
 *       onSearchChange: (v: string) => void;
 *       selectedDifficulties?: number[];
 *       onDifficultiesChange?: (v: number[]) => void;
 *     }
 *
 *   Поведение:
 *
 *   - Корень — `GlassPanel` с `position: sticky; top: var(--space-4)`;
 *     glass-поверхность приходит через класс `.glass` (Req 14.4,
 *     15.1 — sticky-панель фильтров на Glass_Surface).
 *
 *   - Поиск — DS-примитив `<Input />` (контролируемый): значение и
 *     `onChange` проксируются через пропсы. `placeholder` и `aria-label`
 *     берутся через `t()` (Req 24.2) — хардкод-строк в компоненте нет.
 *
 *   - Difficulty-чипы — набор `<Badge as="button">`-кнопок 1…5. Когда
 *     `onDifficultiesChange` передан, клик по чипу добавляет/убирает
 *     уровень из `selectedDifficulties`. Если `onDifficultiesChange`
 *     не передан, чипы рендерятся в read-only режиме (`disabled`) —
 *     это допустимо: фильтр по сложности опционален по контракту
 *     (тот же принцип, что в `QuestionFilters` для tag-чипов).
 *
 *   - Если `selectedDifficulties === undefined` и `onDifficultiesChange`
 *     не передан, чипы **не рендерятся**: панель показывает только
 *     поле поиска. Это сохраняет визуальный rhythm, когда страница
 *     не использует фильтр по сложности.
 *
 *   - Вся раскладка — только на токенах Design_System (`--space-*`,
 *     `--radius-*`, `--fs-*`, `--fw-*`, `--surface-*`, `--accent-*`,
 *     `--border-*`, `--z-sticky`); px-/hex-/rgb-хардкода нет (Req 1.8).
 *
 * Важно: компонент только собирает UI-контроллы; бизнес-логика
 * фильтрации выполняется потребителем (`TasksList`/страница). При
 * пустом/ошибочном состоянии sticky-панель остаётся карточной —
 * fallback-layout (таблица/список) запрещён (Req 14.4, 15.1).
 */

import type { CSSProperties } from 'react'
import { useCallback, useMemo } from 'react'

import { GlassPanel, Input } from '@/components/ui'
import { t, type TranslationKey } from '@/lib/i18n'

export interface TaskFiltersProps {
    /** Текущее значение поля поиска (контролируемо). */
    search: string
    /** Обработчик смены значения поиска. */
    onSearchChange: (v: string) => void
    /**
     * Выбранные уровни сложности (1…5). Когда `onDifficultiesChange`
     * передан, чипы тогглятся против этого массива.
     */
    selectedDifficulties?: number[]
    /**
     * Коллбек смены выбранных уровней. Если не передан — чипы
     * read-only (disabled); если при этом и `selectedDifficulties`
     * не передан — секция чипов не рендерится вовсе.
     */
    onDifficultiesChange?: (v: number[]) => void
    /** Дополнительный className на корневую glass-панель. */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const PANEL_STYLE: CSSProperties = {
    // Sticky-поведение панели (Req 14.4, 15.1). `top` — токен DS.
    position: 'sticky',
    top: 'var(--space-4)',
    // z-index на уровне sticky-ленты — под модалками/toast.
    zIndex: 'var(--z-sticky)' as unknown as number,
    // Внутренняя раскладка.
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    padding: 'var(--space-5)',
    borderRadius: 'var(--radius-lg)',
}

const CHIPS_ROW_STYLE: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--space-2)',
    margin: 0,
    padding: 0,
    listStyle: 'none',
}

const CHIPS_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--border-700)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    marginInlineEnd: 'var(--space-1)',
    userSelect: 'none',
}

const CHIP_BASE_STYLE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-1)',
    // Touch-target ≥ 44×44 на Mobile (Req 11.8): min-height через токен.
    minHeight: 'var(--space-8)',
    paddingBlock: 'var(--space-2)',
    paddingInline: 'var(--space-3)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1,
    cursor: 'pointer',
    transition:
        'background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
    background: 'var(--surface-300)',
    color: 'var(--border-800)',
    borderColor: 'var(--border-200)',
}

const CHIP_ACTIVE_STYLE: CSSProperties = {
    background: 'var(--info-soft)',
    color: 'var(--accent-600)',
    borderColor: 'var(--accent-600)',
}

const CHIP_DISABLED_STYLE: CSSProperties = {
    cursor: 'default',
    opacity: 0.7,
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Фиксированный диапазон уровней сложности из `Difficulty = 1 | 2 | 3 | 4 | 5`
 * (`src/types/database.ts`). Рендерим все пять чипов — пользователь
 * сам выбирает, какие активировать.
 */
const DIFFICULTY_VALUES: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5]

function difficultyLabelKey(level: 1 | 2 | 3 | 4 | 5): TranslationKey {
    switch (level) {
        case 1:
            return 'tasks.filters.difficulty.1'
        case 2:
            return 'tasks.filters.difficulty.2'
        case 3:
            return 'tasks.filters.difficulty.3'
        case 4:
            return 'tasks.filters.difficulty.4'
        case 5:
            return 'tasks.filters.difficulty.5'
    }
}

// ── Component ───────────────────────────────────────────────────────────

export function TaskFilters({
    search,
    onSearchChange,
    selectedDifficulties,
    onDifficultiesChange,
    className,
}: TaskFiltersProps) {
    // Показываем чипы, если:
    //   - потребитель готов их менять (`onDifficultiesChange`), ИЛИ
    //   - передан непустой `selectedDifficulties` (read-only снимок).
    const chipsVisible =
        Boolean(onDifficultiesChange) ||
        (selectedDifficulties !== undefined &&
            selectedDifficulties.length > 0)

    const selectedSet = useMemo(
        () => new Set(selectedDifficulties ?? []),
        [selectedDifficulties],
    )

    const toggleDifficulty = useCallback(
        (level: number) => {
            if (!onDifficultiesChange) return
            const current = selectedDifficulties ?? []
            const next = selectedSet.has(level)
                ? current.filter((d) => d !== level)
                : [...current, level]
            onDifficultiesChange(next)
        },
        [onDifficultiesChange, selectedDifficulties, selectedSet],
    )

    const handleSearchInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onSearchChange(e.target.value)
        },
        [onSearchChange],
    )

    const chipsDisabled = !onDifficultiesChange

    return (
        <GlassPanel
            className={className}
            style={PANEL_STYLE}
            data-ds="task-filters"
            role="search"
            aria-label={t('tasks.filters.search')}
        >
            <Input
                type="search"
                value={search}
                onChange={handleSearchInput}
                placeholder={t('tasks.filters.search')}
                aria-label={t('tasks.filters.search')}
                autoComplete="off"
                spellCheck={false}
                data-testid="task-filters-search"
            />

            {chipsVisible ? (
                <ul
                    style={CHIPS_ROW_STYLE}
                    aria-label={t('tasks.filters.difficulty')}
                    data-testid="task-filters-difficulty"
                >
                    <li aria-hidden="true" style={CHIPS_LABEL_STYLE}>
                        {t('tasks.filters.difficulty')}
                    </li>
                    {DIFFICULTY_VALUES.map((level) => {
                        const isActive = selectedSet.has(level)
                        const style: CSSProperties = {
                            ...CHIP_BASE_STYLE,
                            ...(isActive ? CHIP_ACTIVE_STYLE : null),
                            ...(chipsDisabled ? CHIP_DISABLED_STYLE : null),
                        }
                        return (
                            <li key={level}>
                                <button
                                    type="button"
                                    data-ds="task-filters-chip"
                                    data-level={level}
                                    data-active={isActive ? 'true' : undefined}
                                    aria-pressed={isActive}
                                    disabled={chipsDisabled}
                                    onClick={() => toggleDifficulty(level)}
                                    style={style}
                                >
                                    {t(difficultyLabelKey(level))}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            ) : null}
        </GlassPanel>
    )
}

export default TaskFilters
