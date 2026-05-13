'use client'

/**
 * `<MockFilters />` — sticky-панель фильтров для `Mock_Module`
 * (task 20.1; Requirements 17.2, 17.3, 14.4, 22.1, 24.2).
 *
 * Контракт:
 *
 *   Props:
 *     {
 *       selectedDifficulties?: number[];
 *       onDifficultiesChange?: (v: number[]) => void;
 *       availableCategories?: string[];
 *       selectedCategories?: string[];
 *       onCategoriesChange?: (v: string[]) => void;
 *       minRating?: number;                      // 0…5
 *       onMinRatingChange?: (v: number) => void; // 0 = «любой»
 *     }
 *
 *   Три группы чипов:
 *
 *     1) Difficulty — уровни 1…5 (зеркалит `TaskFilters`).
 *     2) Category   — произвольный список (управляется страницей).
 *     3) Rating min — 0 «любой», 1…5 «от N». Реализован как
 *                     single-select (можно выбрать только одно
 *                     минимальное значение).
 *
 *   - Корень — `GlassPanel` с `position: sticky; top: var(--space-4)`;
 *     glass-поверхность приходит через класс `.glass` (Req 17.2:
 *     sticky-панель фильтров по сложности/категории/рейтингу).
 *
 *   - Оборачивается в собственный `SectionErrorBoundary` через
 *     экспорт `MockFilters` (см. ниже): внутренности —
 *     `MockFiltersInner`. При крахе фильтров `renderEmptyOnError`
 *     прячет панель, список карточек остаётся полностью
 *     функциональным (Req 17.3).
 *
 *   - Если ни один callback не передан и селекты пусты, соответ-
 *     ствующая секция чипов не рендерится — это сохраняет
 *     визуальный ритм при частичной интеграции фильтров на странице.
 *
 *   - Вся раскладка — только на токенах Design_System (`--space-*`,
 *     `--radius-*`, `--fs-*`, `--fw-*`, `--surface-*`, `--accent-*`,
 *     `--border-*`, `--z-sticky`); px-/hex-/rgb-хардкода нет (Req 1.8).
 *
 *   - Никакой бизнес-логики: компонент только собирает UI-контроллы
 *     и проксирует onChange-и потребителю.
 */

import type { CSSProperties } from 'react'
import { useCallback, useMemo } from 'react'
import { Star } from 'lucide-react'

import { GlassPanel } from '@/components/ui'
import { t, type TranslationKey } from '@/lib/i18n'

import { SectionErrorBoundary } from './SectionErrorBoundary'

export interface MockFiltersProps {
    // Difficulty
    /** Выбранные уровни сложности (1…5). */
    selectedDifficulties?: number[]
    /** Коллбек смены уровней. Если не передан — чипы read-only. */
    onDifficultiesChange?: (v: number[]) => void

    // Category
    /** Источник чипов категорий. */
    availableCategories?: string[]
    /** Выбранные категории. */
    selectedCategories?: string[]
    /** Коллбек смены категорий. Если не передан — чипы read-only. */
    onCategoriesChange?: (v: string[]) => void

    // Rating (single-select min value)
    /**
     * Минимальный рейтинг (0 = «любой», 1…5 = «от N»). Если не
     * передан — секция не рендерится.
     */
    minRating?: number
    /** Коллбек смены. Если не передан — чипы read-only. */
    onMinRatingChange?: (v: number) => void

    /** Дополнительный className на корневую glass-панель. */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const PANEL_STYLE: CSSProperties = {
    position: 'sticky',
    top: 'var(--space-4)',
    zIndex: 'var(--z-sticky)' as unknown as number,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    padding: 'var(--space-5)',
    borderRadius: 'var(--radius-lg)',
}

const GROUP_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    margin: 0,
    padding: 0,
    listStyle: 'none',
}

const GROUP_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--border-700)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    userSelect: 'none',
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
 * Фиксированный диапазон уровней сложности из `Difficulty = 1..5`
 * (`src/types/database.ts`).
 */
const DIFFICULTY_VALUES: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5]

/** Варианты минимального рейтинга: 0 (любой) и 1…5. */
const RATING_VALUES: ReadonlyArray<0 | 1 | 2 | 3 | 4 | 5> = [0, 1, 2, 3, 4, 5]

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

