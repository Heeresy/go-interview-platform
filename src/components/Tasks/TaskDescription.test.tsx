import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import type { Task } from '@/types/database'
import TaskDescription from './TaskDescription'

/**
 * TaskDescription — DS v2 glass-панель с заголовком, бейджем сложности и
 * описанием (Req 15.1, 15.4).
 */

const baseTask: Task = {
  id: 't-1',
  category_id: 'c-1',
  title: 'Two Sum',
  description: 'Given an array of integers, return indices of two numbers...',
  difficulty: 3,
  starter_code: null,
  solution: null,
  test_cases: [],
  extended_test_cases: null,
  time_limit_ms: 1000,
  memory_limit_mb: 128,
  created_by: null,
  is_official: true,
  created_at: '2026-01-01T00:00:00Z',
  category: {
    id: 'c-1',
    name: 'Arrays',
    slug: 'arrays',
    icon: null,
    sort_order: 1,
  },
}

describe('TaskDescription', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders on a GlassPanel (data-ds="task-description" with .glass)', () => {
    const { container } = render(<TaskDescription task={baseTask} />)
    const panel = container.querySelector('[data-ds="task-description"]')
    expect(panel).not.toBeNull()
    expect((panel as HTMLElement).classList.contains('glass')).toBe(true)
  })

  it('renders the task title as <h1>', () => {
    const { getByRole } = render(<TaskDescription task={baseTask} />)
    const h1 = getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Two Sum')
  })

  it('renders a Badge with the difficulty label', () => {
    const { container } = render(<TaskDescription task={baseTask} />)
    const badge = container.querySelector('[data-ds="badge"]')
    expect(badge).not.toBeNull()
    // Difficulty 3 maps to "Выше среднего" (see src/lib/utils.ts).
    expect(badge?.textContent).toContain('Выше среднего')
  })

  it('maps difficulty to the expected semantic Badge variant', () => {
    const mapping: Array<[Task['difficulty'], string]> = [
      [1, 'success'],
      [2, 'info'],
      [3, 'info'],
      [4, 'warning'],
      [5, 'danger'],
    ]
    for (const [difficulty, expected] of mapping) {
      const { container, unmount } = render(
        <TaskDescription task={{ ...baseTask, difficulty }} />,
      )
      const badge = container.querySelector('[data-ds="badge"]') as HTMLElement | null
      expect(badge).not.toBeNull()
      expect(badge!.getAttribute('data-variant')).toBe(expected)
      unmount()
    }
  })

  it('renders the category name when provided', () => {
    const { container } = render(<TaskDescription task={baseTask} />)
    expect(container.textContent).toContain('Arrays')
  })

  it('omits the category label when task.category is absent', () => {
    const { container } = render(
      <TaskDescription task={{ ...baseTask, category: undefined }} />,
    )
    expect(container.textContent).not.toContain('Arrays')
  })

  it('renders markdown body inside a dedicated container', () => {
    const { container } = render(<TaskDescription task={baseTask} />)
    const body = container.querySelector('[data-ds="task-description-body"]')
    expect(body).not.toBeNull()
    expect(body?.querySelector('.markdown-content')).not.toBeNull()
  })
})
