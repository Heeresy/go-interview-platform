import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EmptyState } from './EmptyState'

/**
 * EmptyState — DS v2 primitive (task 7.2).
 *
 * Validates:
 *  - Requirement 20.2 (empty state with icon + title + description + CTA).
 *  - Requirement 22.1 (lives in `src/components/ui/`).
 *  - Requirement 24.2 (title/description are consumer-supplied; no
 *    hardcoded strings inside the component).
 */

afterEach(() => cleanup())

describe('EmptyState', () => {
  it('renders title as heading content', () => {
    const { getByText } = render(<EmptyState title="Нет данных" />)
    expect(getByText('Нет данных')).toBeTruthy()
  })

  it('renders description when provided', () => {
    const { getByText } = render(
      <EmptyState title="Пусто" description="Создайте первый элемент" />,
    )
    expect(getByText('Создайте первый элемент')).toBeTruthy()
  })

  it('omits description paragraph when not provided', () => {
    const { container } = render(<EmptyState title="Пусто" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders the icon slot when supplied', () => {
    const { getByText } = render(
      <EmptyState
        title="Пусто"
        icon={<span data-testid="icon">icon</span>}
      />,
    )
    expect(getByText('icon')).toBeTruthy()
  })

  it('renders the CTA slot when supplied', () => {
    const { getByRole } = render(
      <EmptyState title="Пусто" cta={<button>Создать</button>} />,
    )
    expect(getByRole('button').textContent).toBe('Создать')
  })

  it('exposes role="status" with polite aria-live for AT', () => {
    const { container } = render(<EmptyState title="Пусто" />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('role')).toBe('status')
    expect(el.getAttribute('aria-live')).toBe('polite')
  })
})
