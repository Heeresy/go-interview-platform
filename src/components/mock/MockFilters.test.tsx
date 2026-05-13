import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { MockFilters } from './MockFilters'

/**
 * `<MockFilters />` — sticky glass filters for Mock_Module (task 20.1).
 *
 * Validates (Requirements 17.2, 17.3, 22.1, 24.2):
 *   - Sticky `GlassPanel` (класс `.glass`), `data-ds="mock-filters"`.
 *   - Три группы чипов: difficulty (1…5), category (произвольный
 *     список), rating min (0 «любой», 1…5 «от N»).
 *   - Difficulty / category — multi-select toggle; rating — single-select.
 *   - Группа скрыта, если ни callback, ни initial state не заданы —
 *     визуальный rhythm сохраняется при частичной интеграции.
 *   - Req 17.3: компонент обёрнут в собственный ErrorBoundary с
 *     `renderEmptyOnError`. При нормальной работе fallback скрыт;
 *     при крахе (проверено в SectionErrorBoundary.test) — вся
 *     панель исчезает, список карточек не затронут.
 */

afterEach(() => cleanup())

describe('MockFilters', () => {
  it('renders GlassPanel with sticky glass surface (Req 17.2)', () => {
    const { container } = render(
      <MockFilters
        onDifficultiesChange={() => {}}
        onCategoriesChange={() => {}}
        availableCategories={['Frontend', 'Backend']}
        onMinRatingChange={() => {}}
      />,
    )
    const panel = container.querySelector(
      '[data-ds="mock-filters"]',
    ) as HTMLElement
    expect(panel).not.toBeNull()
    expect(panel.classList.contains('glass')).toBe(true)
  })

  it('renders 5 difficulty chips when onDifficultiesChange is provided', () => {
    const { getByTestId } = render(
      <MockFilters onDifficultiesChange={() => {}} />,
    )
    const group = getByTestId('mock-filters-difficulty')
    const chips = group.querySelectorAll(
      '[data-ds="mock-filters-difficulty-chip"]',
    )
    expect(chips.length).toBe(5)
  })

  it('difficulty chips toggle selection on click (multi-select)', () => {
    const onChange = vi.fn()
    const { getByTestId, rerender } = render(
      <MockFilters
        selectedDifficulties={[]}
        onDifficultiesChange={onChange}
      />,
    )
    const group = getByTestId('mock-filters-difficulty')
    const chips = group.querySelectorAll(
      '[data-ds="mock-filters-difficulty-chip"]',
    ) as NodeListOf<HTMLButtonElement>

    // Click level-1 chip.
    fireEvent.click(chips[0])
    expect(onChange).toHaveBeenLastCalledWith([1])

    // Re-render with [1,3] and click level-3 — deselects 3.
    rerender(
      <MockFilters
        selectedDifficulties={[1, 3]}
        onDifficultiesChange={onChange}
      />,
    )
    const chips2 = getByTestId('mock-filters-difficulty').querySelectorAll(
      '[data-ds="mock-filters-difficulty-chip"]',
    ) as NodeListOf<HTMLButtonElement>
    fireEvent.click(chips2[2]) // level 3
    expect(onChange).toHaveBeenLastCalledWith([1])
  })

  it('difficulty section hides when no callback and no initial selection', () => {
    const { container } = render(<MockFilters minRating={0} />)
    expect(
      container.querySelector('[data-testid="mock-filters-difficulty"]'),
    ).toBeNull()
  })

  it('renders category chips from availableCategories', () => {
    const onChange = vi.fn()
    const { getByTestId } = render(
      <MockFilters
        availableCategories={['Frontend', 'Backend']}
        selectedCategories={['Frontend']}
        onCategoriesChange={onChange}
      />,
    )
    const group = getByTestId('mock-filters-category')
    const chips = group.querySelectorAll(
      '[data-ds="mock-filters-category-chip"]',
    ) as NodeListOf<HTMLButtonElement>
    expect(chips.length).toBe(2)
    // First chip is active (Frontend is selected).
    expect(chips[0].getAttribute('data-active')).toBe('true')
    expect(chips[1].getAttribute('data-active')).toBeNull()

    fireEvent.click(chips[1])
    expect(onChange).toHaveBeenLastCalledWith(['Frontend', 'Backend'])
  })

  it('category section hides when no categories are provided', () => {
    const { container } = render(
      <MockFilters onDifficultiesChange={() => {}} />,
    )
    expect(
      container.querySelector('[data-testid="mock-filters-category"]'),
    ).toBeNull()
  })

  it('renders rating chips with 0 "any" + 1..5 variants (single-select)', () => {
    const onChange = vi.fn()
    const { getByTestId } = render(
      <MockFilters minRating={3} onMinRatingChange={onChange} />,
    )
    const group = getByTestId('mock-filters-rating')
    const chips = group.querySelectorAll(
      '[data-ds="mock-filters-rating-chip"]',
    ) as NodeListOf<HTMLButtonElement>
    expect(chips.length).toBe(6)
    // The value-3 chip is active.
    const active = group.querySelector(
      '[data-ds="mock-filters-rating-chip"][data-active="true"]',
    ) as HTMLButtonElement
    expect(active.getAttribute('data-value')).toBe('3')

    // Click "4" → single-select replaces value with 4.
    fireEvent.click(chips[4])
    expect(onChange).toHaveBeenLastCalledWith(4)

    // Click the currently-active 3 again → resets to 0.
    fireEvent.click(chips[3])
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('rating section hides when neither minRating nor callback are given', () => {
    const { container } = render(
      <MockFilters onDifficultiesChange={() => {}} />,
    )
    expect(
      container.querySelector('[data-testid="mock-filters-rating"]'),
    ).toBeNull()
  })

  it('read-only: chips are disabled when no onChange is provided', () => {
    const { getByTestId } = render(
      <MockFilters selectedDifficulties={[2]} />,
    )
    const chips = getByTestId('mock-filters-difficulty').querySelectorAll(
      '[data-ds="mock-filters-difficulty-chip"]',
    ) as NodeListOf<HTMLButtonElement>
    chips.forEach((c) => expect(c.disabled).toBe(true))
  })

  it('does not expose the error-boundary fallback in the normal path', () => {
    const { container } = render(
      <MockFilters onDifficultiesChange={() => {}} />,
    )
    expect(
      container.querySelector(
        '[data-ds="mock-filters-error-boundary-fallback"]',
      ),
    ).toBeNull()
  })
})
