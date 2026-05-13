'use client'

/**
 * `<QuestionFilters />` — sticky-панель фильтров и поиска для
 * `Questions_Module` (task 17.1; Requirements 14.1, 14.4, 22.1, 24.2).
 *
 * Контракт:
 *
 *   Props:
 *     {
 *       search: string;
 *       onSearchChange: (v: string) => void;
 *       selectedTags?: string[];
 *       onTagsChange?: (v: string[]) => void;
 *       availableTags?: string[];   // опц.: источник чипов-тегов
 *     }
 *
 *   Поведение:
 *
 *   - Корень — `GlassPanel` с `position: sticky; top: var(--space-4)`;
 *     glass-поверхность берётся из класса `.glass` (Req 14.4 «sticky-панель
 *     фильтров и поиска на Glass_Surface»).
 *
 *   - Поиск — DS `<Input />`-примитив (контролируемый): текст
 *     проксируется через `onSearchChange`. Plate-holder и aria-label
 *     берутся из `t()` (Req 24.2).
 *
 *   - Теги — набор `<Badge as="button">`-чипов. Когда `onTagsChange`
 *     передан, клик по чипу добавляет/убирает тег из `selectedTags`.
 *     Если `onTagsChange` не передан, чипы рендерятся в read-only
 *     режиме (кнопки `disabled`) — это допустимо: фильтрация тегами
 *     опциональна по контракту.
 *
 *   - Если `availableTags` не переданы и `selectedTags` пуст — блок
 *     чипов не рендерится (вырожденный случай: source-of-truth тегов
 *     отсутствует на странице). Это сохраняет visual rhythm
 *     панели — только поле поиска.
 *
 *   - Вся визуальная раскладка — только на токенах Design_System
 *     (`--space-*`, `--radius-*`, `--fs-*`, `--fw-*`, `--surface-*`,
 *     `--accent-*`, `--border-*`, `--z-sticky`); хардкод-цветов, px,
 *     radius-литералов нет (Req 1.8).
 *
 * Важно: компонент только собирает UI-контроллы; бизнес-логика
 * фильтрации выполняется потребителем (`QuestionsList`/страница).
 * Никаких fallback-layout'ов при пустом/ошибочном состоянии: панель
 * остаётся карточной / sticky — прямой контракт задачи 14.4
 * (fallback-layout вроде таблицы/списка запрещён).
 */

import type { CSSProperties } from 'react'
import { useCallback, useMemo } from 'react'

import { GlassPanel, Input } from '@/components/ui'
import { t } from '@/lib/i18n'

export interface QuestionFiltersProps {
    /** Текущее значение поля поиска (контролируемо). */
    search: string
    /** Обработчик смены значения поиска. */
    onSearchChange: (v: string) => void
    /**
     * Выбранные теги (контролируемо). Когда `onTagsChange` передан,
     * чипы тогглятся против этого массива.
     */
    selectedTags?: string[]
    /**
     * Коллбек смены выбранных тегов. Если не передан, чипы
     * read-only (disabled) — фильтрация по тегам недоступна.
     */
    onTagsChange?: (v: string[]) => void
    /**
     * Источник чипов. Если не передан — используется
     * `selectedTags` (если тот не пуст), иначе чипы не рендерятся.
     */
    availableTags?: string[]
    /** Дополнительный className на корневую glass-панель. */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const PANEL_STYLE: CSSProperties = {
    // Sticky-поведение панели (Req 14.4). top — токен DS.
    position: 'sticky',
    top: 'var(--space-4)',
    // z-index на уровне sticky-ленты — под модалками/toast.
    zIndex: 'var(--z-sticky)' as unknown as number,
    // Внутренняя раскладка.
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    padding: 'var(--space-5)',
    // Glass-поверхность приходит через `.glass` класс в GlassPanel.
    // borderRadius оставляем дефолт (если задан — Glass/CSS сами решат).
    borderRadius: 'var(--radius-lg)',
}

const TAGS_ROW_STYLE: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--space-2)',
    margin: 0,
    padding: 0,
    listStyle: 'none',
}

const TAGS_LABEL_STYLE: CSSProperties = {
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
    // Reset нативных button-стилей для консистентности.
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

export function QuestionFilters({
    search,
    onSearchChange,
    selectedTags,
    onTagsChange,
    availableTags,
    className,
}: QuestionFiltersProps) {
    // Источник чипов: availableTags, иначе selectedTags (если непустой),
    // иначе ничего (блок чипов не рендерится).
    const tags = useMemo<string[]>(() => {
        if (availableTags && availableTags.length > 0) return availableTags
        if (selectedTags && selectedTags.length > 0) return selectedTags
        return []
    }, [availableTags, selectedTags])

    const selectedSet = useMemo(
        () => new Set(selectedTags ?? []),
        [selectedTags],
    )

    const toggleTag = useCallback(
        (tag: string) => {
            if (!onTagsChange) return
            const next = selectedSet.has(tag)
                ? (selectedTags ?? []).filter((s) => s !== tag)
                : [...(selectedTags ?? []), tag]
            onTagsChange(next)
        },
        [onTagsChange, selectedSet, selectedTags],
    )

    const handleSearchInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onSearchChange(e.target.value)
        },
        [onSearchChange],
    )

    const chipsDisabled = !onTagsChange

    return (
        <GlassPanel
            className={className}
            style={PANEL_STYLE}
            data-ds="question-filters"
            role="search"
            aria-label={t('questions.filters.search')}
        >
            <Input
                type="search"
                value={search}
                onChange={handleSearchInput}
                placeholder={t('questions.filters.search')}
                aria-label={t('questions.filters.search')}
                autoComplete="off"
                spellCheck={false}
                data-testid="question-filters-search"
            />

            {tags.length > 0 ? (
                <ul
                    style={TAGS_ROW_STYLE}
                    aria-label={t('questions.filters.search')}
                    data-testid="question-filters-tags"
                >
                    <li aria-hidden="true" style={TAGS_LABEL_STYLE}>
                        #
                    </li>
                    {tags.map((tag) => {
                        const isActive = selectedSet.has(tag)
                        const style: CSSProperties = {
                            ...CHIP_BASE_STYLE,
                            ...(isActive ? CHIP_ACTIVE_STYLE : null),
                            ...(chipsDisabled ? CHIP_DISABLED_STYLE : null),
                        }
                        return (
                            <li key={tag}>
                                <button
                                    type="button"
                                    data-ds="question-filters-chip"
                                    data-active={isActive ? 'true' : undefined}
                                    aria-pressed={isActive}
                                    disabled={chipsDisabled}
                                    onClick={() => toggleTag(tag)}
                                    style={style}
                                >
                                    {tag}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            ) : null}
        </GlassPanel>
    )
}

export default QuestionFilters
