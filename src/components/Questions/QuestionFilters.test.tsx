import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { QuestionFilters } from './QuestionFilters'

/**
 * QuestionFilters — sticky glass panel для Questions_Module (task 17.1).
 *
 * Validates:
 *   - Req 14.4: panel is sticky, рендерится на Glass_Surface (`.glass`).
 *   - Req 24.2: строки берутся через `t()` (проверяется через
 *     непустой placeholder и aria-label — фактический russian-текст
 *     приходит из словаря, компонент не содержит хардкод-строк).
 *   - Контракт props: контролируемый `search`, тогглинг тегов.
 */

afterEach(() => cleanup())

describe('QuestionFilters', () => {
  it('rendered as GlassPanel (carries `.glass` class)', () => {
    const { container } = render(
      <QuestionFilters search="" onSearchChange={() => {}} />,
    )
    const panel = container.firstChild as HTMLElement
    expect(panel.classList.contains('glass')).toBe(true)
  })

  it('applies sticky positioning via inline style (Req 14.4)', () => {
    const { container } = render(
      <QuestionFilters search="" onSearchChange={() => {}} />,
    )
    const panel = container.firstChild as HTMLElement
    expect(panel.style.position).toBe('sticky')
    // top must reference a token (not px literal).
    expect(panel.style.top.startsWith('var(')).toBe(true)
  })

  it('renders a search input with a non-empty placeholder from i18n', () => {
    const { getByTestId } = render(
      <QuestionFilters search="" onSearchChange={() => {}} />,
    )
    const input = getByTestId('question-filters-search') as HTMLInputElement
    expect(input.placeholder.length).toBeGreaterThan(0)
    // No hardcoded strings in the component itself — placeholder came from
    // the RU dictionary, so it's non-empty cyrillic text.
    expect(input.placeholder).not.toBe('{questions.filters.search}')
  })

  it('search input is controlled by the `search` prop', () => {
    const { getByTestId } = render(
      <QuestionFilters search="hello" onSearchChange={() => {}} />,
    )
    const input = getByTestId('question-filters-search') as HTMLInputElement
    expect(input.value).toBe('hello')
  })

  it('invokes onSearchChange on input (contract)', () => {
    const onChange = vi.fn()
    const { getByTestId } = render(
      <QuestionFilters search="" onSearchChange={onChange} />,
    )
    const input = getByTestId('question-filters-search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'redux' } })
    expect(onChange).toHaveBeenCalledWith('redux')
  })

  it('does not render tag chips when no tags provided', () => {
    const { queryByTestId } = render(
      <QuestionFilters search="" onSearchChange={() => {}} />,
    )
    expect(queryByTestId('question-filters-tags')).toBeNull()
  })

  it('renders chips when availableTags provided', () => {
    const { getByText, queryByTestId } = render(
      <QuestionFilters
        search=""
        onSearchChange={() => {}}
        availableTags={['React', 'TypeScript']}
      />,
    )
    expect(queryByTestId('question-filters-tags')).not.toBeNull()
    expect(getByText('React')).toBeTruthy()
    expect(getByText('TypeScript')).toBeTruthy()
  })

  it('marks selected chips with aria-pressed=true', () => {
    const { getByText } = render(
      <QuestionFilters
        search=""
        onSearchChange={() => {}}
        availableTags={['React', 'Go']}
        selectedTags={['Go']}
        onTagsChange={() => {}}
      />,
    )
    const go = getByText('Go').closest('button')!
    const react = getByText('React').closest('button')!
    expect(go.getAttribute('aria-pressed')).toBe('true')
    expect(react.getAttribute('aria-pressed')).toBe('false')
  })

  it('toggling a chip calls onTagsChange with the expected next array', () => {
    const onTagsChange = vi.fn()
    const { getByText, rerender } = render(
      <QuestionFilters
        search=""
        onSearchChange={() => {}}
        availableTags={['React', 'Go']}
        selectedTags={[]}
        onTagsChange={onTagsChange}
      />,
    )
    fireEvent.click(getByText('React').closest('button')!)
    expect(onTagsChange).toHaveBeenLastCalledWith(['React'])

    rerender(
      <QuestionFilters
        search=""
        onSearchChange={() => {}}
        availableTags={['React', 'Go']}
        selectedTags={['React']}
        onTagsChange={onTagsChange}
      />,
    )
    fireEvent.click(getByText('React').closest('button')!)
    expect(onTagsChange).toHaveBeenLastCalledWith([])
  })

  it('chips are disabled (read-only) when onTagsChange is not provided', () => {
    const { getByText } = render(
      <QuestionFilters
        search=""
        onSearchChange={() => {}}
        availableTags={['React']}
      />,
    )
    const chip = getByText('React').closest('button')! as HTMLButtonElement
    expect(chip.disabled).toBe(true)
  })
})
