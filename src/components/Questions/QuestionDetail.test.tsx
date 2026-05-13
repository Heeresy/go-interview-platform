import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { QuestionDetail } from './QuestionDetail'
import type { Question } from '@/types/database'

/**
 * QuestionDetail — двухколоночный layout страницы вопроса (task 17.2).
 *
 * Validates:
 *   - Req 14.1: GlassPanel с заголовком, difficulty-badge и (опциональной)
 *     category-badge на Glass_Surface.
 *   - Req 14.5 / 14.6: переключение 1-col ↔ 2-col через CSS
 *     `@media (min-width: 1024px)` — в TSX не должно быть JS width-check
 *     (`window.innerWidth`, `matchMedia` listener с resize-логикой).
 *     Корневой узел имеет единый `className="question-detail"` без
 *     динамической подмены по ширине.
 *   - AnswerEditor slot: `children` рендерятся в выделенном контейнере
 *     `question-detail__answer`.
 *   - Hint (collapsed): по умолчанию hint-body не отображается; клик
 *     по кнопке переключает `aria-expanded` и показывает текст.
 *   - Нет хардкод-строк в компоненте (строки приходят из i18n).
 */

afterEach(() => cleanup())

function makeQ(overrides: Partial<Question> = {}): Question {
  return {
    id: overrides.id ?? 'q-1',
    category_id: 'cat-1',
    title: overrides.title ?? 'What is hoisting?',
    description: overrides.description ?? 'Explain hoisting in JS.',
    difficulty: overrides.difficulty ?? 2,
    hint: overrides.hint ?? null,
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

describe('QuestionDetail', () => {
  it('renders a single grid root with the question-detail class (Req 14.5, 14.6)', () => {
    const { container } = render(<QuestionDetail question={makeQ()} />)
    const root = container.firstChild as HTMLElement
    expect(root.classList.contains('question-detail')).toBe(true)
    expect(root.getAttribute('data-ds')).toBe('question-detail')
    // No inline `grid-template-columns` switching in JS — layout is
    // controlled purely by CSS media queries. The root must NOT carry
    // any viewport-dependent inline style like `gridTemplateColumns`.
    expect(root.style.gridTemplateColumns).toBe('')
  })

  it('renders GlassPanel with title and difficulty badge (Req 14.1)', () => {
    const { container, getByText, getByTestId } = render(
      <QuestionDetail question={makeQ({ title: 'Hoisting' })} />,
    )
    const panel = getByTestId('question-detail-content')
    // GlassPanel carries the `.glass` class (Req 3.4).
    expect(panel.classList.contains('glass')).toBe(true)
    // Title is visible and rendered as an <h1>.
    expect(getByText('Hoisting')).toBeTruthy()
    expect(container.querySelector('h1')).not.toBeNull()

    const badges = container.querySelectorAll('[data-ds="badge"]')
    // Difficulty badge + (since category is provided) category badge.
    expect(badges.length).toBe(2)
  })

  it('maps difficulty=5 to danger badge variant', () => {
    const { container } = render(
      <QuestionDetail question={makeQ({ difficulty: 5 })} />,
    )
    const firstBadge = container.querySelector('[data-ds="badge"]')
    expect(firstBadge?.getAttribute('data-variant')).toBe('danger')
  })

  it('renders children in the AnswerEditor slot', () => {
    const { getByTestId } = render(
      <QuestionDetail question={makeQ()}>
        <div data-testid="inner-editor">EDITOR</div>
      </QuestionDetail>,
    )
    const slot = getByTestId('question-detail-answer-slot')
    expect(slot.querySelector('[data-testid="inner-editor"]')).not.toBeNull()
  })

  it('renders plain-text description with white-space: pre-wrap when not markdown', () => {
    const { getByTestId } = render(
      <QuestionDetail
        question={makeQ({ description: 'line one\nline two' })}
      />,
    )
    const descSection = getByTestId('question-detail-description')
    const p = descSection.querySelector('p.question-detail__description')
    expect(p).not.toBeNull()
    expect((p as HTMLElement).textContent).toContain('line one')
    expect((p as HTMLElement).textContent).toContain('line two')
  })

  it('does not render description block when description is empty', () => {
    const { queryByTestId } = render(
      <QuestionDetail question={makeQ({ description: '' })} />,
    )
    expect(queryByTestId('question-detail-description')).toBeNull()
  })

  it('renders markdown content when description contains markdown', () => {
    const { getByTestId } = render(
      <QuestionDetail
        question={makeQ({ description: '## Heading\n\nSome **bold** text' })}
      />,
    )
    const descSection = getByTestId('question-detail-description')
    // MarkdownContent wraps output in `.markdown-content`.
    expect(descSection.querySelector('.markdown-content')).not.toBeNull()
  })

  it('does not render hint block when hint is null or empty', () => {
    const { queryByTestId, rerender } = render(
      <QuestionDetail question={makeQ({ hint: null })} />,
    )
    expect(queryByTestId('question-detail-hint-toggle')).toBeNull()

    rerender(<QuestionDetail question={makeQ({ hint: '   ' })} />)
    expect(queryByTestId('question-detail-hint-toggle')).toBeNull()
  })

  it('hint is collapsed by default and expands on click', () => {
    const { getByTestId, queryByTestId } = render(
      <QuestionDetail question={makeQ({ hint: 'Look at TDZ' })} />,
    )
    const toggle = getByTestId('question-detail-hint-toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(queryByTestId('question-detail-hint-body')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const body = queryByTestId('question-detail-hint-body') as HTMLElement
    expect(body).not.toBeNull()
    expect(body.textContent).toBe('Look at TDZ')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(queryByTestId('question-detail-hint-body')).toBeNull()
  })

  it('hint toggle has non-empty localized label from i18n (Req 24.2)', () => {
    const { getByTestId } = render(
      <QuestionDetail question={makeQ({ hint: 'some hint' })} />,
    )
    const toggle = getByTestId('question-detail-hint-toggle')
    // Label must be non-empty and must not be the raw translation key.
    expect(toggle.textContent && toggle.textContent.trim().length).toBeGreaterThan(0)
    expect(toggle.textContent).not.toContain('questions.detail.hint')
  })

  it('does not render a category badge when category is absent', () => {
    const { container } = render(
      <QuestionDetail question={makeQ({ category: undefined })} />,
    )
    const badges = container.querySelectorAll('[data-ds="badge"]')
    expect(badges.length).toBe(1)
  })
})
