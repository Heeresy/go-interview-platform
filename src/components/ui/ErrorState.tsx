'use client'

/**
 * `<ErrorState />` — унифицированный error state для DS v2
 * (Requirement 20.3, 22.1, 24.2).
 *
 * API:
 *   { messageKey, retry? }
 *
 * - `messageKey` — типизированный ключ словаря `src/lib/i18n/ru.ts`
 *                  (`TranslationKey`). Строка получается через `t(messageKey)`,
 *                  чтобы соблюсти Requirement 24.2 (никакого хардкода строк в UI).
 * - `retry`      — (опц.) callback, отображающий встроенную кнопку «Повторить».
 *                  Если не передан, кнопка не рендерится.
 *
 * Визуально состояние использует семантический `--danger` токен для цвета
 * текста/иконки/рамки (Requirement 1.8: только токены Design_System).
 *
 * Доступность: контейнер объявлен как `role="alert"` с `aria-live="assertive"`,
 * чтобы скринридер немедленно анонсировал сбой.
 */

import type { CSSProperties, ReactNode } from 'react'
import { t, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  /** Ключ словаря i18n для основного сообщения об ошибке. */
  messageKey: TranslationKey
  /** Опциональный handler для кнопки «Повторить». Если не передан — кнопка скрыта. */
  retry?: () => void
  /** Опциональная иконка слева от текста. По умолчанию показывается ⚠️-глиф. */
  icon?: ReactNode
  /** Дополнительный className (прокидывается на root). */
  className?: string
  /** Inline-стили (прокидываются на root). */
  style?: CSSProperties
}

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-3)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--danger-soft)',
  border: '1px solid var(--danger)',
  color: 'var(--danger)',
}

const ICON_STYLE: CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'var(--space-6)',
  height: 'var(--space-6)',
  color: 'var(--danger)',
  fontSize: 'var(--fs-md)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1,
}

const BODY_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  flex: 1,
  minWidth: 0,
}

const MESSAGE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  lineHeight: 1.5,
  color: 'var(--danger)',
  margin: 0,
}

const BUTTON_STYLE: CSSProperties = {
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  minHeight: 'var(--space-11)',
  paddingBlock: 'var(--space-2)',
  paddingInline: 'var(--space-4)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--danger)',
  background: 'transparent',
  color: 'var(--danger)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1,
  cursor: 'pointer',
  transition:
    'background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
}

// Default inline fallback glyph (no external icon dependency).
// Consumers may override via the `icon` prop.
const DEFAULT_ICON: ReactNode = (
  <span aria-hidden="true" style={ICON_STYLE}>
    !
  </span>
)

export function ErrorState({
  messageKey,
  retry,
  icon,
  className,
  style,
}: ErrorStateProps) {
  const message = t(messageKey)
  const retryLabel = t('common.retry')

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-ds="error-state"
      className={cn(className)}
      style={{ ...ROOT_STYLE, ...style }}
    >
      {icon === undefined ? (
        DEFAULT_ICON
      ) : icon === null ? null : (
        <span aria-hidden="true" style={ICON_STYLE}>
          {icon}
        </span>
      )}
      <div style={BODY_STYLE}>
        <p style={MESSAGE_STYLE}>{message}</p>
        {retry ? (
          <button type="button" onClick={retry} style={BUTTON_STYLE}>
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
