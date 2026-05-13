import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders a text input by default with DS class', () => {
    render(<Input aria-label="email" />)
    const el = screen.getByRole('textbox', { name: 'email' })
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('type', 'text')
    expect(el).toHaveClass('ds-input')
  })

  it('associates label via htmlFor/id', () => {
    render(<Input label="Email" />)
    const el = screen.getByLabelText('Email') as HTMLInputElement
    expect(el).toBeInTheDocument()
    expect(el.id).toMatch(/^ds-input-/)
  })

  it('does not set aria-invalid and does not render error when no error', () => {
    render(<Input label="Email" hint="We never share it." />)
    const el = screen.getByLabelText('Email')
    expect(el).not.toHaveAttribute('aria-invalid')
    expect(screen.getByText('We never share it.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('on error: sets aria-invalid="true", aria-describedby → error node, renders role="alert"', () => {
    render(<Input label="Email" error="Invalid email" />)
    const el = screen.getByLabelText('Email')
    expect(el).toHaveAttribute('aria-invalid', 'true')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Invalid email')
    expect(el.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('error suppresses hint rendering', () => {
    render(<Input label="Email" hint="Optional" error="Required" />)
    expect(screen.queryByText('Optional')).toBeNull()
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('accepts user input', async () => {
    const user = userEvent.setup()
    render(<Input label="Email" />)
    const el = screen.getByLabelText('Email') as HTMLInputElement
    await user.type(el, 'a@b.co')
    expect(el.value).toBe('a@b.co')
  })

  it('forwards ref to the underlying input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} aria-label="x" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('merges existing aria-describedby with the generated error id', () => {
    render(
      <Input
        label="Email"
        error="oops"
        aria-describedby="external-help"
      />,
    )
    const el = screen.getByLabelText('Email')
    const described = el.getAttribute('aria-describedby') ?? ''
    const alert = screen.getByRole('alert')
    expect(described).toContain('external-help')
    expect(described).toContain(alert.id)
  })
})
