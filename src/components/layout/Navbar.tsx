'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  MessageSquareCode,
  Code2,
  GraduationCap,
  Users,
  LogIn,
  Menu,
  X,
  Sun,
  Moon,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/questions', label: 'Вопросы', icon: MessageSquareCode },
  { href: '/tasks', label: 'Задачи', icon: Code2 },
  { href: '/trainer', label: 'Тренажёр', icon: GraduationCap },
  { href: '/mock', label: 'MOCK', icon: Users },
]

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string; email?: string; avatar_url?: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          avatar_url: data.user.user_metadata?.avatar_url,
        })
      }
    })

    // Load theme preference
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      setTheme('light')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : 'light')
    localStorage.setItem('theme', next)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  return (
    <header className="navbar">
      <nav className="navbar__inner container">
        {/* Logo */}
        <Link href="/" className="navbar__logo">
          <Code2 size={28} strokeWidth={2.5} />
          <span className="navbar__logo-text">
            GO<span className="navbar__logo-accent">Prep</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="navbar__links">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'navbar__link',
                pathname.startsWith(href) && 'navbar__link--active'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="navbar__actions">
          <button
            className="btn btn--ghost btn--icon"
            onClick={toggleTheme}
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className="navbar__user-menu">
              <Link href="/profile" className="navbar__avatar-link">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="navbar__avatar" />
                ) : (
                  <div className="navbar__avatar navbar__avatar--placeholder">
                    <User size={16} />
                  </div>
                )}
              </Link>
              <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn--primary btn--sm">
              <LogIn size={16} />
              Войти
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            className="navbar__burger btn btn--ghost btn--icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Меню"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="navbar__mobile">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'navbar__mobile-link',
                pathname.startsWith(href) && 'navbar__mobile-link--active'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          background: var(--glass-bg-strong);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
        }
        .navbar__inner {
          display: flex;
          align-items: center;
          height: 72px;
          gap: var(--space-8);
        }
        .navbar__logo {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--text-primary);
          font-weight: 800;
          font-size: var(--font-size-xl);
          text-decoration: none;
          flex-shrink: 0;
        }
        .navbar__logo-accent {
          color: var(--text-primary);
        }
        .navbar__links {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          flex: 1;
        }
        .navbar__link {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) 0;
          color: var(--text-secondary) !important;
          font-size: var(--font-size-sm);
          font-weight: 500;
          text-decoration: none;
          transition: all var(--duration-fast) var(--ease-out);
          border-bottom: 2px solid transparent;
        }
        .navbar__link:hover {
          color: var(--text-primary) !important;
        }
        .navbar__link--active {
          color: var(--text-primary) !important;
          border-bottom-color: var(--color-primary);
        }
        .navbar__actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }
        .navbar__user-menu {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .navbar__avatar-link {
          display: flex;
        }
        .navbar__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--glass-border);
        }
        .navbar__avatar--placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        .navbar__burger {
          display: none;
        }

        /* Mobile menu overlay */
        .navbar__mobile {
          display: none;
          flex-direction: column;
          padding: var(--space-4) var(--space-6) var(--space-6);
          border-top: 1px solid var(--border-color);
          background: var(--glass-bg-strong);
          backdrop-filter: blur(20px);
        }
        .navbar__mobile-link {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-weight: 500;
          text-decoration: none;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .navbar__mobile-link:hover,
        .navbar__mobile-link--active {
          color: var(--text-primary) !important;
          background: var(--bg-hover) !important;
        }

        @media (max-width: 768px) {
          .navbar__links {
            display: none;
          }
          .navbar__burger {
            display: flex;
          }
          .navbar__mobile {
            display: flex;
          }
        }
      `}</style>
    </header>
  )
}
