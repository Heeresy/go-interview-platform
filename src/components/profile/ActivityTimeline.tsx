'use client'

/**
 * `<ActivityTimeline />` — вертикальный таймлайн недавних действий
 * пользователя в разделе `/profile` (Requirements 18.1, 18.2).
 *
 * Контракт (UI Redesign 2026, task 21.3):
 *
 *   - Props: `{ items: { id, at, kind, description }[] }`.
 *     `at` — ISO-строка или любая предварительно отформатированная
 *     отметка времени (рендерится «как есть», без интерпретации —
 *     форматирование даёт потребитель). `kind` — произвольный
 *     короткий ярлык, рендерится как `<Badge variant="neutral">`.
 *     `description` — человеко-понятный текст события, уже
 *     локализованный.
 *
 *   - Корень — `GlassCard` (Req 3.4, 3.5, 22.1) с заголовком
 *     `t('profile.activity.title')`. Все стили живут на токенах
 *     Design_System (Req 1.8); хардкод-значений цвета / spacing /
 *     radius нет.
 *
 *   - Пустой список `items` → `<EmptyState />` с заголовком
 *     `t('profile.activity.empty.title')` и описанием (Req 20.2).
 *     Компонент `<EmptyState />` сам проставляет
 *     `role="status" aria-live="polite"`.
 *
 *   - Визуальная раскладка — семантический `<ol>` со вставленной
 *     вертикальной линией (через `::before` нельзя в inline-style,
 *     поэтому линия строится как абсолютно позиционированный
 *     `<span aria-hidden>` в каждом `<li>` и визуально сливается
 *     с соседним пунктом, включая «обрезание» линии у последнего
 *     элемента — там правило применяется точечно). Маркер события —
 *     круглая точка-индикатор 12px, выровненная относительно
 *     timestamp.
 *
 *   - Доступность: каждый пункт таймлайна — `<li>` с логическим
 *     порядком timestamp → kind-badge → description. Декоративные
 *     элементы (точка-индикатор, соединительная линия) помечены
 *     `aria-hidden="true"`.
 *
 *   - Все строки таймлайна уже локализованы потребителем; строки
 *     заголовка и empty-состояния — через `t('profile.*')`
 *     (Req 24.2).
 */

import type { CSSProperties, ReactNode } from 'react'

import { Clock } from 'lucide-react'

import { Badge, EmptyState, GlassCard } from '@/components/ui'
import { t } from '@/lib/i18n'

// ── Public prop types ────────────────────────────────────────────────────

/**
 * Один пункт таймлайна. Форма соответствует постановке задачи 21.3:
 * `{ id, at, kind, description }`.
 */
export interface ActivityTimelineItem {
    /** Стабильный идентификатор события (ключ React). */
    id: string
    /**
     * Уже отформатированная отметка времени — строка. Компонент
     * не интерпретирует её (не вызывает `new Date(...)`), чтобы не
     * плодить гидрационные рассинхроны между сервером и клиентом:
     * форматирование остаётся за потребителем, которому доступна
     * актуальная локаль / таймзона.
     */
    at: string
    /** Короткий ярлык типа события (например, «решено», «создан»). */
    kind: string
    /** Человеко-понятное описание события, уже локализованное. */
    description: string
}

export interface ActivityTimelineProps {
    /** Пункты таймлайна в хронологическом порядке (сверху — свежие). */
    items: readonly ActivityTimelineItem[]
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

const LIST_STYLE: CSSProperties = {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
}

/**
 * Базовый стиль пункта таймлайна. `position: relative` нужен для
 * позиционирования декоративной соединительной линии внутри.
 * Левый отступ (`paddingLeft`) оставляет место под точку-индикатор
 * и вертикальную линию.
 */
const ITEM_STYLE: CSSProperties = {
    position: 'relative',
    paddingLeft: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    minHeight: 'var(--space-6)',
}

/**
 * Точка-индикатор (круг 12px). Левый край выровнен по левому краю
 * `<li>`; `top: var(--space-1)` опускает круг примерно к базовой
 * линии timestamp.
 */
const DOT_STYLE: CSSProperties = {
    position: 'absolute',
    left: 0,
    // Центр круга попадает в линию над timestamp-строкой.
    top: 'var(--space-2)',
    width: 'var(--space-3)',
    height: 'var(--space-3)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--accent-600)',
    boxShadow:
        '0 0 0 3px color-mix(in oklch, var(--accent-600) 20%, transparent)',
}

/**
 * Соединительная вертикальная линия. Начинается под точкой и тянется
 * до низа `<li>`. У последнего элемента линия не отображается
 * (см. `data-timeline-last` + логика ниже).
 */
const LINE_STYLE: CSSProperties = {
    position: 'absolute',
    // Центр точки (--space-3 / 2 = 6px) отсчитывается от левого края `<li>`.
    // Линия должна выйти из центра точки: `left = width/2` = 6px.
    left: '5px',
    top: 'var(--space-5)',
    bottom: `calc(var(--space-4) * -1)`,
    width: '1px',
    background:
        'color-mix(in oklch, var(--border-500) 25%, transparent)',
}

const HEADER_ROW_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
}

const TIMESTAMP_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-600)',
    lineHeight: 1.3,
    fontVariantNumeric: 'tabular-nums',
}

const DESCRIPTION_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    color: 'var(--border-800)',
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
}

// ── Component ───────────────────────────────────────────────────────────

export function ActivityTimeline({
    items,
    className,
}: ActivityTimelineProps): ReactNode {
    const titleText = t('profile.activity.title')

    return (
        <GlassCard
            className={className}
            style={ROOT_STYLE}
            data-profile-section="activity"
        >
            <h2 style={TITLE_STYLE}>{titleText}</h2>

            {items.length === 0 ? (
                <EmptyState
                    icon={<Clock size={32} aria-hidden="true" />}
                    title={t('profile.activity.empty.title')}
                    description={t('profile.activity.empty.description')}
                />
            ) : (
                <ol
                    style={LIST_STYLE}
                    aria-label={titleText}
                    data-testid="activity-timeline"
                >
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1
                        return (
                            <li
                                key={item.id}
                                style={ITEM_STYLE}
                                data-activity-id={item.id}
                                data-timeline-last={
                                    isLast ? 'true' : 'false'
                                }
                                data-testid={`activity-item-${item.id}`}
                            >
                                <span
                                    style={DOT_STYLE}
                                    aria-hidden="true"
                                    data-testid={`activity-dot-${item.id}`}
                                />
                                {isLast ? null : (
                                    <span
                                        style={LINE_STYLE}
                                        aria-hidden="true"
                                        data-testid={`activity-line-${item.id}`}
                                    />
                                )}

                                <div style={HEADER_ROW_STYLE}>
                                    <time
                                        style={TIMESTAMP_STYLE}
                                        dateTime={item.at}
                                        data-testid={`activity-time-${item.id}`}
                                    >
                                        {item.at}
                                    </time>
                                    <Badge
                                        variant="neutral"
                                        data-testid={`activity-kind-${item.id}`}
                                    >
                                        {item.kind}
                                    </Badge>
                                </div>

                                <p
                                    style={DESCRIPTION_STYLE}
                                    data-testid={`activity-description-${item.id}`}
                                >
                                    {item.description}
                                </p>
                            </li>
                        )
                    })}
                </ol>
            )}
        </GlassCard>
    )
}

export default ActivityTimeline
