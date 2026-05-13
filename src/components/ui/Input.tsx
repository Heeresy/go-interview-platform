'use client'

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Input — DS v2 text input primitive.
 *
 * Visual styling comes from DS tokens via `.ds-input` / `.ds-field*` classes in
 * globals.css. No hardcoded colors / px.
 *
 * Behaviour:
 *   - When `error` is truthy: sets `aria-invalid="true"` and wires
 *     `aria-describedby` to the error node, which is rendered directly below
 *     the control.
 *   - Visible focus-ring with ≥ 3:1 contrast (Requirement 11.3).
 *   - Min-height ≥ 44px on mobile (Requirement 11.8).
 *
 * Requirements: 1.8, 11.2, 11.3, 11.8, 22.1
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional visible label rendered above the input. */
  label?: ReactNode
  /** Optional hint text rendered below the input (not shown while `error` is present). */
  hint?: ReactNode
  /**
   * Error text. When non-empty, the input is marked `aria-invalid="true"` and
   * the text is rendered under the input with a matching `aria-describedby`.
   */
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    id,
    className,
    'aria-describedby': ariaDescribedByProp,
    'aria-invalid': ariaInvalidProp,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId()
  const inputId = id ?? `ds-input-${reactId}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  const hasError = typeof error === 'string' && error.length > 0
  const showHint = !hasError && hint !== undefined && hint !== null && hint !== ''

  const describedBy =
    [ariaDescribedByProp, hasError ? errorId : null, showHint ? hintId : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={cn('ds-field', className)}>
      {label !== undefined && label !== null && label !== '' ? (
        <label htmlFor={inputId} className="ds-field__label">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        type={type ?? 'text'}
        className="ds-input"
        aria-invalid={ariaInvalidProp ?? (hasError ? true : undefined)}
        aria-describedby={describedBy}
        {...rest}
      />
      {hasError ? (
        <p id={errorId} role="alert" className="ds-field__error">
          {error}
        </p>
      ) : showHint ? (
        <p id={hintId} className="ds-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
