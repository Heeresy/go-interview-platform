import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('renders a textarea with DS class and default rows=4', () => {
    render(<Textarea aria-label="notes" />)
    const el = screen.getByRole('textbox', { name: 'notes' }) as HTMLTextAreaElement
    expect(el.tagName).toBe('TEXTAREA')
    expect(el).toHaveClass('ds-textarea')
    expect(el.rows).toBe(4)
  })

  it('associates label via htmlFor/id', () => {
    render(<Textarea label="Notes" />)
    const el = screen.getByLabelText('Notes') as HTMLTextAreaElement
    expect(el).toBeInTheDocument()
    expect(el.id).toMatch(/^ds-textarea-/)
  })

  it('no error: no aria-invalid, no role="alert"', () => {
    render(<Textarea label="Notes" hint="Markdown OK" />)
    const el = screen.getByLabelText('Notes')
    expect(el).not.toHaveAttribute('aria-invalid')
    expect(screen.getByText('Markdown OK')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('on error: aria-invalid="true" and aria-describedby → alert', () => {
    render(<Textarea label="Notes" error="Too short" />)
    const el = screen.getByLabelText('Notes')
    expect(el).toHaveAttribute('aria-invalid', 'true')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Too short')
    expect(el.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('error suppresses hint', () => {
    render(<Textarea label="Notes" hint="Optional" error="Required" />)
    expect(screen.queryByText('Optional')).toBeNull()
  })

  it('accepts multi-line input', async () => {
    const user = userEvent.setup()
    render(<Textarea label="Notes" />)
    const el = screen.getByLabelText('Notes') as HTMLTextAreaElement
    await user.type(el, 'line1{enter}line2')
    expect(el.value).toBe('line1\nline2')
  })

  it('forwards ref to the underlying textarea', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} aria-label="x" />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('respects custom rows prop', () => {
    render(<Textarea aria-label="x" rows={10} />)
    const el = screen.getByRole('textbox', { name: 'x' }) as HTMLTextAreaElement
    expect(el.rows).toBe(10)
  })
})
