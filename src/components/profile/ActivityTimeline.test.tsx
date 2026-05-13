import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import {
    ActivityTimeline,
    type ActivityTimelineItem,
} from './ActivityTimeline'
import { t } from '@/lib/i18n'

/**
 * `<ActivityTimeline />` — unit tests (task 21.3).
 *
 * Validates the behavioural contract documented in Requirements
 * 18.1 / 18.2 / 22.1 / 1.8 / 24.2 / 20.2:
 *
 *   - Пустой список → `<EmptyState />`; сам `<ol>`-таймлайн не
 *     рендерится.
 *   - Непустой список → пункты в порядке входного массива; каждый
 *     пункт содержит timestamp (`<time dateTime>`), kind-badge,
 *     description.
 *   - Соединительная линия отсутствует у последнего пункта
 *     (`data-timeline-last="true"` → нет `activity-line-*`).
 *   - Корень — `GlassCard` c классом `.glass` и
 *     `data-profile-section="activity"`.
 */

afterEach(() => cleanup())

const sample: readonly ActivityTimelineItem[] = [
    {
        id: 'e1',
        at: '2026-01-01T10:00:00Z',
        kind: 'решено',
        description: 'Задача «Two Sum» решена',
    },
    {
        id: 'e2',
        at: '2026-01-01T09:30:00Z',
        kind: 'создан',
        description: 'Создан новый мок-интервью',
    },
    {
        id: 'e3',
        at: '2026-01-01T09:00:00Z',
        kind: 'оценка',
        description: 'Ответ на вопрос оценён в 87/100',
    },
] as const

describe('<ActivityTimeline />', () => {
    it('renders EmptyState when items is empty', () => {
        const { queryByTestId, getByRole, getByText } = render(
            <ActivityTimeline items={[]} />,
        )
        expect(queryByTestId('activity-timeline')).toBeNull()
        expect(getByRole('status')).toBeTruthy()
        expect(getByText(t('profile.activity.empty.title'))).toBeTruthy()
    })

    it('renders the localized section title', () => {
        const { getByText } = render(<ActivityTimeline items={sample} />)
        expect(getByText(t('profile.activity.title'))).toBeTruthy()
    })

    it('renders items in the provided order', () => {
        const { getByTestId } = render(<ActivityTimeline items={sample} />)
        const list = getByTestId('activity-timeline')
        const ids = Array.from(
            list.querySelectorAll('[data-activity-id]'),
        ).map((el) => el.getAttribute('data-activity-id'))
        expect(ids).toEqual(['e1', 'e2', 'e3'])
    })

    it('exposes timestamp as <time dateTime> and kind as a Badge', () => {
        const { getByTestId } = render(<ActivityTimeline items={sample} />)
        const timeEl = getByTestId('activity-time-e1') as HTMLTimeElement
        expect(timeEl.tagName).toBe('TIME')
        expect(timeEl.getAttribute('datetime')).toBe(
            '2026-01-01T10:00:00Z',
        )
        expect(timeEl.textContent).toBe('2026-01-01T10:00:00Z')

        const kindBadge = getByTestId('activity-kind-e1')
        expect(kindBadge.getAttribute('data-variant')).toBe('neutral')
        expect(kindBadge.textContent).toBe('решено')
    })

    it('renders description text for each item', () => {
        const { getByTestId } = render(<ActivityTimeline items={sample} />)
        expect(getByTestId('activity-description-e1').textContent).toBe(
            'Задача «Two Sum» решена',
        )
        expect(getByTestId('activity-description-e2').textContent).toBe(
            'Создан новый мок-интервью',
        )
    })

    it('renders a connector line for all items except the last one', () => {
        const { getByTestId, queryByTestId } = render(
            <ActivityTimeline items={sample} />,
        )
        // Точка есть у всех.
        expect(getByTestId('activity-dot-e1')).toBeTruthy()
        expect(getByTestId('activity-dot-e2')).toBeTruthy()
        expect(getByTestId('activity-dot-e3')).toBeTruthy()
        // Линия — только у первых двух.
        expect(getByTestId('activity-line-e1')).toBeTruthy()
        expect(getByTestId('activity-line-e2')).toBeTruthy()
        expect(queryByTestId('activity-line-e3')).toBeNull()
    })

    it('marks the last item with data-timeline-last="true"', () => {
        const { getByTestId } = render(<ActivityTimeline items={sample} />)
        expect(
            getByTestId('activity-item-e1').getAttribute(
                'data-timeline-last',
            ),
        ).toBe('false')
        expect(
            getByTestId('activity-item-e3').getAttribute(
                'data-timeline-last',
            ),
        ).toBe('true')
    })

    it('exposes glass class and data-profile-section on the root', () => {
        const { container } = render(<ActivityTimeline items={sample} />)
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.getAttribute('data-profile-section')).toBe('activity')
    })

    it('handles a single-item timeline without rendering a connector line', () => {
        const single: readonly ActivityTimelineItem[] = [sample[0]] as const
        const { getByTestId, queryByTestId } = render(
            <ActivityTimeline items={single} />,
        )
        expect(getByTestId('activity-dot-e1')).toBeTruthy()
        expect(queryByTestId('activity-line-e1')).toBeNull()
    })

    it('merges a custom className with the glass class', () => {
        const { container } = render(
            <ActivityTimeline
                className="custom-wrap"
                items={sample}
            />,
        )
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.classList.contains('custom-wrap')).toBe(true)
    })
})
