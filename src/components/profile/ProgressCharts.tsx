'use client'

/**
 * `<ProgressCharts />` — SVG-графики прогресса для раздела `/profile`
 * (Requirements 18.3, 18.4, 10.8).
 *
 * Контракт (UI Redesign 2026, task 21.2):
 *
 *   - Корень — `GlassCard` (Req 3.4, 3.5, 22.1) с заголовком
 *     `t('profile.charts.title')`. Все строки через `t('profile.charts.*')`
 *     (Req 24.2). Хардкод-литералов цвета/размеров нет; используются
 *     токены Design_System (Req 1.8).
 *
 *   - Bar chart: вертикальные столбцы по `monthlyBars` — каждая запись
 *     `{ label, value }` отображается отдельным `<rect>` высотой,
 *     пропорциональной `value / max(values)`. Заливка — `var(--accent-600)`
 *     (прямо из постановки задачи). При hover/focus каждого столбца
 *     показывается `<Tooltip />` из `@/components/ui` с текстом
 *     `t('profile.charts.bars.tooltip', { month, value })`.
 *
 *   - Line chart (опционально): когда `cumulativeLine` задан и непуст,
 *     отрисовывается полилиния по точкам `{ x, y }` с маркерами в каждой
 *     точке. Каждый маркер — кнопка с собственным `<Tooltip />`,
 *     показывающим `t('profile.charts.line.tooltip', { date, value })`
 *     при hover/focus.
 *
 *   - Архитектура tooltip-ов: `<Tooltip>` оборачивает HTML-элемент
 *     (он рендерит wrapper-`<span>` и устанавливает aria/handler-ы
 *     через `cloneElement`), поэтому для каждой интерактивной точки
 *     создаётся прозрачная HTML-`<button>`, абсолютно позиционированная
 *     поверх SVG в той же координатной системе viewBox (через `%`).
 *     Сам SVG помечен `aria-hidden="true"` — в скринридер
 *     попадают только HTML-кнопки с `aria-label` (визуальный SVG —
 *     декоративная подложка, ровно одно семантическое представление
 *     каждой точки).
 *
 *   - Анимация появления (Req 10.8 / 18.4): bar и line — это `motion.*`
 *     узлы с `staggerChildren`. При `useReducedMotion()` длительность
 *     анимации и stagger принудительно сводятся к 0 через
 *     `reduced(duration.base, 0)` / `reduced(stagger.normal, 0)` —
 *     узлы остаются технически активными, визуальный конечный результат
 *     идентичен. По требованию 18.4 — без анимации появления.
 *
 *   - Пустое состояние (`monthlyBars.length === 0` и
 *     `cumulativeLine` отсутствует/пуст) → `<EmptyState />` с
 *     `t('profile.charts.empty.title')`/`t('profile.charts.empty.description')`.
 *
 *   - Разметка: чистый SVG, без сторонних chart-библиотек.
 *     SVG-контейнер растягивается по ширине родителя через
 *     `width: 100%; height: auto`, viewBox задаёт пропорции.
 */

import type { CSSProperties } from 'react'

import { motion, type Variants } from 'framer-motion'
import { LineChart } from 'lucide-react'

import { EmptyState, GlassCard, Tooltip } from '@/components/ui'
import { t } from '@/lib/i18n'
import { duration, easing, reduced, stagger } from '@/lib/motion'
import { useReducedMotion } from '@/lib/useReducedMotion'

// ── Public prop types ────────────────────────────────────────────────────

/** Один столбец bar-чарта: подпись (например, «Янв») и значение. */
export interface MonthlyBar {
    /** Локализованная подпись месяца, обычно сокращённая («Янв», «Фев»). */
    label: string
    /** Целое неотрицательное значение для высоты столбца. */
    value: number
}

/** Одна точка line-чарта. */
export interface CumulativePoint {
    /** Подпись точки по оси X (например, дата `2026-01-15`). */
    x: string
    /** Численное значение по оси Y. */
    y: number
}

export interface ProgressChartsData {
    /** Bar chart — последние 6 месяцев. */
    monthlyBars: readonly MonthlyBar[]
    /** Опциональный line chart — кумулятивный счёт во времени. */
    cumulativeLine?: readonly CumulativePoint[]
}

export interface ProgressChartsProps {
    /** Данные для bar и (опционального) line чарта. */
    data: ProgressChartsData
    /** Дополнительный CSS-класс на корневую `GlassCard`. */
    className?: string
}

// ── Layout constants ─────────────────────────────────────────────────────

