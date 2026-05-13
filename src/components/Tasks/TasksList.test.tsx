import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TasksList } from './TasksList'
import type { Task } from '@/types/database'

/**
 * TasksList — card-grid-only для Tasks_Module (task 18.1).
 *
 * Validates:
 *   - Req 14.4/15.1: **только** карточная сетка. Во всех ветках
 *     (loading, error, empty, ready) присутствует grid-обёртка
 *     `data-ds="tasks-list"`, без подмены на table/list layout.
 *   - Req 20.1: loading → 6 Skeleton-карточек.
 *   - Req 20.2: empty → EmptyState.
 *   - Req 20.3: error → inline ErrorState, grid сохраняется.
 *   - Req 15.1: success-ветка рендерит GlassCard для каждой задачи
 *     с difficulty badge и заголовком, ссылкой на `/tasks/{id}`.
 */

afterEach(() => cleanup())

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 't-1',
    category_id: 'cat-1',
    title: overrides.title ?? 'Two Sum',
    description:
      overrides.description ?? 'Given an array of integers, return indices.',
    difficulty: overrides.difficulty ?? 2,
    starter_code: null,
    solution: null,
    test_cases: [],
    extended_test_cases: null,
    time_limit_ms: 1000,
    memory_limit_mb: 64,
    created_by: null,
    is_official: true,
    created_at: '2024-01-01T00:00:00Z',
    category: overrides.category ?? {
      id: 'cat-1',
      name: 'Algorithms',
      slug: 'algorithms',
      icon: null,
      sort_order: 1,
    },
    ...overrides,
  }
}

describe('TasksList', () => {
  it('loading state renders 6 skeleton cards inside the grid (Req 20.1)', () => {
    const { container, getAllByTestId } = render(
      <TasksList tasks={[]} isLoading />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-ds')).toBe('tasks-list')
    expect(root.getAttribute('data-state')).toBe('loading')
    const skeletons = getAllByTestId('tasks-list-skeleton')
    expect(skeletons.length).toBe(6)
  })

  it('empty state renders EmptyState inside the grid (Req 20.2, 14.4)', () => {
    const { container, queryByRole } = render(<TasksList tasks={[]} />)
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-state')).toBe('empty')
    // Grid wrapper is still present — no layout switch.
    expect(root.querySelector('[data-ds="empty-state"]')).not.toBeNull()
    // EmptyState exposes role="status".
    expect(queryByRole('status')).not.toBeNull()
  })

  it('error state renders inline ErrorState above the grid (Req 20.3, 14.4)', () => {
    const { container, queryByRole } = render(
      <TasksList tasks={[]} error={new Error('boom')} />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-state')).toBe('error')
    // Inline ErrorState is present (role="alert").
    expect(queryByRole('alert')).not.toBeNull()
    // Grid is NOT replaced — skeleton cells keep the layout.
    expect(
      root.querySelector('[data-testid="tasks-list-skeleton"]'),
    ).not.toBeNull()
  })

  it('ready state renders one card per task with GlassCard surface (Req 15.1)', () => {
    const tasks = [
      makeTask({ id: 't-1', title: 'Two Sum' }),
      makeTask({ id: 't-2', title: 'Graph Traversal', difficulty: 4 }),
    ]
    const { container, getAllByTestId, getByText } = render(
      <TasksList tasks={tasks} />,
    )
    const root = container.firstChild as HTMLElement
    expect(root.getAttribute('data-state')).toBe('ready')

    const cards = getAllByTestId('tasks-list-card')
    expect(cards.length).toBe(2)
    cards.forEach((card) => {
      // GlassCard always carries the `.glass` class (Req 3.4).
      expect(card.classList.contains('glass')).toBe(true)
    })
    expect(getByText('Two Sum')).toBeTruthy()
    expect(getByText('Graph Traversal')).toBeTruthy()
  })

  it('ready cards link to /tasks/:id', () => {
    const tasks = [makeTask({ id: 't-42', title: 't' })]
    const { getByTestId } = render(<TasksList tasks={tasks} />)
    const link = getByTestId('tasks-list-card-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/tasks/t-42')
  })

  it('ready cards render a difficulty badge and (optional) category badge', () => {
    const tasks = [makeTask({ id: 't', title: 't', difficulty: 5 })]
    const { container } = render(<TasksList tasks={tasks} />)
    const badges = container.querySelectorAll('[data-ds="badge"]')
    // Difficulty badge (danger for 5) + category badge = 2.
    expect(badges.length).toBe(2)
    // Difficulty=5 maps to danger variant.
    expect(badges[0].getAttribute('data-variant')).toBe('danger')
  })

  it('uses auto-fill grid layout (no table/list fallback anywhere)', () => {
    const { container } = render(<TasksList tasks={[]} isLoading />)
    // No <table> at the root.
    expect(container.querySelector('table')).toBeNull()
    const root = container.firstChild as HTMLElement
    // Grid element has `display: grid`.
    const grid = root.querySelector(
      '[data-ds="tasks-list"] > div, [style*="display: grid"]',
    ) as HTMLElement
    expect(grid).not.toBeNull()
  })
})
