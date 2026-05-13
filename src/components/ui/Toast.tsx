'use client'

/**
 * `<Toast />` — одиночное toast-уведомление DS v2.
 *
 * Варианты: `success | error | info | warning`. Каждый вариант использует
 * строго семантические токены Design_System:
 *   - текст/граница/иконка  — `--success` | `--danger` | `--info` | `--warning`;
 *   - подложка              — `-soft`-вариант того же токена.
 *
 * Доступность (Req 20.5, 22.1):
 *   - `role="status"` для `info | success` (анонсируется вежливо, не прерывая),
 *   - `role="alert"`  для `error | warning` (анонсируется немедленно).
 *   - Кнопка закрытия — icon-only `IconButton` с `aria-label={t('common.close')}`.
 *
 * Хардкод-значения цвета / spacing / radius отсутствуют (Req 1.8).
 *
 * Компонент сам по себе не управляет auto-dismiss таймером — это делает
 * `<ToastProvider />`, который и монтирует/анмонтирует этот узел.
 */

import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastProps {
  /** Уникальный идентификатор тоста; прокидывается на корневой узел как `data-toast-id`. */
  id: string
  /** Вариант — определяет палитру и ARIA role. */
  variant: ToastVariant
  /** Заголовок (основная строка). */
  title?: string
  /** Опциональное описание второй строкой. */
  description?: string
  /** Callback закрытия (крестик). */
  onDismiss: (id: string) => void
  /** Опциональная иконка слева; если не задана, рендерится точка-индикатор цвета варианта. */
  icon?: ReactNode
  /** Дополнительный className на root. */
  className?: string
}

/**
 * Карта: variant → токены `fg` (цвет варианта) и `bg` (soft-подложка).
 * Значения — CSS-переменные Design_System; никакой хардкод.
 */
const VARIANT_TOKENS: Record<
  ToastVariant,
  { fg: string; bg: string }
> = {
  success: { fg: 'var(--success)', bg: 'var(--success-soft)' },
  error: { fg: 'var(--danger)', bg: 'var(--danger-soft)' },
  info: { fg: 'var(--info)', bg: 'var(--info-soft)' },
  warning: { fg: 'var(--warning)', bg: 'var(--warning-soft)' },
}

/**
 * `role="status"` — вежливое объявление (live region polite) для нейтральных
 * и положительных тостов; `role="alert"` — немедленное (assertive) объявление
 * для ошибок и предупреждений.
 */
const VARIANT_ROLE: Record<ToastVariant, 'status' | 'alert'> = {
  success: 'status',
  info: 'status',
  error: 'alert',
  warning: 'alert',
}

export function Toast({
  id,
  variant,
  title,
  description,
  onDismiss,
  icon,
  className,
}: ToastProps) {
  const { fg, bg } = VARIANT_TOKENS[variant]
  const role = VARIANT_ROLE[variant]
  const liveMode = role === 'alert' ? 'assertive' : 'polite'

  const rootStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    minWidth: 'calc(var(--space-32) * 2)',
    maxWidth: 'calc(var(--space-32) * 3)',
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    background: bg,
    border: `1px solid ${fg}`,
    color: fg,
    boxShadow: 'var(--shadow-2)',
    pointerEvents: 'auto',
  }

  const iconSlotStyle: CSSProperties = {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--space-6)',
    height: 'var(--space-6)',
    color: fg,
  }

  const defaultDotStyle: CSSProperties = {
    width: 'var(--space-2)',
    height: 'var(--space-2)',
    borderRadius: 'var(--radius-full)',
    background: fg,
  }

  const bodyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1,
    minWidth: 0,
  }

  const titleStyle: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.35,
    color: fg,
    margin: 0,
    wordBreak: 'break-word',
  }

  const descriptionStyle: CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    lineHeight: 1.45,
    color: 'var(--border-700)',
    margin: 0,
    wordBreak: 'break-word',
  }

  return (
    <div
      role={role}
      aria-live={liveMode}
      aria-atomic="true"
      data-ds="toast"
      data-toast-id={id}
      data-toast-variant={variant}
      className={cn(className)}
      style={rootStyle}
    >
      <span aria-hidden="true" style={iconSlotStyle}>
        {icon ?? <span style={defaultDotStyle} />}
      </span>
      <div style={bodyStyle}>
        {title ? <p style={titleStyle}>{title}</p> : null}
        {description ? <p style={descriptionStyle}>{description}</p> : null}
      </div>
      <IconButton
        aria-label={t('common.close')}
        variant="ghost"
        size="sm"
        onClick={() => onDismiss(id)}
        icon={<X size={16} aria-hidden="true" />}
      />
    </div>
  )
}