// ── Inner (без ErrorBoundary) ───────────────────────────────────────────

export function MockFiltersInner({
    selectedDifficulties,
    onDifficultiesChange,
    availableCategories,
    selectedCategories,
    onCategoriesChange,
    minRating,
    onMinRatingChange,
    className,
}: MockFiltersProps) {
    // Видимость групп: группа показывается, если потребитель явно
    // участвует в ней (через onChange) либо предоставил read-only
    // начальное состояние. Это устраняет пустые «призрачные» секции.
    const difficultyVisible =
        Boolean(onDifficultiesChange) ||
        (selectedDifficulties !== undefined &&
            selectedDifficulties.length > 0)

    const categoriesVisible =
        (availableCategories !== undefined &&
            availableCategories.length > 0) ||
        Boolean(onCategoriesChange) ||
        (selectedCategories !== undefined && selectedCategories.length > 0)

    const ratingVisible = minRating !== undefined || Boolean(onMinRatingChange)

    // Difficulty toggle.
    const selectedDifficultiesSet = useMemo(
        () => new Set(selectedDifficulties ?? []),
        [selectedDifficulties],
    )
    const toggleDifficulty = useCallback(
        (level: number) => {
            if (!onDifficultiesChange) return
            const current = selectedDifficulties ?? []
            const next = selectedDifficultiesSet.has(level)
                ? current.filter((d) => d !== level)
                : [...current, level]
            onDifficultiesChange(next)
        },
        [onDifficultiesChange, selectedDifficulties, selectedDifficultiesSet],
    )
    const difficultyChipsDisabled = !onDifficultiesChange

    // Category toggle.
    const selectedCategoriesSet = useMemo(
        () => new Set(selectedCategories ?? []),
        [selectedCategories],
    )
    const categoryList = useMemo<string[]>(() => {
        if (availableCategories && availableCategories.length > 0) {
            return availableCategories
        }
        if (selectedCategories && selectedCategories.length > 0) {
            return selectedCategories
        }
        return []
    }, [availableCategories, selectedCategories])
    const toggleCategory = useCallback(
        (cat: string) => {
            if (!onCategoriesChange) return
            const current = selectedCategories ?? []
            const next = selectedCategoriesSet.has(cat)
                ? current.filter((c) => c !== cat)
                : [...current, cat]
            onCategoriesChange(next)
        },
        [onCategoriesChange, selectedCategories, selectedCategoriesSet],
    )
    const categoryChipsDisabled = !onCategoriesChange

    // Rating single-select.
    const currentMinRating = minRating ?? 0
    const selectMinRating = useCallback(
        (value: number) => {
            if (!onMinRatingChange) return
            // Single-select: повторный клик на активном = сброс в 0.
            onMinRatingChange(currentMinRating === value ? 0 : value)
        },
        [onMinRatingChange, currentMinRating],
    )
    const ratingChipsDisabled = !onMinRatingChange

    return (
        <GlassPanel
            className={className}
            style={PANEL_STYLE}
            data-ds="mock-filters"
            role="search"
            aria-label={t('mock.filters.search')}
        >
            {difficultyVisible ? (
                <div style={GROUP_STYLE}>
                    <span style={GROUP_LABEL_STYLE}>
                        {t('mock.filters.difficulty')}
                    </span>
                    <ul
                        style={CHIPS_ROW_STYLE}
                        aria-label={t('mock.filters.difficulty')}
                        data-testid="mock-filters-difficulty"
                    >
                        {DIFFICULTY_VALUES.map((level) => {
                            const isActive = selectedDifficultiesSet.has(level)
                            const style: CSSProperties = {
                                ...CHIP_BASE_STYLE,
                                ...(isActive ? CHIP_ACTIVE_STYLE : null),
                                ...(difficultyChipsDisabled
                                    ? CHIP_DISABLED_STYLE
                                    : null),
                            }
                            return (
                                <li key={level}>
                                    <button
                                        type="button"
                                        data-ds="mock-filters-difficulty-chip"
                                        data-level={level}
                                        data-active={
                                            isActive ? 'true' : undefined
                                        }
                                        aria-pressed={isActive}
                                        disabled={difficultyChipsDisabled}
                                        onClick={() => toggleDifficulty(level)}
                                        style={style}
                                    >
                                        {t(difficultyLabelKey(level))}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ) : null}

            {categoriesVisible ? (
                <div style={GROUP_STYLE}>
                    <span style={GROUP_LABEL_STYLE}>
                        {t('mock.filters.category')}
                    </span>
                    {categoryList.length > 0 ? (
                        <ul
                            style={CHIPS_ROW_STYLE}
                            aria-label={t('mock.filters.category')}
                            data-testid="mock-filters-category"
                        >
                            {categoryList.map((cat) => {
                                const isActive = selectedCategoriesSet.has(cat)
                                const style: CSSProperties = {
                                    ...CHIP_BASE_STYLE,
                                    ...(isActive ? CHIP_ACTIVE_STYLE : null),
                                    ...(categoryChipsDisabled
                                        ? CHIP_DISABLED_STYLE
                                        : null),
                                }
                                return (
                                    <li key={cat}>
                                        <button
                                            type="button"
                                            data-ds="mock-filters-category-chip"
                                            data-category={cat}
                                            data-active={
                                                isActive ? 'true' : undefined
                                            }
                                            aria-pressed={isActive}
                                            disabled={categoryChipsDisabled}
                                            onClick={() => toggleCategory(cat)}
                                            style={style}
                                        >
                                            {cat}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : null}
                </div>
            ) : null}

            {ratingVisible ? (
                <div style={GROUP_STYLE}>
                    <span style={GROUP_LABEL_STYLE}>
                        {t('mock.filters.rating')}
                    </span>
                    <ul
                        style={CHIPS_ROW_STYLE}
                        aria-label={t('mock.filters.rating')}
                        data-testid="mock-filters-rating"
                    >
                        {RATING_VALUES.map((value) => {
                            const isActive = currentMinRating === value
                            const style: CSSProperties = {
                                ...CHIP_BASE_STYLE,
                                ...(isActive ? CHIP_ACTIVE_STYLE : null),
                                ...(ratingChipsDisabled
                                    ? CHIP_DISABLED_STYLE
                                    : null),
                            }
                            const label =
                                value === 0
                                    ? t('mock.filters.rating.any')
                                    : t('mock.filters.rating.min', { value })
                            return (
                                <li key={value}>
                                    <button
                                        type="button"
                                        data-ds="mock-filters-rating-chip"
                                        data-value={value}
                                        data-active={
                                            isActive ? 'true' : undefined
                                        }
                                        aria-pressed={isActive}
                                        disabled={ratingChipsDisabled}
                                        onClick={() => selectMinRating(value)}
                                        style={style}
                                    >
                                        {value > 0 ? (
                                            <Star
                                                size={12}
                                                strokeWidth={2}
                                                aria-hidden="true"
                                                style={{
                                                    color: isActive
                                                        ? 'var(--accent-600)'
                                                        : 'var(--warning-strong)',
                                                    fill: isActive
                                                        ? 'var(--accent-600)'
                                                        : 'var(--warning-strong)',
                                                }}
                                            />
                                        ) : null}
                                        {label}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ) : null}
        </GlassPanel>
    )
}

// ── Public component (wrapped in own ErrorBoundary) ─────────────────────

/**
 * Публичный компонент — inner-рендер обёрнут в собственный
 * `SectionErrorBoundary` с `renderEmptyOnError=true` (Req 17.3).
 *
 * Важно: при ошибке фильтров fallback — пустой fragment, то есть
 * sticky-панель полностью исчезает. Сиблинг `MockList` получает
 * всю ширину и остаётся полностью функциональным: карточки
 * рендерятся, клики/открытие `/mock/[id]`/рейтинг/комментарии
 * работают (Req 17.3).
 */
export function MockFilters(props: MockFiltersProps) {
    return (
        <SectionErrorBoundary
            renderEmptyOnError
            fallbackDataDs="mock-filters-error-boundary-fallback"
        >
            <MockFiltersInner {...props} />
        </SectionErrorBoundary>
    )
}

export default MockFilters
