'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * IconButton — square button that renders a single icon.
 *
 * Design System v2 primitive. All visual styling comes from DS tokens via
 * `.ds-icon-btn` / `.ds-icon-btn--{variant,size}` classes in globals.css.
 * No hardcoded colors / px.
 *
 * a11y:
 *   - `aria-label` is REQUIRED (icon-only button must have accessible name).
 *   - Visible focus-ring with ≥ 3:1 contrast (Requirement 11.3).
 *   - Touch-target ≥ 44×44 on mobile (Requirement 11.8) via media query.
 *
 * Requirements: 1.8, 11.2, 11.3, 11.8, 22.1
 */
export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Icon node rendered inside the button. */
  icon: ReactNode
  /** Required accessible name for the icon-only control. */
  'aria-label': string
  /** Visual variant. Defaults to `secondary`. */
  variant?: IconButtonVariant
  /** Size preset. Defaults to `md`. */
  size?: IconButtonSize
}

const variantClass: Record<IconButtonVariant, string> = {
  primary: 'ds-icon-btn--primary',
  secondary: 'ds-icon-btn--secondary',
  ghost: 'ds-icon-btn--ghost',
  danger: 'ds-icon-btn--danger',
}

const sizeClass: Record<IconButtonSize, string> = {
  sm: 'ds-icon-btn--sm',
  md: 'ds-icon-btn--md',
  lg: 'ds-icon-btn--lg',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, variant = 'secondary', size = 'md', type, className, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn('ds-icon-btn', variantClass[variant], sizeClass[size], className)}
        {...rest}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex' }}>
          {icon}
        </span>
      </button>
    )
  },
)
