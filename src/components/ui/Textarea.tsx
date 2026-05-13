'use client'

import {
  forwardRef,
  useId,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Textarea — DS v2 multi-line text input primitive.
 *
 * Same contract as Input for the error state: when `error` is truthy, sets
 * `aria-invalid="true"` and wires `aria-describedby` to the error node,
 * which is rendered directly below the control.
 *
 * Visual styling comes from DS tokens via `.ds-textarea` / `.ds-field*`
 * classes in globals.css. No hardcoded colors / px.
 *
 * a11y:
 *   - Visible focus-ring with ≥ 3:1 contrast (Requirement 11.3).
 *   - Min-height ≥ 44px (Requirement 11.8).
 *
 * Requirements: 1.8, 11.2, 11.3, 11.8, 22.1
 */
export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Optional visible label rendered above the textarea. */
  label?: ReactNode
  /** Optional hint text rendered below the textarea (not shown while `error` is present). */
  hint?: ReactNode
  /**
   * Error text. When non-empty, the textarea is marked `aria-invalid="true"`
   * and the text is rendered under the textarea with a matching
   * `aria-describedby`.
   */
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      hint,
      error,
      id,
      className,
      'aria-describedby': ariaDescribedByProp,
      'aria-invalid': ariaInvalidProp,
      rows,
      ...rest
    },
    ref,
  ) {
    const reactId = useId()
    const textareaId = id ?? `ds-textarea-${reactId}`
    const errorId = `${textareaId}-error`
    const hintId = `${textareaId}-hint`

    const hasError = typeof error === 'string' && error.length > 0
    const showHint = !hasError && hint !== undefined && hint !== null && hint !== ''

    const describedBy =
      [ariaDescribedByProp, hasError ? errorId : null, showHint ? hintId : null]
        .filter(Boolean)
        .join(' ') || undefined

    return (
      <div className={cn('ds-field', className)}>
        {label !== undefined && label !== null && label !== '' ? (
          <label htmlFor={textareaId} className="ds-field__label">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows ?? 4}
          className="ds-textarea"
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
  },
)
