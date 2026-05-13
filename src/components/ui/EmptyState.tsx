/**
 * `<EmptyState />` — унифицированный пустой стейт для списков и панелей
 * (Requirement 20.2).
 *
 * API:
 *   { icon, title, description, cta }
 *
 * - `icon`        — ReactNode (например, `<Inbox size={32} />` из `lucide-react`);
 *                   рендерится в круге с мягкой подложкой на `--surface-300`.
 * - `title`       — человеко-понятный заголовок, уже локализованный вызовом `t()`
 *                   на стороне потребителя.
 * - `description` — (опц.) пояснение, что произойдёт или что делать дальше.
 * - `cta`         — (опц.) ReactNode с основным действием (кнопкой).
 *
 * Токены: `--surface-{100,300}`, `--border-500`, `--radius-{full,lg}`,
 * `--space-*`, `--fs-{md,lg}`, `--fw-{regular,semibold}`. Хардкод-значения
 * цвета/spacing/radius отсутствуют (Requirement 1.8).
 *
 * Доступность: корневой контейнер `role="status"` с `aria-live="polite"`,
 * чтобы скринридер анонсировал пустой результат без прерывания работы.
 */

import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Иконка, уже настроенная на нужный размер (обычно 28–32px). */
  icon?: ReactNode
  /** Заголовок — короткое объяснение того, что экран пуст. */
  title: string
  /** Опциональное описание — что делать дальше. */
  description?: string
  /** Опциональный CTA (например, `<Button>Создать</Button>`). */
  cta?: ReactNode
  /** Дополнительный className (прокидывается на root). */
  className?: string
  /** Inline-стили (прокидываются на root). */
  style?: CSSProperties
}

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 'var(--space-3)',
  paddingBlock: 'var(--space-12)',
  paddingInline: 'var(--space-6)',
  color: 'var(--border-500)',
}

const ICON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'var(--space-16)',
  height: 'var(--space-16)',
  borderRadius: 'var(--radius-full)',
  background: 'var(--surface-300)',
  color: 'var(--border-700)',
  marginBottom: 'var(--space-2)',
}

const TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--fs-lg)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-800)',
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
}

const DESCRIPTION_STYLE: CSSProperties = {
  fontSize: 'var(--fs-md)',
  fontWeight: 'var(--fw-regular)',
  color: 'var(--border-500)',
  lineHeight: 1.5,
  maxWidth: 'calc(var(--space-32) * 4)',
}

const CTA_WRAPPER_STYLE: CSSProperties = {
  marginTop: 'var(--space-3)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
}

export function EmptyState({
  icon,
  title,
  description,
  cta,
  className,
  style,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-ds="empty-state"
      className={cn(className)}
      style={{ ...ROOT_STYLE, ...style }}
    >
      {icon ? (
        <span aria-hidden="true" style={ICON_STYLE}>
          {icon}
        </span>
      ) : null}
      <h2 style={TITLE_STYLE}>{title}</h2>
      {description ? <p style={DESCRIPTION_STYLE}>{description}</p> : null}
      {cta ? <div style={CTA_WRAPPER_STYLE}>{cta}</div> : null}
    </div>
  )
}
