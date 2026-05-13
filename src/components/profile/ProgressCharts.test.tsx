import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import {
    ProgressCharts,
    type ProgressChartsData,
} from './ProgressCharts'
import { t } from '@/lib/i18n'

/**
 * `<ProgressCharts />` — unit tests (task 21.2).
 *
 * Validates the behavioural contract documented in Requirements
 * 18.3 / 18.4 / 10.8 / 22.1 / 1.8 / 24.2:
 *
 *   - Корень — `GlassCard` с заголовком `t('profile.charts.title')`.
 *   - Пустые данные → `<EmptyState />` с локализованными строками.
 *   - Bar chart рендерит ровно `monthlyBars.length` SVG-баров и столько
 *     же hit-кнопок-tooltip-триггеров. Заливка бара — `var(--accent-600)`.
 *   - Подписи месяцев вычисляются из `bar.label`.
 *   - Line chart рендерится только при наличии непустого `cumulativeLine`.
 *   - Кнопки-tooltip-триггеры имеют локализованный `aria-label` с
 *     month/value (или date/value).
 *   - При `prefers-reduced-motion: reduce` корень помечается
 *     `data-reduced-motion="true"` (Req 18.4).
 */

afterEach(() => cleanup())

// ── matchMedia mock helper ───────────────────────────────────────────────

interface MqListLike {
    matches: boolean
    media: string
    onchange: ((e: MediaQueryListEvent) => void) | null
    addEventListener: (
        type: 'change',
        listener: (e: MediaQueryListEvent) => void,
    ) => void
    removeEventListener: (
        type: 'change',
        listener: (e: MediaQueryListEvent) => void,
    ) => void
    addListener: (l: (e: MediaQueryListEvent) => void) => void
    removeListener: (l: (e: MediaQueryListEvent) => void) => void
    dispatchEvent: (e: Event) => boolean
}

function installMatchMedia(reduced: boolean): void {
    const mq: MqListLike = {
        matches: reduced,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn().mockReturnValue(mq),
    })
}

beforeEach(() => {
    installMatchMedia(false)
})

// ── Sample data ──────────────────────────────────────────────────────────

const sampleBars = [
    { label: 'Янв', value: 5 },
    { label: 'Фев', value: 12 },
    { label: 'Мар', value: 8 },
    { label: 'Апр', value: 20 },
    { label: 'Май', value: 14 },
    { label: 'Июн', value: 18 },
] as const

const sampleLine = [
    { x: '2026-01-15', y: 10 },
    { x: '2026-02-15', y: 25 },
    { x: '2026-03-15', y: 40 },
] as const

