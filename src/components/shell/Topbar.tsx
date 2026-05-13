'use client'

/**
 * Topbar — glass-поверхность App_Shell, sticky в верхней части контент-области.
 *
 * Требования (Requirements 6.6, 6.7, 8.6, 8.7, 22.2):
 *
 *  - `.glass` как визуальная поверхность (Req 6.7).
 *  - `position: sticky; top: 0; z-index: var(--z-sticky)` — закреплён в верхней
 *    части области контента при прокрутке (Req 6.7).
 *  - Кнопка вызова Command_Palette (secondary `Button` с хинтом «Cmd+K») —
 *    `onClick → onOpenCommandPalette`, `aria-label={t('a11y.openCommandPalette')}`
 *    (Req 6.6, 8.7).
 *  - Индикатор уведомлений (IconButton с иконкой `Bell`,
 *    `aria-label={t('a11y.notifications')}`) (Req 6.6).
 *  - Меню профиля (IconButton с иконкой `User`,
 *    `aria-label={t('a11y.profileMenu')}`) (Req 6.6).
 *  - `ThemeToggle` — перенесён из `@/components/shell/ThemeToggle`.
 *  - На Tablet + Mobile (`max-width: 1023px`) отображается кнопка «меню»
 *    (IconButton с иконкой `Menu`, `aria-label={t('a11y.openMenu')}`);
 *    клик открывает `<Drawer />` с полным списком маршрутов (Req 8.6).
 *    На Desktop/Wide (≥ 1024px) кнопка «меню» скрыта через CSS.
 *
 *  - Используются только токены Design_System (Req 1.8). Все цвета / отступы /
 *    скругления / motion приходят через CSS-классы `.glass`, `.ds-btn`,
 *    `.ds-icon-btn` и `.topbar*` — TSX не содержит хардкод-значений.
 *
 *  - Все строки локализованы через `t(...)` (Req 24.2).
 */

import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  Menu,
  Search,
  User,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Dumbbell,
  Video,
  UserCircle,
  Activity,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Drawer } from '@/components/ui/Drawer'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import './Topbar.css'

export interface TopbarNavItem {
  href: string
  label: string
  icon?: ReactNode
}

export interface TopbarProps {
  /** Callback on clicking the Command Palette trigger. */
  onOpenCommandPalette: () => void
  /**
   * Navigation items shown in the mobile drawer. Defaults to the App_Shell
   * sections: Dashboard, Questions, Tasks, Trainer, Mock, Profile, Status.
   */
  navItems?: TopbarNavItem[]
  /** Optional extra className for composition. */
  className?: string
}

/**
 * Default navigation items. Labels are locale-driven via `t('nav.*')`;
 * icons come from `lucide-react`. Order matches Sidebar (task 10.1).
 */
function getDefaultNavItems(): TopbarNavItem[] {
  return [
    {
      href: '/',
      label: t('nav.dashboard'),
      icon: <LayoutDashboard size={18} aria-hidden="true" />,
    },
    {
      href: '/questions',
      label: t('nav.questions'),
      icon: <MessageSquare size={18} aria-hidden="true" />,
    },
    {
      href: '/tasks',
      label: t('nav.tasks'),
      icon: <ListTodo size={18} aria-hidden="true" />,
    },
    {
      href: '/trainer',
      label: t('nav.trainer'),
      icon: <Dumbbell size={18} aria-hidden="true" />,
    },
    {
      href: '/mock',
      label: t('nav.mock'),
      icon: <Video size={18} aria-hidden="true" />,
    },
    {
      href: '/profile',
      label: t('nav.profile'),
      icon: <UserCircle size={18} aria-hidden="true" />,
    },
    {
      href: '/status',
      label: t('nav.status'),
      icon: <Activity size={18} aria-hidden="true" />,
    },
  ]
}

export function Topbar({
  onOpenCommandPalette,
  navItems,
  className,
}: TopbarProps) {
  const items = navItems ?? getDefaultNavItems()
  const router = useRouter()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleProfileMenu = useCallback(() => setProfileMenuOpen((v) => !v), [])

  const handleSignOut = useCallback(async () => {
    setProfileMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  return (
    <header
      data-ds="topbar"
      className={cn('glass', 'topbar', className)}
      role="banner"
    >
      {/* Left slot: mobile menu button (hidden on Desktop/Wide via CSS). */}
      <div className="topbar__left">
        <IconButton
          className="topbar__menu"
          icon={<Menu size={18} aria-hidden="true" />}
          aria-label={t('a11y.openMenu')}
          aria-expanded={drawerOpen}
          aria-controls="topbar-drawer"
          variant="ghost"
          size="md"
          onClick={openDrawer}
          data-ds="topbar-menu"
        />
      </div>

      {/* Center slot: Command_Palette trigger (Req 6.6, 8.7). */}
      <div className="topbar__center">
        <Button
          variant="secondary"
          size="md"
          className="topbar__search"
          aria-label={t('a11y.openCommandPalette')}
          onClick={onOpenCommandPalette}
          data-ds="topbar-command-palette-trigger"
          leftIcon={<Search size={16} aria-hidden="true" />}
        >
          <span className="topbar__search-label" aria-hidden="true">
            {t('commandPalette.placeholder')}
          </span>
          <kbd className="topbar__search-hint" aria-hidden="true">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </Button>
      </div>

      {/* Right slot: notifications + theme toggle + profile menu. */}
      <div className="topbar__right">
        <IconButton
          icon={<Bell size={18} aria-hidden="true" />}
          aria-label={t('a11y.notifications')}
          variant="ghost"
          size="md"
          data-ds="topbar-notifications"
          onClick={() => router.push('/profile')}
        />
        <ThemeToggle variant="ghost" size="md" />
        <div className="topbar__profile-wrapper" ref={profileRef}>
          <IconButton
            icon={<User size={18} aria-hidden="true" />}
            aria-label={t('a11y.profileMenu')}
            variant="ghost"
            size="md"
            data-ds="topbar-profile"
            onClick={toggleProfileMenu}
            aria-expanded={profileMenuOpen}
          />
          {profileMenuOpen && (
            <div className="topbar__profile-menu" role="menu">
              <a
                href="/profile"
                className="topbar__profile-menu-item"
                role="menuitem"
                onClick={() => setProfileMenuOpen(false)}
              >
                <UserCircle size={16} aria-hidden="true" />
                <span>{t('nav.profile')}</span>
              </a>
              <button
                type="button"
                className="topbar__profile-menu-item topbar__profile-menu-item--danger"
                role="menuitem"
                onClick={handleSignOut}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>{t('auth.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer: full list of navigation routes (Req 8.6). */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={t('a11y.openMenu')}
        position="left"
      >
        <nav aria-label={t('a11y.openMenu')} id="topbar-drawer">
          <ul className="topbar__drawer-list">
            {items.map((item) => (
              <li key={item.href} className="topbar__drawer-item">
                <a
                  href={item.href}
                  className="topbar__drawer-link"
                  onClick={closeDrawer}
                >
                  {item.icon ? (
                    <span className="topbar__drawer-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Drawer>
    </header>
  )
}

export default Topbar
