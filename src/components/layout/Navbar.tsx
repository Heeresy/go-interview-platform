'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  Code2,
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
  { href: '/questions', label: 'Вопросы' },
  { href: '/tasks', label: 'Задачи' },
  { href: '/trainer', label: 'Тренажёр' },
  { href: '/mock', label: 'MOCK' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string; email?: string; avatar_url?: string; display_name?: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [scrolled, setScrolled] = useState(false)

  const checkUser = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email,
        avatar_url: data.user.user_metadata?.avatar_url,
        display_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
      })
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)

    checkUser()

    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      setTheme('light')
      document.documentElement.setAttribute('data-theme', 'light')
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [checkUser])

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
    <header className={cn('navbar-wrapper', scrolled && 'navbar-wrapper--scrolled')}>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="navbar container"
      >
        <div className="navbar__inner">
          <Link href="/" className="navbar__logo">
            <div className="navbar__logo-icon">
              <Code2 size={24} strokeWidth={2.5} />
            </div>
            <span className="navbar__logo-text">
              GO<span className="navbar__logo-accent">Prep</span>
            </span>
          </Link>

          <div className="navbar__links" aria-label="Основная навигация">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'navbar__link',
                    isActive && 'navbar__link--active'
                  )}
                >
                  <span>{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="navbar__link-pill"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="navbar__actions">
            <button
              className="btn-icon-aura"
              onClick={toggleTheme}
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="navbar__user-menu">
                <Link href="/profile" className="navbar__avatar-link">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="navbar__avatar" />
                  ) : (
                    <div className="navbar__avatar navbar__avatar--placeholder">
                      <User size={14} />
                    </div>
                  )}
                </Link>
                <button className="btn btn--secondary btn--sm" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn btn--primary btn--sm btn--aura">
                <LogIn size={16} />
                <span>Войти</span>
              </Link>
            )}

            <button
              className="navbar__burger"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.nav>

      <motion.nav
        initial={false}
        animate={mobileOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        className="navbar__mobile"
      >
        <div className="container">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'navbar__mobile-link',
                pathname.startsWith(href) && 'navbar__mobile-link--active'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </motion.nav>

      <style jsx>{`
        .navbar-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding-top: var(--space-4);
          transition: all var(--duration-normal) var(--ease-expo);
          background: var(--glass-bg-strong);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border-bottom: 1px solid var(--glass-border);
        }
        .navbar-wrapper--scrolled {
          padding-top: var(--space-2);
          box-shadow: var(--glass-shadow);
        }
        .navbar {
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: none;
          border-radius: 0;
          box-shadow: none;
        }
        .navbar__inner {
          display: flex;
          align-items: center;
          height: 64px;
          padding-inline: var(--space-4);
          gap: var(--space-8);
        }
        .navbar__logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          text-decoration: none;
        }
        .navbar__logo-icon {
          background: var(--color-primary);
          color: var(--bg-primary);
          padding: 6px;
          border-radius: 10px;
          display: flex;
          box-shadow: 0 4px 12px var(--color-primary-muted);
        }
        .navbar__logo-text {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .navbar__logo-accent {
          color: var(--color-primary);
        }
        .navbar__links {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          flex: 1;
        }
        .navbar__link {
          position: relative;
          display: flex;
          align-items: center;
          padding: 8px 20px;
          color: var(--text-secondary);
          font-size: 1.2rem;
          font-weight: 900;
          text-decoration: none;
          transition: color var(--duration-fast);
        }
        .navbar__link:hover {
          color: var(--text-primary);
        }
        .navbar__link--active {
          color: var(--text-primary);
        }
        .navbar__link-pill {
          position: absolute;
          inset: 0;
          background: var(--bg-tertiary);
          border-radius: 12px;
          z-index: -1;
          border: 1px solid var(--glass-border);
        }
        .navbar__actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .btn-icon-aura {
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon-aura:hover {
          color: var(--text-primary);
          border-color: var(--color-primary);
          background: var(--color-primary-muted);
        }
        .navbar__avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 2px solid var(--glass-border);
        }
        .navbar__avatar--placeholder {
          width: 32px;
          height: 32px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        .navbar__burger {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
        }
        .navbar__mobile {
          overflow: hidden;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
        }
        .navbar__mobile-link {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: 16px;
          color: var(--text-secondary);
          font-weight: 500;
          text-decoration: none;
        }
        .navbar__mobile-link--active {
          color: var(--color-primary);
          background: var(--color-primary-muted);
        }
        @media (max-width: 1024px) {
          .navbar__inner { gap: var(--space-4); }
        }
        @media (max-width: 768px) {
          .navbar__links { display: none; }
          .navbar__burger { display: block; }
        }
      `}</style>
    </header>
  )
}
