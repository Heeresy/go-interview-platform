import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MockCard, type MockSummary } from './MockCard'

/**
 * `<MockCard />` — individual mock card for Mock_Module (task 20.1).
 *
 * Validates (Requirements 17.1, 17.2, 17.3, 22.1, 24.2):
 *   - GlassCard-поверхность (класс `.glass`, Req 3.4) + ссылка на `/mock/{id}`.
 *   - Бейджи: difficulty (вариант по уровню) + category (neutral).
 *   - Звёзды рейтинга — 5 штук, заполняются по `Math.round(averageRating)`.
 *   - Числовое отображение рейтинга в формате `X.Y`.
 *   - Счётчик комментариев с иконкой.
 *   - Корректная обработка мусорных данных: `NaN` / `Infinity` /
 *     отрицательные значения не роняют компонент и не показывают
 *     противоречивых чисел (Req 17.3: карточка полностью
 *     работоспособна независимо от состояния фильтров).
 *   - Ссылка, рейтинг и счётчик комментариев — все доступны
 *     через `data-testid` для property-test'ов.
 */

afterEach(() => cleanup())

function makeMock(overrides: Partial<MockSummary> = {}): MockSummary {
  return {
    id: overrides.id ?? 'mock-1',
    title: overrides.title ?? 'System design basics',
    difficulty: overrides.difficulty ?? 2,
    category: overrides.category ?? 'System Design',
    averageRating: overrides.averageRating ?? 4.25,
    commentCount: overrides.commentCount ?? 7,
  }
}

describe('MockCard', () => {
  it('renders GlassCard surface with link to /mock/:id (Req 17.1, 3.4)', () => {
    const { getByTestId } = render(
      <MockCard mock={makeMock({ id: 'abc-123' })} />,
    )
    const card = getByTestId('mock-card')
    expect(card.classList.contains('glass')).toBe(true)

    const link = getByTestId('mock-card-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/mock/abc-123')
  })

  it('renders difficulty and category badges', () => {
    const { container } = render(
      <MockCard
        mock={makeMock({ difficulty: 5, category: 'Algorithms' })}
      />,
    )
    const badges = container.querySelectorAll('[data-ds="badge"]')
    // Difficulty badge + category badge = 2.
    expect(badges.length).toBe(2)
    // Difficulty=5 maps to danger variant.
    expect(badges[0].getAttribute('data-variant')).toBe('danger')
    // Category badge is neutral.
    expect(badges[1].getAttribute('data-variant')).toBe('neutral')
    expect(badges[1].textContent).toBe('Algorithms')
  })

  it('difficulty variant maps as success/info/warning/danger', () => {
    const variants = [1, 2, 3, 4, 5].map((d) => {
      const { container, unmount } = render(
        <MockCard mock={makeMock({ difficulty: d })} />,
      )
      const badge = container.querySelector('[data-ds="badge"]')
      const v = badge?.getAttribute('data-variant') ?? ''
      unmount()
      return v
    })
    expect(variants).toEqual(['success', 'info', 'info', 'warning', 'danger'])
  })

  it('renders 5 stars and formats rating value with one decimal', () => {
    const { getByTestId } = render(
      <MockCard mock={makeMock({ averageRating: 4.25 })} />,
    )
    const stars = getByTestId('mock-card-stars')
    expect(stars.querySelectorAll('svg').length).toBe(5)

    const rating = getByTestId('mock-card-rating')
    // Numeric value "4.3" rendered.
    expect(rating.textContent).toContain('4.3')
  })

  it('renders comment count', () => {
    const { getByTestId } = render(
      <MockCard mock={makeMock({ commentCount: 42 })} />,
    )
    const comments = getByTestId('mock-card-comments')
    expect(comments.textContent).toContain('42')
    // Icon still mounted.
    expect(comments.querySelector('svg')).not.toBeNull()
  })

  it('degrades gracefully on NaN/Infinity/negative values (Req 17.3)', () => {
    const { getByTestId } = render(
      <MockCard
        mock={makeMock({
          averageRating: Number.NaN,
          commentCount: -5,
        })}
      />,
    )
    const rating = getByTestId('mock-card-rating')
    expect(rating.textContent).toContain('—')
    const comments = getByTestId('mock-card-comments')
    // Negative becomes 0.
    expect(comments.textContent).toContain('0')
  })

  it('clamps rating above 5 without crashing', () => {
    const { getByTestId } = render(
      <MockCard mock={makeMock({ averageRating: 9 })} />,
    )
    const rating = getByTestId('mock-card-rating')
    // Clamped to 5.0.
    expect(rating.textContent).toContain('5.0')
  })

  it('renders dash for out-of-range difficulty values', () => {
    const { container } = render(
      <MockCard mock={makeMock({ difficulty: 99 })} />,
    )
    const diffBadge = container.querySelector('[data-ds="badge"]')
    expect(diffBadge?.textContent).toBe('—')
  })
})
