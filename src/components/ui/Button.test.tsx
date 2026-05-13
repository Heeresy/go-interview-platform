import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

/**
 * Unit tests for Button (DS v2 primitive — task 6.1).
 *
 * Covers Requirements: 1.8, 11.3, 11.8, 20.4, 20.5, 22.1.
 */

describe('Button — базовое поведение', () => {
  it('рендерится как <button type="button"> с лейблом', () => {
    render(<Button>Нажми меня</Button>)
    const btn = screen.getByRole('button', { name: 'Нажми меня' })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('type')).toBe('button')
  })

  it('прокидывает ref на нативный элемент', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>OK</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('допускает переопределение type (например, submit в формах)', () => {
    render(<Button type="submit">Отправить</Button>)
    expect(screen.getByRole('button').getAttribute('type')).toBe('submit')
  })

  it('пробрасывает data-* атрибуты через ...rest', () => {
    render(<Button data-analytics-id="cta-hero">CTA</Button>)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('data-analytics-id')).toBe('cta-hero')
  })
})

describe('Button — варианты и размеры (только токены Design_System, Req 1.8, 22.1)', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'вариант %s проставляет класс и data-variant',
    (variant) => {
      render(<Button variant={variant}>v</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain(`ds-btn--${variant}`)
      expect(btn.getAttribute('data-variant')).toBe(variant)
    },
  )

  it.each(['sm', 'md', 'lg'] as const)(
    'размер %s проставляет класс и data-size',
    (size) => {
      render(<Button size={size}>s</Button>)
      const btn = screen.getByRole('button')
      expect(btn.className).toContain(`ds-btn--${size}`)
      expect(btn.getAttribute('data-size')).toBe(size)
    },
  )

  it('по умолчанию primary + md', () => {
    render(<Button>default</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('ds-btn--primary')
    expect(btn.className).toContain('ds-btn--md')
  })

  it('fullWidth добавляет класс ds-btn--full', () => {
    render(<Button fullWidth>wide</Button>)
    expect(screen.getByRole('button').className).toContain('ds-btn--full')
  })

  it('в инлайн-стиле кнопки НЕТ хардкода цвета/пикселей (Req 1.8)', () => {
    render(<Button variant="danger">x</Button>)
    const btn = screen.getByRole('button') as HTMLElement
    // Компонент не должен подставлять инлайн-стили — все значения идут
    // из CSS-класса, построенного на токенах.
    expect(btn.style.color).toBe('')
    expect(btn.style.backgroundColor).toBe('')
    expect(btn.style.padding).toBe('')
    expect(btn.style.borderRadius).toBe('')
  })
})

describe('Button — disabled (Req 20.4)', () => {
  it('disabled блокирует onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        disabled
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('aria-disabled="true" при disabled', () => {
    render(<Button disabled>x</Button>)
    expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe(
      'true',
    )
  })
})

describe('Button — loading (Req 20.4, 20.5)', () => {
  it('loading=true выставляет disabled, aria-busy, aria-disabled и класс', () => {
    render(<Button loading>load</Button>)
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    expect(btn.className).toContain('ds-btn--loading')
    expect(btn.getAttribute('data-loading')).toBe('true')
  })

  it('loading=true показывает spinner', () => {
    render(<Button loading>load</Button>)
    expect(screen.getByTestId('ds-btn-spinner')).toBeInTheDocument()
  })

  it('loading=true блокирует повторный клик через disabled (Req 20.4)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        load
      </Button>,
    )
    const btn = screen.getByRole('button')
    await user.click(btn)
    await user.click(btn)
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('при async onClick автоматически включает внутренний loading и блокирует повторные клики', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((r) => {
      resolve = r
    })
    const onClick = vi.fn(() => pending)
    render(<Button onClick={onClick}>save</Button>)
    const btn = screen.getByRole('button') as HTMLButtonElement

    // Первый клик запускает async-операцию.
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByTestId('ds-btn-spinner')).toBeInTheDocument()

    // Повторные клики игнорируются, пока Promise не зарезолвен.
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)

    // Когда Promise резолвится — loading уходит, кнопка снова кликабельна.
    // Дожидаемся флаша микротасков через ещё один act, чтобы setState
    // в finally() был обработан внутри act-границы.
    await act(async () => {
      resolve()
      await pending
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(btn.disabled).toBe(false)
    expect(btn.getAttribute('aria-busy')).toBeNull()

    await act(async () => {
      fireEvent.click(btn)
    })
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('loading-состояние ЛОКАЛИЗОВАНО в инстансе — соседняя кнопка остаётся активной (Req 20.5)', async () => {
    let resolveA!: () => void
    const pendingA = new Promise<void>((r) => {
      resolveA = r
    })
    const onClickA = vi.fn(() => pendingA)
    const onClickB = vi.fn()

    render(
      <>
        <Button onClick={onClickA}>A</Button>
        <Button onClick={onClickB}>B</Button>
      </>,
    )

    const btnA = screen.getByRole('button', { name: 'A' }) as HTMLButtonElement
    const btnB = screen.getByRole('button', { name: 'B' }) as HTMLButtonElement

    // Запускаем async клик на кнопке A.
    await act(async () => {
      fireEvent.click(btnA)
    })

    // A в loading.
    expect(btnA.disabled).toBe(true)
    expect(btnA.getAttribute('aria-busy')).toBe('true')

    // B должна остаться полностью интерактивной и кликабельной ПАРАЛЛЕЛЬНО.
    expect(btnB.disabled).toBe(false)
    expect(btnB.getAttribute('aria-busy')).toBeNull()
    expect(btnB.getAttribute('data-loading')).toBeNull()

    fireEvent.click(btnB)
    expect(onClickB).toHaveBeenCalledTimes(1)

    // A всё ещё в loading, B уже отработала.
    expect(btnA.disabled).toBe(true)

    // Когда A завершается — обе кнопки активны.
    await act(async () => {
      resolveA()
      await pendingA
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(btnA.disabled).toBe(false)
  })
})

describe('Button — иконки', () => {
  it('leftIcon и rightIcon рендерятся в слотах', () => {
    render(
      <Button leftIcon={<span data-testid="left">L</span>} rightIcon={<span data-testid="right">R</span>}>
        save
      </Button>,
    )
    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  it('на loading leftIcon заменяется на spinner, но лейбл остаётся', () => {
    render(
      <Button loading leftIcon={<span data-testid="left">L</span>}>
        сохранить
      </Button>,
    )
    expect(screen.queryByTestId('left')).not.toBeInTheDocument()
    expect(screen.getByTestId('ds-btn-spinner')).toBeInTheDocument()
    expect(screen.getByText('сохранить')).toBeInTheDocument()
  })
})

describe('Button — accessibility (Req 11.3, 11.8, 22.1)', () => {
  it('focus-visible фокусируется клавиатурой', async () => {
    const user = userEvent.setup()
    render(<Button>focusable</Button>)
    const btn = screen.getByRole('button')
    await user.tab()
    expect(btn).toHaveFocus()
  })

  it('имеет accessible-имя через children (Req 22.1)', () => {
    render(<Button>Сохранить профиль</Button>)
    expect(
      screen.getByRole('button', { name: 'Сохранить профиль' }),
    ).toBeInTheDocument()
  })

  it('позволяет явно задать aria-label и aria-busy через пропсы', () => {
    render(
      <Button aria-label="save" aria-busy={true}>
        x
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('aria-label')).toBe('save')
    expect(btn.getAttribute('aria-busy')).toBe('true')
  })
})
