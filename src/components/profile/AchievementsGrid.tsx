'use client'

/**
 * `<AchievementsGrid />` — сетка значков-достижений для раздела `/profile`
 * (Requirements 18.1, 18.2).
 *
 * Контракт (UI Redesign 2026, task 21.3):
 *
 *   - Props: `{ achievements: { id, name, icon, unlocked }[] }`.
 *     `icon` — произвольный `ReactNode` (типично — компонент из
 *     `lucide-react` с заранее настроенным `size`), `name` —
 *     уже локализованная строка (локализацию делает потребитель).
 *
 *   - Корень — `GlassCard` (Req 3.4, 3.5, 22.1) с заголовком раздела
 *     `t('profile.achievements.title')`. Всё визуальное поведение
 *     glass-поверхности наследуется от класса `.glass` в
 *     `globals.css`; модуль использует только токены Design_System
 *     (Req 1.8), хардкод-значений цвета / spacing / radius нет.
 *
 *   - Пустой список `achievements` → `<EmptyState />` с заголовком
 *     `t('profile.achievements.empty.title')` и описанием (Req 20.2).
 *     Эквивалентный контракт empty-состояния уже закреплён за
 *     `<EmptyState />` — нам не нужно самим писать `role="status"`.
 *
 *   - Компоновка — CSS Grid с `grid-template-columns:
 *     repeat(auto-fill, minmax(120px, 1fr))`. Каждая плитка —
 *     квадратная область: круглый icon-wrapper 72×72 (`--space-18`)
 *     над текстовой подписью. Ширина плитки минимум 120px
 *     (прямо из постановки задачи). 120px — единственное числовое
 *     значение в inline-style-ях и оно идёт от спецификации задачи.
 *     Все остальные размеры — токены (`--space-*`, `--fs-*`).
 *
 *   - Locked-достижения — grayscale через CSS-фильтр
 *     `filter: grayscale(1)` + сниженная `opacity`. Это применяется
 *     к icon-wrapper-у (саму подпись оставляем читаемой — иначе
 *     текст был бы менее контрастным, что увеличило бы риски по
 *     WCAG 11.1). Плитка получает `<Badge variant="neutral">` с
 *     текстом `t('profile.achievements.locked')`; для unlocked —
 *     `variant="success"` и текст `t('profile.achievements.unlocked')`.
 *
 *   - Доступность: у каждой плитки проставлен `role="listitem"`,
 *     внешний контейнер сетки — `role="list"` с `aria-label`.
 *     Icon-wrapper помечен `aria-hidden="true"` — в скринридер
 *     попадают только текстовые подписи и badge-статус.
 *
 *   - Все строки через `t('profile.*')` (Req 24.2). Входные `name`
 *     уже локализованы потребителем.
 */

import type { CSSProperties, ReactNode } from 'react'

import { Award } from 'lucide-react'

import { Badge, EmptyState, GlassCard } from '@/components/ui'
import { t } from '@/lib/i18n'

// ── Public prop types ────────────────────────────────────────────────────

/**
 * Один элемент списка достижений. Форма соответствует постановке
 * задачи 21.3: `{ id, name, icon, unlocked }`.
 */
export interface Achievement {
    /** Стабильный идентификатор (ключ React) — обычно slug или UUID. */
    id: string
    /** Локализованное имя достижения, отображается под иконкой. */
    name: string
    /** Иконка (ReactNode), обычно из `lucide-react` с заданным `size`. */
    icon: ReactNode
    /** Открыто ли достижение — влияет на визуальное состояние плитки. */
    unlocked: boolean
}

export interface AchievementsGridProps {
    /** Список достижений. Может быть пустым — тогда `<EmptyState />`. */
    achievements: readonly Achievement[]
    /** Дополнительный CSS-класс на корневую `GlassCard`. */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const ROOT_STYLE: CSSProperties = {
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    minHeight: '100%',
}

const TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.2,
    color: 'var(--border-900)',
    margin: 0,
}

