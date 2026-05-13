'use client'

/**
 * ThemeProvider — клиентский контекст темы UI Redesign 2026.
 *
 * Обязанности:
 *  - хранит активную тему (`"dark" | "light"`) как React state;
 *  - читает initial state из `document.documentElement.dataset.theme`,
 *    который уже проставлен inline-bootstrap-скриптом в `RootLayout`
 *    до первой отрисовки (Requirement 2.4 — no FOUC). Если dataset
 *    отсутствует или невалиден, fallback — `getStoredTheme()`.
 *  - экспонирует `setTheme(t)` через `useTheme()`.
 *
 * Контракт `setTheme(t)` (Requirements 25.5, 25.6):
 *  1. Если `t === currentTheme` — ранний выход: **никаких** записей в
 *     `localStorage` и **никаких** вызовов аналитики.
 *  2. Иначе атомарно: `applyTheme(t)` → `setStoredTheme(t)` (try/catch
 *     внутри, Req 2.3) → emit аналитики события `theme_changed`
 *     с `{ theme: t }` (Req 25.5).
 *
 * Инвариант Requirement 2.7 (localStorage ↔ applied theme) держится
 * за счёт единственной точки смены — этого `setTheme`.
 *
 * Requirements: 2.1, 2.3, 2.7, 2.8, 25.3, 25.5, 25.6
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_THEME,
  applyTheme,
  getStoredTheme,
  isValidTheme,
  setStoredTheme,
  type Theme,
} from '@/lib/theme'
import { trackEvent } from '@/lib/analytics'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Читает initial state темы с учётом bootstrap-скрипта.
 *
 * Приоритет:
 *  1. `document.documentElement.dataset.theme`, если валиден (выставлен
 *     inline-bootstrap в `layout.tsx` до гидратации);
 *  2. `getStoredTheme()` — защищённое чтение `localStorage`;
 *  3. `DEFAULT_THEME` (dark).
 *
 * SSR-safe: во время серверного рендера `document` недоступен — возвращаем
 * `DEFAULT_THEME`, а после mount синхронизируемся с DOM через `useEffect`.
 */
function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME
  const fromDataset = document.documentElement.dataset.theme
  if (isValidTheme(fromDataset)) return fromDataset
  return getStoredTheme()
}

export interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Lazy initializer вычисляет тему один раз при монтировании.
  // На сервере вернётся `DEFAULT_THEME`; на клиенте — значение из dataset,
  // проставленное bootstrap-скриптом (no FOUC).
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  // Edge-case синхронизации: если после hydration состояние React
  // разошлось с `dataset.theme` (например, bootstrap выставил "light",
  // а SSR отрисовал "dark"), приводим dataset к state React ОДИН РАЗ
  // на mount. Это закрывает инвариант Requirement 2.8.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const current = document.documentElement.dataset.theme
    if (!isValidTheme(current) || current !== theme) {
      applyTheme(theme)
    }
    // Запускается только на mount — зависимости намеренно пусты,
    // дальнейшие смены темы идут через setTheme и сами вызывают applyTheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTheme = useCallback(
    (next: Theme) => {
      // Req 25.6: «переключение» на то же значение — полный no-op.
      // Никаких побочных эффектов: ни записи в localStorage,
      // ни события аналитики.
      if (next === theme) return

      // Req 25.5 и 2.7: атомарная смена темы.
      // Порядок важен: сначала применяем к DOM (визуально — мгновенно),
      // затем пишем в storage (может быть no-op при недоступности),
      // затем эмитим аналитику с уже применённым значением.
      applyTheme(next)
      setStoredTheme(next)
      trackEvent('theme_changed', { theme: next })

      setThemeState(next)
    },
    [theme],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Хук доступа к теме. Должен вызываться внутри `<ThemeProvider>`.
 *
 * Если провайдер не смонтирован, выбрасывает явную ошибку — это
 * указывает на баг компоновки (например, `ThemeToggle` рендерится вне
 * дерева `<ThemeProvider>`), а не на runtime-состояние пользователя.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return ctx
}
