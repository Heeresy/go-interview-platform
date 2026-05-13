/**
 * `<Badge />` — компактная метка для статуса/категории в DS v2
 * (Requirements 1.8, 22.1).
 *
 * API:
 *   { variant, children }
 *
 * - `variant` — один из:
 *     - `neutral` — нейтральный (на `--surface-300` / `--border-800`);
 *     - `success` — семантический `--success` с мягкой подложкой;
 *     - `warning` — семантический `--warning` с мягкой подложкой;
 *     - `danger`  — семантический `--danger` с мягкой подложкой;
 *     - `info`    — семантический `--info` с мягкой подложкой.
 * - `children` — содержимое метки (обычно короткий текст или цифра),
 *   уже локализованное потребителем через `t()` (Requirement 24.2).
 *
 * Токены: `--surface-300`, `--border-{500,800}`, `--success(-soft)`,
 * `--warning(-soft)`, `--danger(-soft)`, `--info(-soft)`, `--radius-full`,
 * `--space-*`, `--fs-xs`, `--fw-semibold`. Хардкод-значений цвета,
 * spacing или radius нет (Requirement 1.8).
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Визуальный вариант. По умолчанию `neutral`. */
  variant?: BadgeVariant
  /** Контент метки. */
  children: ReactNode
}

const BASE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-1)',
  // Padding задаёт высоту; height-авто-подстройка под `--fs-xs`.
  paddingBlock: 'var(--space-1)',
  paddingInline: 'var(--space-2)',
  borderRadius: 'var(--radius-full)',
  border: '1px solid transparent',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1,
  letterSpacing: '0.01em',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}

const VARIANT_STYLE: Record<BadgeVariant, CSSProperties> = {
  neutral: {
    background: 'var(--surface-300)',
    color: 'var(--border-800)',
    borderColor: 'var(--border-200)',
  },
  success: {
    background: 'var(--success-soft)',
    color: 'var(--success-strong)',
    borderColor: 'var(--success)',
  },
  warning: {
    background: 'var(--warning-soft)',
    color: 'var(--warning-strong)',
    borderColor: 'var(--warning)',
  },
  danger: {
    background: 'var(--danger-soft)',
    color: 'var(--danger-strong)',
    borderColor: 'var(--danger)',
  },
  info: {
    background: 'var(--info-soft)',
    color: 'var(--info-strong)',
    borderColor: 'var(--info)',
  },
}

export function Badge({
  variant = 'neutral',
  children,
  className,
  style,
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(className)}
      data-ds="badge"
      data-variant={variant}
      style={{ ...BASE_STYLE, ...VARIANT_STYLE[variant], ...style }}
    >
      {children}
    </span>
  )
}

export default Badge