const sampleData: ProgressChartsData = {
    monthlyBars: sampleBars,
    cumulativeLine: sampleLine,
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('<ProgressCharts />', () => {
    it('renders the localized section title and glass root', () => {
        const { container, getByText } = render(
            <ProgressCharts data={sampleData} />,
        )
        expect(getByText(t('profile.charts.title'))).toBeTruthy()
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.getAttribute('data-profile-section')).toBe('charts')
    })

    it('renders EmptyState when both monthlyBars and cumulativeLine are empty', () => {
        const { queryByTestId, getByRole, getByText } = render(
            <ProgressCharts data={{ monthlyBars: [] }} />,
        )
        expect(queryByTestId('progress-bars-svg')).toBeNull()
        expect(queryByTestId('progress-line-svg')).toBeNull()
        expect(getByRole('status')).toBeTruthy()
        expect(getByText(t('profile.charts.empty.title'))).toBeTruthy()
    })

    it('renders one bar and one tooltip-trigger button per monthlyBars entry', () => {
        const { getByTestId, container } = render(
            <ProgressCharts data={{ monthlyBars: sampleBars }} />,
        )
        // SVG-контейнер баров присутствует.
        const svg = getByTestId('progress-bars-svg')
        expect(svg).toBeTruthy()

        // Линия чарта НЕ должна рендериться при отсутствии cumulativeLine.
        expect(container.querySelector('[data-progress-chart="line"]')).toBeNull()

        // Каждому бару соответствует кнопка-триггер `bar-{i}`.
        for (let i = 0; i < sampleBars.length; i++) {
            const btn = getByTestId(`bar-${i}`) as HTMLButtonElement
            expect(btn.tagName).toBe('BUTTON')
            expect(btn.getAttribute('data-bar-label')).toBe(
                sampleBars[i].label,
            )
            expect(btn.getAttribute('data-bar-value')).toBe(
                String(sampleBars[i].value),
            )
            const expected = t('profile.charts.bars.barAria', {
                month: sampleBars[i].label,
                value: sampleBars[i].value,
            })
            expect(btn.getAttribute('aria-label')).toBe(expected)
        }

        // Внутри SVG ровно `bars.length` `<rect>` баров (плюс 1 ось — линия,
        // не rect). Считаем rect-ов с fill var(--accent-600).
        const rects = svg.querySelectorAll('rect')
        expect(rects.length).toBe(sampleBars.length)
        for (const r of Array.from(rects)) {
            expect(r.getAttribute('fill')).toBe('var(--accent-600)')
        }
    })

    it('renders bar month labels from input data', () => {
        const { getByTestId } = render(
            <ProgressCharts data={{ monthlyBars: sampleBars }} />,
        )
        const svg = getByTestId('progress-bars-svg') as unknown as SVGElement
        const labels = Array.from(svg.querySelectorAll('text')).map(
            (n) => n.textContent ?? '',
        )
        for (const bar of sampleBars) {
            expect(labels).toContain(bar.label)
        }
    })

    it('renders the line chart only when cumulativeLine is non-empty', () => {
        const { queryByTestId, rerender, getByTestId } = render(
            <ProgressCharts data={{ monthlyBars: sampleBars }} />,
        )
        expect(queryByTestId('progress-line-svg')).toBeNull()

        rerender(<ProgressCharts data={sampleData} />)
        const svg = getByTestId('progress-line-svg')
        expect(svg).toBeTruthy()
        // Polyline присутствует, заливка — accent.
        const poly = svg.querySelector('polyline')
        expect(poly).toBeTruthy()
        expect(poly?.getAttribute('stroke')).toBe('var(--accent-600)')

        // По одной кнопке-триггеру на каждую точку.
        for (let i = 0; i < sampleLine.length; i++) {
            const btn = getByTestId(`line-point-${i}`) as HTMLButtonElement
            expect(btn.tagName).toBe('BUTTON')
            expect(btn.getAttribute('data-point-x')).toBe(sampleLine[i].x)
            expect(btn.getAttribute('data-point-y')).toBe(
                String(sampleLine[i].y),
            )
            const expected = t('profile.charts.line.pointAria', {
                date: sampleLine[i].x,
                value: sampleLine[i].y,
            })
            expect(btn.getAttribute('aria-label')).toBe(expected)
        }
    })

    it('skips the empty cumulativeLine array', () => {
        const { queryByTestId } = render(
            <ProgressCharts
                data={{ monthlyBars: sampleBars, cumulativeLine: [] }}
            />,
        )
        expect(queryByTestId('progress-line-svg')).toBeNull()
    })

    it('flags reduced-motion preference on the root', () => {
        installMatchMedia(true)
        const { container } = render(<ProgressCharts data={sampleData} />)
        const root = container.firstChild as HTMLElement
        expect(root.getAttribute('data-reduced-motion')).toBe('true')
    })

    it('flags non-reduced-motion preference on the root', () => {
        installMatchMedia(false)
        const { container } = render(<ProgressCharts data={sampleData} />)
        const root = container.firstChild as HTMLElement
        expect(root.getAttribute('data-reduced-motion')).toBe('false')
    })

    it('merges a custom className with the glass class', () => {
        const { container } = render(
            <ProgressCharts data={sampleData} className="profile-charts" />,
        )
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.classList.contains('profile-charts')).toBe(true)
    })

    it('renders accessible SVGs marked aria-hidden (a11y goes through tooltip buttons)', () => {
        const { getByTestId } = render(<ProgressCharts data={sampleData} />)
        const barsSvg = getByTestId('progress-bars-svg')
        const lineSvg = getByTestId('progress-line-svg')
        expect(barsSvg.getAttribute('aria-hidden')).toBe('true')
        expect(lineSvg.getAttribute('aria-hidden')).toBe('true')
    })

    it('handles a single line point centered horizontally', () => {
        const single: ProgressChartsData = {
            monthlyBars: [],
            cumulativeLine: [{ x: '2026-01-01', y: 7 }],
        }
        const { getByTestId } = render(<ProgressCharts data={single} />)
        const btn = getByTestId('line-point-0') as HTMLButtonElement
        expect(btn).toBeTruthy()
        expect(btn.getAttribute('data-point-y')).toBe('7')
    })
})