const GRID_STYLE: CSSProperties = {
    display: 'grid',
    // 120px — минимальная ширина ячейки, прямо из постановки задачи 21.3.
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 'var(--space-4)',
    listStyle: 'none',
    margin: 0,
    padding: 0,
}

const ITEM_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-lg)',
    border:
        '1px solid color-mix(in oklch, var(--border-500) 10%, transparent)',
    background: 'var(--surface-200)',
}

const ICON_WRAPPER_BASE_STYLE: CSSProperties = {
    // 72×72 = --space-18 (шаг 4px, N * 4)
    width: 'var(--space-18)',
    height: 'var(--space-18)',
    borderRadius: 'var(--radius-full)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-700)',
    background: 'var(--accent-100)',
    border:
        '1px solid color-mix(in oklch, var(--accent-600) 20%, transparent)',
    transition: 'filter var(--dur-base) var(--ease-standard)',
}

const ICON_WRAPPER_LOCKED_STYLE: CSSProperties = {
    // Грейскейл через CSS-фильтр — по прямому требованию задачи 21.3.
    // Сниженная opacity усиливает визуальный сигнал, не затрагивая
    // текстовую подпись (она остаётся с полным контрастом — WCAG 11.1).
    filter: 'grayscale(1)',
    opacity: 0.55,
    color: 'var(--border-600)',
    background: 'var(--surface-300)',
    borderColor:
        'color-mix(in oklch, var(--border-500) 10%, transparent)',
}

const NAME_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-800)',
    lineHeight: 1.3,
    margin: 0,
    // Ограничение длины имени в 2 строки (webkit clamp — прогрессивное
    // улучшение, fallback — overflow: hidden без обрезки, что тоже
    // приемлемо).
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
}

// ── Component ───────────────────────────────────────────────────────────

export function AchievementsGrid({
    achievements,
    className,
}: AchievementsGridProps) {
    const titleText = t('profile.achievements.title')

    return (
        <GlassCard
            className={className}
            style={ROOT_STYLE}
            data-profile-section="achievements"
        >
            <h2 style={TITLE_STYLE}>{titleText}</h2>

            {achievements.length === 0 ? (
                <EmptyState
                    icon={<Award size={32} aria-hidden="true" />}
                    title={t('profile.achievements.empty.title')}
                    description={t('profile.achievements.empty.description')}
                />
            ) : (
                <ul
                    style={GRID_STYLE}
                    role="list"
                    aria-label={titleText}
                    data-testid="achievements-grid"
                >
                    {achievements.map((achievement) => {
                        const iconStyle: CSSProperties = achievement.unlocked
                            ? ICON_WRAPPER_BASE_STYLE
                            : {
                                  ...ICON_WRAPPER_BASE_STYLE,
                                  ...ICON_WRAPPER_LOCKED_STYLE,
                              }

                        const badgeLabel = achievement.unlocked
                            ? t('profile.achievements.unlocked')
                            : t('profile.achievements.locked')

                        return (
                            <li
                                key={achievement.id}
                                style={ITEM_STYLE}
                                role="listitem"
                                data-achievement-id={achievement.id}
                                data-achievement-unlocked={
                                    achievement.unlocked ? 'true' : 'false'
                                }
                                data-testid={`achievement-item-${achievement.id}`}
                            >
                                <span
                                    style={iconStyle}
                                    aria-hidden="true"
                                    data-testid={`achievement-icon-${achievement.id}`}
                                >
                                    {achievement.icon}
                                </span>
                                <span
                                    style={NAME_STYLE}
                                    data-testid={`achievement-name-${achievement.id}`}
                                >
                                    {achievement.name}
                                </span>
                                <Badge
                                    variant={
                                        achievement.unlocked
                                            ? 'success'
                                            : 'neutral'
                                    }
                                    data-testid={`achievement-badge-${achievement.id}`}
                                >
                                    {badgeLabel}
                                </Badge>
                            </li>
                        )
                    })}
                </ul>
            )}
        </GlassCard>
    )
}

export default AchievementsGrid
