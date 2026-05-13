import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from './ThemeProvider'
import { Topbar } from './Topbar'

/**
 * Topbar — App_Shell glass-поверхность с Command_Palette-триггером,
 * индикатором уведомлений, кнопкой профиля и мобильным Drawer'ом меню.
 *
 * Requirements: 6.6, 6.7, 8.6, 8.7, 22.2
 */

afterEach(() => {
  cleanup()
})

function renderTopbar(props: Parameters<typeof Topbar>[0]) {
  return render(
    <ThemeProvider>
      <Topbar {...props} />
    </ThemeProvider>,
  )
}

describe('Topbar', () => {
  it('renders as a sticky glass header (Req 6.7)', () => {
    renderTopbar({ onOpenCommandPalette: () => {} })
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('glass')
    expect(header).toHaveClass('topbar')
    expect(header.getAttribute('data-ds')).toBe('topbar')
  })

  it('exposes a localized Command_Palette trigger and invokes the callback on click (Req 6.6, 8.7)', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    renderTopbar({ onOpenCommandPalette: onOpen })

    const trigger = screen.getByRole('button', {
      name: 'Открыть командную палитру',
    })
    expect(trigger).toBeInTheDocument()

    await user.click(trigger)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('renders notifications + profile menu IconButtons with localized a11y labels (Req 6.6)', () => {
    renderTopbar({ onOpenCommandPalette: () => {} })

    expect(
      screen.getByRole('button', { name: 'Уведомления' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Меню профиля' }),
    ).toBeInTheDocument()
    // ThemeToggle is mounted as well.
    expect(
      screen.getByRole('button', { name: 'Переключить тему' }),
    ).toBeInTheDocument()
  })

  it('renders a mobile menu IconButton with localized a11y label (Req 8.6)', () => {
    renderTopbar({ onOpenCommandPalette: () => {} })
    const menu = screen.getByRole('button', { name: 'Открыть меню' })
    expect(menu).toBeInTheDocument()
    // Hidden on desktop via CSS, still present in DOM.
    expect(menu.classList.contains('topbar__menu')).toBe(true)
  })

  it('opens the Drawer with a full list of routes when the menu button is clicked (Req 8.6)', async () => {
    const user = userEvent.setup()
    renderTopbar({ onOpenCommandPalette: () => {} })

    // Drawer closed initially.
    expect(document.querySelector('[data-ds="drawer"]')).toBeNull()

    const menu = screen.getByRole('button', { name: 'Открыть меню' })
    await user.click(menu)

    const drawer = document.querySelector('[data-ds="drawer"]')
    expect(drawer).not.toBeNull()

    // All default routes rendered.
    const expected = [
      'Дашборд',
      'Вопросы',
      'Задачи',
      'Тренажёр',
      'Мок-интервью',
      'Профиль',
      'Статус',
    ]
    for (const label of expected) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('uses custom navItems when provided', async () => {
    const user = userEvent.setup()
    renderTopbar({
      onOpenCommandPalette: () => {},
      navItems: [
        { href: '/custom', label: 'Custom Route' },
        { href: '/another', label: 'Another' },
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))

    expect(screen.getByRole('link', { name: 'Custom Route' })).toHaveAttribute(
      'href',
      '/custom',
    )
    expect(screen.getByRole('link', { name: 'Another' })).toHaveAttribute(
      'href',
      '/another',
    )
    // Default items should NOT be present.
    expect(screen.queryByRole('link', { name: 'Дашборд' })).toBeNull()
  })

  it('closes the Drawer when a navigation link inside is clicked', async () => {
    const user = userEvent.setup()
    renderTopbar({ onOpenCommandPalette: () => {} })

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))
    expect(document.querySelector('[data-ds="drawer"]')).not.toBeNull()

    const link = screen.getByRole('link', { name: 'Вопросы' })
    // The link is a plain <a>; navigation is a no-op in jsdom but the close
    // handler should still fire.
    fireEvent.click(link, { button: 0 })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(document.querySelector('[data-ds="drawer"]')).toBeNull()
  })

  it('closes the Drawer on Escape', async () => {
    const user = userEvent.setup()
    renderTopbar({ onOpenCommandPalette: () => {} })
    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))
    expect(document.querySelector('[data-ds="drawer"]')).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(document.querySelector('[data-ds="drawer"]')).toBeNull()
  })

  it('reflects aria-expanded on the menu button while the Drawer is open', async () => {
    const user = userEvent.setup()
    renderTopbar({ onOpenCommandPalette: () => {} })

    const menu = screen.getByRole('button', { name: 'Открыть меню' })
    expect(menu.getAttribute('aria-expanded')).toBe('false')

    await user.click(menu)
    expect(menu.getAttribute('aria-expanded')).toBe('true')
  })
})
