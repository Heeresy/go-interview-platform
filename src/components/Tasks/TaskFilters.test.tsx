import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { TaskFilters } from './TaskFilters'

/**
 * TaskFilters — sticky glass panel для Tasks_Module (task 18.1).
 *
 * Validates:
 *   - Req 14.4/15.1: panel is sticky, рендерится на Glass_Surface (`.glass`).
 *   - Req 24.2: строки берутся через `t()` (проверяется через
 *     непустой placeholder и aria-label — фактический russian-текст
 *     приходит из словаря, компонент не содержит хардкод-строк).
 *   - Контракт props: контролируемый `search`, тогглинг difficulty-чипов.
 */

afterEach(() => cleanup())

describe('TaskFilters', () => {
  it('rendered as GlassPanel (carries `.glass` class)', () => {
    const { container } = render(
      <TaskFilters search="" onSearchChange={() => {}} />,
    )
    const panel = container.firstChild as HTMLElement
    expect(panel.classList.contains('glass')).toBe(true)
  })

  it('applies sticky positioning via inline style (Req 14.4/15.1)', () => {
    const { container } = render(
      <TaskFilters search="" onSearchChange={() => {}} />,
    )
    const panel = container.firstChild as HTMLElement
    expect(panel.style.position).toBe('sticky')
    // top must reference a token (not a px literal).
    expect(panel.style.top.startsWith('var(')).toBe(true)
  })

  it('renders a search input with a non-empty placeholder from i18n', () => {
    const { getByTestId } = render(
      <TaskFilters search="" onSearchChange={() => {}} />,
    )
    const input = getByTestId('task-filters-search') as HTMLInputElement
    expect(input.placeholder.length).toBeGreaterThan(0)
    // No hardcoded strings in the component itself.
    expect(input.placeholder).not.toBe('{tasks.filters.search}')
  })

  it('search input is controlled by the `search` prop', () => {
    const { getByTestId } = render(
      <TaskFilters search="hello" onSearchChange={() => {}} />,
    )
    const input = getByTestId('task-filters-search') as HTMLInputElement
    expect(input.value).toBe('hello')
  })

  it('invokes onSearchChange on input (contract)', () => {
    const onChange = vi.fn()
    const { getByTestId } = render(
      <TaskFilters search="" onSearchChange={onChange} />,
    )
    const input = getByTestId('task-filters-search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'two sum' } })
    expect(onChange).toHaveBeenCalledWith('two sum')
  })

  it('does not render difficulty chips when no handler or snapshot is provided', () => {
    const { queryByTestId } = render(
      <TaskFilters search="" onSearchChange={() => {}} />,
    )
    expect(queryByTestId('task-filters-difficulty')).toBeNull()
  })

  it('renders all 5 difficulty chips when onDifficultiesChange is provided', () => {
    const { queryByTestId, container } = render(
      <TaskFilters
        search=""
        onSearchChange={() => {}}
        selectedDifficulties={[]}
        onDifficultiesChange={() => {}}
      />,
    )
    expect(queryByTestId('task-filters-difficulty')).not.toBeNull()
    const chips = container.querySelectorAll(
      'button[data-ds="task-filters-chip"]',
    )
    expect(chips.length).toBe(5)
  })

  it('marks selected chips with aria-pressed=true and data-active', () => {
    const { container } = render(
      <TaskFilters
        search=""
        onSearchChange={() => {}}
        selectedDifficulties={[2, 5]}
        onDifficultiesChange={() => {}}
      />,
    )
    const chipTwo = container.querySelector(
      'button[data-level="2"]',
    ) as HTMLButtonElement
    const chipThree = container.querySelector(
      'button[data-level="3"]',
    ) as HTMLButtonElement
    const chipFive = container.querySelector(
      'button[data-level="5"]',
    ) as HTMLButtonElement
    expect(chipTwo.getAttribute('aria-pressed')).toBe('true')
    expect(chipFive.getAttribute('aria-pressed')).toBe('true')
    expect(chipThree.getAttribute('aria-pressed')).toBe('false')
  })

  it('toggling a chip calls onDifficultiesChange with the expected next array', () => {
    const onDifficultiesChange = vi.fn()
    const { container, rerender } = render(
      <TaskFilters
        search=""
        onSearchChange={() => {}}
        selectedDifficulties={[]}
        onDifficultiesChange={onDifficultiesChange}
      />,
    )
    const chipOne = container.querySelector(
      'button[data-level="1"]',
    ) as HTMLButtonElement
    fireEvent.click(chipOne)
    expect(onDifficultiesChange).toHaveBeenLastCalledWith([1])

    rerender(
      <TaskFilters
        search=""
        onSearchChange={() => {}}
        selectedDifficulties={[1]}
        onDifficultiesChange={onDifficultiesChange}
      />,
    )
    const chipOneAgain = container.querySelector(
      'button[data-level="1"]',
    ) as HTMLButtonElement
    fireEvent.click(chipOneAgain)
    expect(onDifficultiesChange).toHaveBeenLastCalledWith([])
  })

  it('chips are disabled (read-only) when onDifficultiesChange is not provided but selectedDifficulties is', () => {
    const { container } = render(
      <TaskFilters
        search=""
        onSearchChange={() => {}}
        selectedDifficulties={[3]}
      />,
    )
    const chips = container.querySelectorAll<HTMLButtonElement>(
      'button[data-ds="task-filters-chip"]',
    )
    expect(chips.length).toBe(5)
    chips.forEach((chip) => {
      expect(chip.disabled).toBe(true)
    })
  })
})