// SVG viewBox-размеры. Это абстрактные единицы — масштабируются через
// viewBox, не px. Фиксированные числа здесь — параметры формы графика,
// а не визуальные токены Design_System.
const BAR_VB_WIDTH = 600
const BAR_VB_HEIGHT = 220
const BAR_PADDING_TOP = 16
const BAR_PADDING_BOTTOM = 32
const BAR_PADDING_X = 16
const BAR_GAP_RATIO = 0.3 // доля ширины «дорожки» под gap

const LINE_VB_WIDTH = 600
const LINE_VB_HEIGHT = 180
const LINE_PADDING_TOP = 16
const LINE_PADDING_BOTTOM = 28
const LINE_PADDING_X = 16
const LINE_POINT_RADIUS = 6

// ── Styles (tokens only; Req 1.8) ────────────────────────────────────────

const ROOT_STYLE: CSSProperties = {
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    minHeight: '100%',
}

const TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-lg)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.2,
    color: 'var(--border-900)',
    margin: 0,
}

const SECTION_TITLE_STYLE: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    lineHeight: 1.3,
    color: 'var(--border-700)',
    margin: 0,
}

const SECTION_STYLE: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
}

const CHART_WRAP_STYLE: CSSProperties = {
    position: 'relative',
    width: '100%',
}

const SVG_BASE_STYLE: CSSProperties = {
    width: '100%',
    height: 'auto',
    display: 'block',
    overflow: 'visible',
}

const HIT_LAYER_STYLE: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none', // дочерние кнопки сами включают pointer-events
}

const HIT_BUTTON_BASE_STYLE: CSSProperties = {
    position: 'absolute',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    pointerEvents: 'auto',
    color: 'inherit',
    font: 'inherit',
    outline: 'none',
}

const SR_ONLY_STYLE: CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
}

const BAR_AXIS_LABEL_STYLE: CSSProperties = {
    fontSize: 'var(--fs-xs)',
    fill: 'var(--border-600)',
    fontFamily: 'var(--font-sans)',
}

// ── Variants ─────────────────────────────────────────────────────────────

/**
 * Container variants. `staggerChildren` форсируется в 0 при
 * reduced-motion (Req 10.8 / 18.4 «без анимации появления»).
 */
function buildContainerVariants(staggerDelay: number): Variants {
    return {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: staggerDelay,
            },
        },
    }
}

/**
 * Bar item variants. При reduced-motion `duration === 0` —
 * узел сразу в финальном состоянии без промежуточных кадров.
 * `transformOrigin: bottom` обеспечивает «выезд» столбца снизу.
 */
function buildBarVariants(animatedDuration: number): Variants {
    return {
        hidden: { opacity: 0, scaleY: 0 },
        visible: {
            opacity: 1,
            scaleY: 1,
            transition: {
                duration: animatedDuration,
                ease: easing.standard,
            },
        },
    }
}

