'use client'

/**
 * Button — DS v2 primitive control.
 *
 * Spec: UI Redesign 2026 — task 6.1.
 *
 * Варианты: `primary | secondary | ghost | danger`.
 * Размеры:  `sm | md | lg`.
 * Состояния: `disabled`, `loading`.
 *
 * Поведение (Requirements 1.8, 11.3, 11.8, 20.4, 20.5, 22.1):
 *
 * - Только токены Design_System через CSS-класс `.ds-btn` и его модификаторы.
 *   Инлайн-цветов, spacing и radius в TSX нет (Req 1.8).
 * - Touch-target ≥ 44×44 на мобайле — обеспечивается `min-height/min-width`
 *   в Button.css, равными `var(--space-11)` (44px) для всех размеров
 *   (Req 11.8).
 * - Видимый focus-ring через `:focus-visible` (outline 2px + мягкое halo),
 *   построенный из `--accent-600`; контраст ≥ 3:1 обеспечен акцентной шкалой
 *   Design_System (Req 11.3).
 * - Состояние `loading` строго локализовано в инстансе кнопки (Req 20.5):
 *   если пропс `loading` не передан, компонент сам держит свой
 *   `internalLoading` в `useState` и переключает его через Promise,
 *   возвращённый `onClick`. Глобального loading-флага нет. Соседние кнопки
 *   остаются полностью интерактивными и могут быть нажаты параллельно.
 * - При `loading=true` повторный клик блокируется на двух уровнях (Req 20.4):
 *     (1) атрибут `disabled` — браузер не отправляет click-событие;
 *     (2) ранний выход в `handleClick`, защита на случай программного вызова
 *         `.click()` на кнопке, у которой disabled ещё не применился.
 *   Атрибуты `aria-busy="true"` и `aria-disabled="true"` сообщают скрин-
 *   ридерам о недоступности элемента на время загрузки.
 * - Спиннер рендерится как SVG-иконка, синхронно заменяющая `leftIcon`
 *   (или добавляющаяся перед лейблом, если `leftIcon` отсутствует), чтобы
 *   layout не «прыгал» при переходе в/из loading-состояния.
 */

import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Визуальный вариант. По умолчанию `primary`. */
  variant?: ButtonVariant
  /** Размер. По умолчанию `md`. */
  size?: ButtonSize
  /**
   * Управляемое loading-состояние. Если передано, компонент использует
   * этот флаг. Если опущено, компонент сам отслеживает loading только на
   * время выполнения возвращённого из `onClick` Promise.
   */
  loading?: boolean
  /**
   * Растянуть на всю доступную ширину контейнера. По умолчанию `false`.
   */
  fullWidth?: boolean
  /** Иконка слева от лейбла. На `loading` заменяется на спиннер. */
  leftIcon?: ReactNode
  /** Иконка справа от лейбла. */
  rightIcon?: ReactNode
  /**
   * Хэндлер клика. Может вернуть `Promise`; в этом случае компонент
   * автоматически держит внутренний `loading=true` до его резолва/реджекта.
   * Возврат `false` также игнорируется как «клик проигнорирован».
   */
  onClick?: (
    e: MouseEvent<HTMLButtonElement>
  ) => void | Promise<unknown>
}

/**
 * Мини-спиннер для `loading`-состояния. Цвет берётся из `currentColor`,
 * т.е. наследуется от варианта; анимация — чистый CSS из Button.css с
 * длительностью-токеном `--dur-dramatic`.
 */
function Spinner() {
  return (
    <span
      className="ds-btn__spinner"
      aria-hidden="true"
      data-testid="ds-btn-spinner"
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading: loadingProp,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      type,
      onClick,
      children,
      'aria-busy': ariaBusyProp,
      'aria-disabled': ariaDisabledProp,
      ...rest
    },
    ref,
  ) {
    // Loading-state локален строго к инстансу (Req 20.5): каждая кнопка
    // держит собственный useState, без какого-либо глобального/контекстного
    // шаринга. Соседние кнопки не знают друг о друге.
    const [internalLoading, setInternalLoading] = useState(false)

    // Если пропс `loading` управляется снаружи — он имеет приоритет;
    // иначе используется собственное состояние.
    const isLoading = loadingProp ?? internalLoading

    const isDisabled = disabled === true
    // На loading-состоянии кнопка обязана быть нефокусируемо-кликабельной
    // для мыши (Req 20.4): выставляем `disabled` атрибут и ранний return
    // в обработчике click.
    const isInert = isDisabled || isLoading

    // Предохранитель от повторного входа в onClick, даже если браузер
    // почему-то пропустил disabled (например, программный `.click()`
    // между рендерами).
    const inFlightRef = useRef(false)

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (isInert || inFlightRef.current) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (!onClick) return

        let result: ReturnType<NonNullable<ButtonProps['onClick']>>
        try {
          result = onClick(e)
        } catch (err) {
          // Sync throw — ничего не переключаем, просто пробрасываем.
          throw err
        }

        if (
          result &&
          typeof (result as Promise<unknown>).then === 'function'
        ) {
          // Async onClick — берём loading только если родитель не
          // контролирует его самостоятельно (Req 20.5). Это
          // гарантирует, что состояние живёт в инстансе кнопки.
          if (loadingProp === undefined) {
            inFlightRef.current = true
            setInternalLoading(true)
            ;(result as Promise<unknown>).finally(() => {
              inFlightRef.current = false
              setInternalLoading(false)
            })
          } else {
            // Управляемый режим: родитель сам переключает `loading`.
            // Защита от повторного входа всё равно работает через
            // inFlightRef на время жизни конкретного Promise.
            inFlightRef.current = true
            ;(result as Promise<unknown>).finally(() => {
              inFlightRef.current = false
            })
          }
        }
      },
      [isInert, loadingProp, onClick],
    )

    const classes = cn(
      'ds-btn',
      `ds-btn--${variant}`,
      `ds-btn--${size}`,
      fullWidth && 'ds-btn--full',
      isLoading && 'ds-btn--loading',
      className,
    )

    const leadingSlot = isLoading ? (
      <Spinner />
    ) : leftIcon ? (
      <span className="ds-btn__icon" aria-hidden="true">
        {leftIcon}
      </span>
    ) : null

    const trailingSlot = rightIcon ? (
      <span className="ds-btn__icon" aria-hidden="true">
        {rightIcon}
      </span>
    ) : null

    return (
      <button
        {...rest}
        ref={ref}
        // Всегда задаём type, иначе кнопка внутри <form> триггерит сабмит.
        type={type ?? 'button'}
        className={classes}
        disabled={isInert}
        // ARIA (Req 20.4): aria-busy объявляет loading-состояние
        // скрин-ридерам; aria-disabled дублирует отключение для AT,
        // которые не учитывают нативный `disabled` (старые JAWS-версии).
        aria-busy={ariaBusyProp ?? (isLoading ? true : undefined)}
        aria-disabled={
          ariaDisabledProp ?? (isInert ? true : undefined)
        }
        data-variant={variant}
        data-size={size}
        data-loading={isLoading ? 'true' : undefined}
        onClick={handleClick}
      >
        {leadingSlot}
        {children != null && (
          <span className="ds-btn__label">{children}</span>
        )}
        {trailingSlot}
      </button>
    )
  },
)

export default Button
