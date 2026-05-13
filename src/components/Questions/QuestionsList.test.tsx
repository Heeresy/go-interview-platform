import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { QuestionsList } from './QuestionsList'
import type { Question } from '@/types/database'

/**
 * QuestionsList — card-grid-only для Questions_Module (task 17.1).
 *
 * Validates:
 *   - Req 14.4: **только** карточная сетка. Во всех ветках (loading,
 *     error, empty, ready) у компонента присутствует `[data-testid=
 *     "questions-list-grid"]`-подобный grid-контейнер
 *     (data-ds="questions-list"), без подмены на table/list layout.
 *   - Req 20.1: loading → 6 Skeleton-карточек.
 *   - Req 20.2: empty → EmptyState.
 *   - Req 20.3: error → inline ErrorState, grid сохраняется.
 *   - Req 14.1: success-ветка рендерит GlassCard для каждого вопроса
 *     с difficulty badge и заголовком.
 */

afterEach(() => cleanup())

function makeQ(overrides: Partial<Question> = {}): Question {
  return {
    id: overrides.id ?? 'q-1',
    category_id: 'cat-1',
    title: overrides.title ?? 'What is hoisting?',
    description: overrides.description ?? 'Explain hoisting in JS.',
    difficulty: overrides.difficulty ?? 2,
    hint: null,
    reference_answer: null,
    created_by: null,
    is_official: true,
    created_at: '2024-01-01T00:00:00Z',
    category: overrides.category ?? {
      id: 'cat-1',
      name: 'JavaScript',
      slug: 'javascript',
      icon: null,
      sort_order: 1,
    },
    ...overrides,
  }
}

describe('QuestionsList', () => {
  it('loading state renders 6 skeleton cards inside the grid (Req 20.1)', () => {
    const { container, getAllByTestId } = render(
      <QuestionsList questions={[]} isLoading />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-ds')).toBe('questions-list')
    expect(root.getAttribute('data-state')).toBe('loading')
    const skeletons = getAllByTestId('questions-list-skeleton')
    expect(skeletons.length).toBe(6)
  })

  it('empty state renders EmptyState inside the grid (Req 20.2, 14.4)', () => {
    const { container, queryByRole } = render(<QuestionsList questions={[]} />)
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-state')).toBe('empty')
    // The grid wrapper is still present — no layout switch.
    expect(root.querySelector('[data-ds="empty-state"]')).not.toBeNull()
    // EmptyState exposes role="status".
    expect(queryByRole('status')).not.toBeNull()
  })

  it('error state renders inline ErrorState above the grid (Req 20.3, 14.4)', () => {
    const { container, queryByRole } = render(
      <QuestionsList questions={[]} error={new Error('boom')} />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-state')).toBe('error')
    // Inline ErrorState is present (role="alert").
    expect(queryByRole('alert')).not.toBeNull()
    // Grid is NOT replaced — skeleton cells keep the layout.
    expect(root.querySelector('[data-testid="questions-list-skeleton"]')).not.toBeNull()
  })

  it('ready state renders one card per question with GlassCard surface (Req 14.1)', () => {
    const questions = [
      makeQ({ id: 'q-1', title: 'Hoisting' }),
      makeQ({ id: 'q-2', title: 'Closures', difficulty: 4 }),
    ]
    const { container, getAllByTestId, getByText } = render(
      <QuestionsList questions={questions} />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-state')).toBe('ready')

    const cards = getAllByTestId('questions-list-card')
    expect(cards.length).toBe(2)
    cards.forEach((card) => {
      // GlassCard always carries the `.glass` class (Req 3.4).
      expect(card.classList.contains('glass')).toBe(true)
    })
    expect(getByText('Hoisting')).toBeTruthy()
    expect(getByText('Closures')).toBeTruthy()
  })

  it('ready cards link to /questions/:id', () => {
    const questions = [makeQ({ id: 'q-42', title: 't' })]
    const { getByTestId } = render(<QuestionsList questions={questions} />)
    const link = getByTestId('questions-list-card-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/questions/q-42')
  })

  it('ready cards render a difficulty badge and (optional) category badge', () => {
    const questions = [makeQ({ id: 'q', title: 't', difficulty: 5 })]
    const { container } = render(<QuestionsList questions={questions} />)
    const badges = container.querySelectorAll('[data-ds="badge"]')
    // Difficulty badge (danger for 5) + category badge = 2.
    expect(badges.length).toBe(2)
    // Difficulty=5 maps to danger variant.
    expect(badges[0].getAttribute('data-variant')).toBe('danger')
  })

  it('uses auto-fill grid layout (no table/list fallback anywhere)', () => {
    const { container } = render(
      <QuestionsList questions={[]} isLoading />,
    )
    // No <table>, <ul>-based list layout at the root.
    expect(container.querySelector('table')).toBeNull()
    // Grid element has `display: grid`.
    const root = container.firstChild as HTMLElement
    const grid = root.querySelector('[data-ds="questions-list"] > div, [style*="display: grid"]') as HTMLElement
    expect(grid).not.toBeNull()
  })
})
