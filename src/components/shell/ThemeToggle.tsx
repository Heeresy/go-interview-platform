'use client'

/**
 * ThemeToggle — UI-контрол переключения темы.
 *
 * Построен на `IconButton` из Design System v2: иконка Moon/Sun из
 * `lucide-react`, локализованный `aria-label` через `t('a11y.toggleTheme')`.
 *
 * a11y:
 *  - `aria-pressed={theme === 'light'}` — контрол сообщает скринридерам
 *    текущее состояние переключателя;
 *  - видимый `aria-label` локализован, иконка `aria-hidden` унаследована
 *    от `IconButton`.
 *
 * Поведение:
 *  - клик инвертирует тему (`dark → light`, `light → dark`);
 *  - вся бизнес-логика смены (запись в localStorage + аналитика) живёт
 *    в `ThemeProvider.setTheme`; компонент — только представление.
 *
 * Requirements: 2.1, 2.8, 25.3, 25.5, 25.6
 */

import { Moon, Sun } from 'lucide-react'
import { IconButton, type IconButtonProps } from '@/components/ui/IconButton'
import { t } from '@/lib/i18n'
import { useTheme } from './ThemeProvider'

export type ThemeToggleProps = Omit<
  IconButtonProps,
  'icon' | 'aria-label' | 'aria-pressed' | 'onClick'
>

export function ThemeToggle(props: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <IconButton
      {...props}
      icon={isLight ? <Sun size={18} /> : <Moon size={18} />}
      aria-label={t('a11y.toggleTheme')}
      aria-pressed={isLight}
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
    />
  )
}
