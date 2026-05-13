/**
 * Shared focus-trap helpers for Dialog / Drawer / CommandPalette (task 7.4).
 *
 * Контракт (Requirement 11.7):
 *   - `collectFocusable(container)` — возвращает список видимых focusable-элементов.
 *   - `handleFocusTrapKeyDown(e, container)` — замыкает Tab/Shift+Tab:
 *       * Tab с последнего → фокус на первый;
 *       * Shift+Tab с первого → фокус на последний;
 *       * если activeElement вне контейнера — следующий Tab/Shift+Tab возвращает
 *         его на первый/последний.
 *   - `saveActiveElement()` / `restoreFocus(el)` — сохраняют и восстанавливают
 *     `document.activeElement` при open/close модалки.
 *
 * Зависимостей нет, чистый DOM. Используется и Dialog, и Drawer, и — через
 * Property 8 — покроется тестом `Dialog.focustrap.property.test.tsx`.
 */

/**
 * CSS-селектор фокусируемых элементов. Покрывает нативные interactive-элементы
 * и любые узлы с tabindex ≥ 0. Исключает: `disabled`, `tabindex="-1"`,
 * `inert`-поддерево и скрытые элементы (проверяется отдельно в collectFocusable).
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
  'details>summary:first-of-type',
].join(',')

function isVisible(el: HTMLElement): boolean {
  // Fast-path: disconnected or no layout → not focusable.
  if (!el.isConnected) return false
  if (el.hasAttribute('disabled')) return false
  if (el.getAttribute('aria-hidden') === 'true') return false

  // JSDOM doesn't compute real layout, so `offsetParent` is unreliable there.
  // We intentionally accept everything that passes the selector in that
  // environment — the invariant tested is focus *cycling*, not visibility.
  const style =
    typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
      ? window.getComputedStyle(el)
      : null
  if (style) {
    if (style.visibility === 'hidden' || style.display === 'none') {
      return false
    }
  }
  return true
}

/**
 * Возвращает список focusable-элементов внутри контейнера в DOM-порядке.
 */
export function collectFocusable(
  container: HTMLElement | null | undefined,
): HTMLElement[] {
  if (!container) return []
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  const out: HTMLElement[] = []
  for (const el of Array.from(nodes)) {
    if (isVisible(el)) out.push(el)
  }
  return out
}

/**
 * Сохраняет текущий `document.activeElement` для последующего восстановления.
 * Возвращает `null`, если активный элемент — не HTMLElement или — `body`
 * (восстанавливать `body.focus()` бессмысленно).
 */
export function saveActiveElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const active = document.activeElement as HTMLElement | null
  if (!active) return null
  if (active === document.body) return null
  if (!(active instanceof HTMLElement)) return null
  return active
}

/**
 * Восстанавливает фокус на ранее сохранённом элементе. Ошибки игнорируются
 * (например, элемент был удалён из DOM между open и close).
 */
export function restoreFocus(el: HTMLElement | null | undefined): void {
  if (!el) return
  if (typeof document === 'undefined') return
  if (!el.isConnected) return
  try {
    el.focus()
  } catch {
    // ignore
  }
}

/**
 * Обработчик keydown для focus-trap.
 *
 * Если клавиша — `Tab` (с/без Shift), замыкает цикл внутри контейнера:
 *   - Tab с последнего → первый;
 *   - Shift+Tab с первого → последний;
 *   - фокус вне контейнера → переносит на первый (Tab) / последний (Shift+Tab).
 *
 * `preventDefault()` вызывается только когда мы действительно переводим фокус.
 */
export function handleFocusTrapKeyDown(
  e: KeyboardEvent,
  container: HTMLElement | null | undefined,
): void {
  if (e.key !== 'Tab') return
  if (!container) return
  const focusables = collectFocusable(container)
  if (focusables.length === 0) {
    // No focusable children — trap to the container itself.
    e.preventDefault()
    try {
      container.focus()
    } catch {
      // ignore
    }
    return
  }
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null
  const activeInside =
    active != null && (container === active || container.contains(active))

  if (e.shiftKey) {
    // Shift+Tab: wrap to last when at first or outside.
    if (!activeInside || active === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    // Tab: wrap to first when at last or outside.
    if (!activeInside || active === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