/** Point (line marker) variants: scale-in. */
function buildPointVariants(animatedDuration: number): Variants {
    return {
        hidden: { opacity: 0, scale: 0 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: animatedDuration,
                ease: easing.standard,
            },
        },
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function safeMax(values: ReadonlyArray<number>): number {
    let max = 0
    for (const v of values) {
        if (Number.isFinite(v) && v > max) max = v
    }
    return max
}

function clampNonNegative(v: number): number {
    return Number.isFinite(v) && v > 0 ? v : 0
}

/** Конвертирует viewBox-координаты в проценты для абсолютного позиционирования. */
function pct(value: number, total: number): string {
    return `${(value / total) * 100}%`
}

// ── Component ────────────────────────────────────────────────────────────

export function ProgressCharts({ data, className }: ProgressChartsProps) {
    const prefersReducedMotion = useReducedMotion()

    const animatedDuration = reduced(duration.base, 0)
    const staggerDelay = reduced(stagger.normal, 0)

    const containerVariants = buildContainerVariants(staggerDelay)
    const barVariants = buildBarVariants(animatedDuration)
    const pointVariants = buildPointVariants(animatedDuration)

    const bars = data.monthlyBars
    const line = data.cumulativeLine

    const hasBars = bars.length > 0
    const hasLine = !!line && line.length > 0
    const isEmpty = !hasBars && !hasLine

    return (
        <GlassCard
            className={className}
            style={ROOT_STYLE}
            data-profile-section="charts"
            data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
        >
            <h2 style={TITLE_STYLE}>{t('profile.charts.title')}</h2>

            {isEmpty ? (
                <EmptyState
                    icon={<LineChart size={32} aria-hidden="true" />}
                    title={t('profile.charts.empty.title')}
                    description={t('profile.charts.empty.description')}
                />
            ) : (
                <>
                    {hasBars ? (
                        <BarChart
                            bars={bars}
                            containerVariants={containerVariants}
                            barVariants={barVariants}
                        />
                    ) : null}

                    {hasLine ? (
                        <LineChartView
                            points={line!}
                            containerVariants={containerVariants}
                            pointVariants={pointVariants}
                        />
                    ) : null}
                </>
            )}
        </GlassCard>
    )
}

export default ProgressCharts

// ── Subcomponent: BarChart ───────────────────────────────────────────────

interface BarChartProps {
    bars: readonly MonthlyBar[]
    containerVariants: Variants
    barVariants: Variants
}

function BarChart({ bars, containerVariants, barVariants }: BarChartProps) {
    const max = safeMax(bars.map((b) => b.value))
    // Полная доступная ширина под бары (без боковых отступов).
    const usableWidth = BAR_VB_WIDTH - BAR_PADDING_X * 2
    // Ширина «дорожки» под один бар (бар + правый зазор), затем сам бар.
    const trackWidth = usableWidth / bars.length
    const barWidth = trackWidth * (1 - BAR_GAP_RATIO)
    const usableHeight = BAR_VB_HEIGHT - BAR_PADDING_TOP - BAR_PADDING_BOTTOM
    const baselineY = BAR_VB_HEIGHT - BAR_PADDING_BOTTOM

    return (
        <section style={SECTION_STYLE} data-progress-chart="bars">
            <h3 style={SECTION_TITLE_STYLE}>
                {t('profile.charts.bars.title')}
            </h3>

            <div
                style={CHART_WRAP_STYLE}
                data-testid="progress-bars-wrap"
            >
                <motion.svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox={`0 0 ${BAR_VB_WIDTH} ${BAR_VB_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={SVG_BASE_STYLE}
                    data-testid="progress-bars-svg"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Базовая ось */}
                    <line
                        x1={BAR_PADDING_X}
                        x2={BAR_VB_WIDTH - BAR_PADDING_X}
                        y1={baselineY}
                        y2={baselineY}
                        stroke="var(--border-300)"
                        strokeWidth={1}
                    />

                    {bars.map((bar, index) => {
                        const value = clampNonNegative(bar.value)
                        const heightRatio = max > 0 ? value / max : 0
                        const barHeight = heightRatio * usableHeight
                        const x =
                            BAR_PADDING_X +
                            index * trackWidth +
                            (trackWidth - barWidth) / 2
                        const y = baselineY - barHeight

                        return (
                            <motion.g
                                key={`bar-${index}`}
                                variants={barVariants}
                                style={{
                                    transformBox: 'fill-box',
                                    transformOrigin: 'bottom',
                                }}
                            >
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    rx={4}
                                    fill="var(--accent-600)"
                                />
                                {/* Подпись месяца */}
                                <text
                                    x={x + barWidth / 2}
                                    y={baselineY + 18}
                                    textAnchor="middle"
                                    style={BAR_AXIS_LABEL_STYLE}
                                >
                                    {bar.label}
                                </text>
                            </motion.g>
                        )
                    })}
                </motion.svg>

                {/* HTML-overlay с интерактивными hit-областями.
                    Скринридер видит только эти кнопки (SVG помечен
                    aria-hidden), один tooltip на бар. */}
                <div
                    style={HIT_LAYER_STYLE}
                    data-testid="progress-bars-hits"
                >
                    {bars.map((bar, index) => {
                        const value = clampNonNegative(bar.value)
                        const tooltipText = t('profile.charts.bars.tooltip', {
                            month: bar.label,
                            value,
                        })
                        const ariaText = t('profile.charts.bars.barAria', {
                            month: bar.label,
                            value,
                        })

                        const trackLeft = BAR_PADDING_X + index * trackWidth

                        const buttonStyle: CSSProperties = {
                            ...HIT_BUTTON_BASE_STYLE,
                            left: pct(trackLeft, BAR_VB_WIDTH),
                            top: 0,
                            width: pct(trackWidth, BAR_VB_WIDTH),
                            height: '100%',
                        }

                        return (
                            <Tooltip
                                key={`bar-tooltip-${index}`}
                                content={tooltipText}
                                placement="top"
                            >
                                <button
                                    type="button"
                                    aria-label={ariaText}
                                    data-testid={`bar-${index}`}
                                    data-bar-label={bar.label}
                                    data-bar-value={value}
                                    style={buttonStyle}
                                >
                                    <span style={SR_ONLY_STYLE}>
                                        {ariaText}
                                    </span>
                                </button>
                            </Tooltip>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

// ── Subcomponent: LineChartView ──────────────────────────────────────────

interface LineChartViewProps {
    points: readonly CumulativePoint[]
    containerVariants: Variants
    pointVariants: Variants
}

function LineChartView({
    points,
    containerVariants,
    pointVariants,
}: LineChartViewProps) {
    const ys = points.map((p) => p.y)
    const max = safeMax(ys)
    const usableWidth = LINE_VB_WIDTH - LINE_PADDING_X * 2
    const usableHeight = LINE_VB_HEIGHT - LINE_PADDING_TOP - LINE_PADDING_BOTTOM
    const baselineY = LINE_VB_HEIGHT - LINE_PADDING_BOTTOM

    const xFor = (i: number) =>
        points.length === 1
            ? LINE_PADDING_X + usableWidth / 2
            : LINE_PADDING_X + (i / (points.length - 1)) * usableWidth

    const yFor = (v: number) => {
        const value = clampNonNegative(v)
        const ratio = max > 0 ? value / max : 0
        return baselineY - ratio * usableHeight
    }

    const polylinePoints = points
        .map((p, i) => `${xFor(i)},${yFor(p.y)}`)
        .join(' ')

    return (
        <section style={SECTION_STYLE} data-progress-chart="line">
            <h3 style={SECTION_TITLE_STYLE}>
                {t('profile.charts.line.title')}
            </h3>

            <div
                style={CHART_WRAP_STYLE}
                data-testid="progress-line-wrap"
            >
                <motion.svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox={`0 0 ${LINE_VB_WIDTH} ${LINE_VB_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={SVG_BASE_STYLE}
                    data-testid="progress-line-svg"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Базовая ось */}
                    <line
                        x1={LINE_PADDING_X}
                        x2={LINE_VB_WIDTH - LINE_PADDING_X}
                        y1={baselineY}
                        y2={baselineY}
                        stroke="var(--border-300)"
                        strokeWidth={1}
                    />

                    {/* Линия */}
                    <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="var(--accent-600)"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {/* Маркеры точек (визуальные) */}
                    {points.map((p, index) => {
                        const cx = xFor(index)
                        const cy = yFor(p.y)
                        return (
                            <motion.g
                                key={`point-${index}`}
                                variants={pointVariants}
                                style={{
                                    transformBox: 'fill-box',
                                    transformOrigin: 'center',
                                }}
                            >
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={LINE_POINT_RADIUS}
                                    fill="var(--accent-600)"
                                    stroke="var(--surface-200)"
                                    strokeWidth={2}
                                />
                            </motion.g>
                        )
                    })}
                </motion.svg>

                {/* HTML-overlay с интерактивными hit-областями для tooltip. */}
                <div
                    style={HIT_LAYER_STYLE}
                    data-testid="progress-line-hits"
                >
                    {points.map((p, index) => {
                        const cx = xFor(index)
                        const cy = yFor(p.y)
                        const value = clampNonNegative(p.y)

                        const tooltipText = t('profile.charts.line.tooltip', {
                            date: p.x,
                            value,
                        })
                        const ariaText = t('profile.charts.line.pointAria', {
                            date: p.x,
                            value,
                        })

                        // Hit-area = квадрат 4× радиуса вокруг точки.
                        const hitSize = LINE_POINT_RADIUS * 4
                        const buttonStyle: CSSProperties = {
                            ...HIT_BUTTON_BASE_STYLE,
                            left: `calc(${pct(cx, LINE_VB_WIDTH)} - ${hitSize / 2}px)`,
                            top: `calc(${pct(cy, LINE_VB_HEIGHT)} - ${hitSize / 2}px)`,
                            width: `${hitSize}px`,
                            height: `${hitSize}px`,
                            borderRadius: 'var(--radius-full)',
                        }

                        return (
                            <Tooltip
                                key={`point-tooltip-${index}`}
                                content={tooltipText}
                                placement="top"
                            >
                                <button
                                    type="button"
                                    aria-label={ariaText}
                                    data-testid={`line-point-${index}`}
                                    data-point-x={p.x}
                                    data-point-y={value}
                                    style={buttonStyle}
                                >
                                    <span style={SR_ONLY_STYLE}>
                                        {ariaText}
                                    </span>
                                </button>
                            </Tooltip>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
