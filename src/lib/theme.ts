/**
 * Theme_Manager — источник истины для темы UI Redesign 2026.
 *
 * Модуль экспортирует типы/константы и чистые утилиты для:
 * - валидации значения темы;
 * - безопасной проверки доступности `localStorage`;
 * - чтения/записи значения в `localStorage` (с авто-восстановлением
 *   повреждённых значений при доступном хранилище);
 * - применения темы к `document.documentElement.dataset.theme`.
 *
 * Инвариант «`localStorage` всегда соответствует применённой теме
 * при доступности хранилища» держится единственной точкой смены темы —
 * `ThemeProvider.setTheme`, которая атомарно вызывает `applyTheme` +
 * `setStoredTheme`. Вспомогательные пути (`getStoredTheme` при
 * невалидном значении и inline-bootstrap в `RootLayout`) также
 * выполняют оба действия атомарно.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

export type Theme = 'dark' | 'light'

export const THEME_KEY = 'theme'
export const DEFAULT_THEME: Theme = 'dark'

/**
 * Type guard: значение — валидная тема (`"dark"` или `"light"`).
 */
export function isValidTheme(v: unknown): v is Theme {
  return v === 'dark' || v === 'light'
}

/**
 * Проверяет доступность `window.localStorage` через test-write + removeItem.
 *
 * Возвращает `false` при любой из причин:
 * - SSR / `window` не определён;
 * - `localStorage` недоступен (private browsing, политика браузера);
 * - `setItem` кинул (превышена квота, permission denied и т.п.).
 *
 * Не логирует ошибки — вызов безопасен в любом окружении (Requirement 2.3).
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const storage = window.localStorage
    if (!storage) return false
    const probeKey = '__theme_probe__'
    storage.setItem(probeKey, '1')
    storage.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

/**
 * Читает тему из `localStorage` и возвращает валидное значение.
 *
 * Контракт:
 * - если `localStorage` недоступен — возвращает `DEFAULT_THEME` без сайд-эффектов;
 * - если значение отсутствует / повреждено / невалидно — перезаписывает
 *   его на `DEFAULT_THEME` (поддержка Requirements 2.5 и 2.6) и возвращает
 *   `DEFAULT_THEME`;
 * - если значение валидно — возвращает его как есть.
 */
export function getStoredTheme(): Theme {
  if (!isStorageAvailable()) return DEFAULT_THEME

  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    if (isValidTheme(raw)) return raw

    // Отсутствующее / повреждённое / невалидное значение — перезаписываем
    // на дефолт, чтобы сохранить инвариант Requirement 2.7.
    try {
      window.localStorage.setItem(THEME_KEY, DEFAULT_THEME)
    } catch {
      // Хранилище внезапно стало недоступно между probe и записью —
      // Requirement 2.3: никаких throw, никаких console.error.
    }
    return DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/**
 * Сохраняет тему в `localStorage`.
 *
 * Requirement 2.3: если хранилище недоступно — no-op, без throw
 * и без `console.error`. Именно эта функция — единственная точка
 * записи; любые сбои глотаются здесь.
 */
export function setStoredTheme(t: Theme): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_KEY, t)
  } catch {
    // Namespaced no-op: private mode, квота, политика браузера.
  }
}

/**
 * Применяет тему к корневому `<html>` через `data-theme` (Requirement 2.8).
 *
 * Вызов безопасен и в SSR-контексте: при отсутствии `document`
 * функция молча завершает работу.
 */
export function applyTheme(t: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = t
}
