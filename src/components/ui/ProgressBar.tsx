/**
 * `<ProgressBar />` — линейный индикатор прогресса для DS v2
 * (Requirements 1.8, 20.1, 22.1, 24.2).
 *
 * API:
 *   { value: number, label?: string }
 *
 * - `value` — число в диапазоне `[0..1]`. Значения за пределами
 *   диапазона и `NaN` мягко клэмпаются в `[0, 1]`, чтобы компонент
 *   никогда не рендерил «поломанный» bar (например, fill 120% или NaN%).
 * - `label` — (опц.) человеко-понятная подпись над индикатором,
 *   уже локализованная на стороне потребителя через `t()`
 *   (Requirement 24.2: никакого хардкода строк в UI).
 *
 * Доступность (Requirement 11.6, 20.1):
 *   - `role="progressbar"`;
 *   - `aria-valuemin="0"`, `aria-valuemax="100"`,
 *     `aria-valuenow` — целое число процентов (0..100);
 *   - `aria-label` / `aria-labelledby` связывается с `label`,
 *     если он передан; иначе потребитель обязан пробросить
 *     свой `aria-label` через `...rest`.
 *   - `aria-valuetext` дублирует прогресс в виде «NN%» для
 *     скринридеров, не умеющих озвучивать `aria-valuenow` в процентах.
 *
 * Токены: `--surface-300` (track), `--accent-600` (fill), `--border-800`
 * (label), `--radius-full`, `--space-*`, `--fs-sm`, `--fw-medium`,
 * `--dur-base`, `--ease-standard`. Хардкод-значений цвета, spacing или
 * radius нет (Requirement 1.8).
 */

import type { CSSProperties, HTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
  /** Значение прогресса в диапазоне `[0..1]`. Выход за пределы клэмпается. */
  value: number
  /** Опциональная подпись над индикатором (локализованная строка). */
  label?: string
}

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  width: '100%',
}

const LABEL_STYLE: CSSProperties = {
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--border-800)',
  lineHeight: 1.3,
  margin: 0,
}

const TRACK_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 'var(--space-2)',
  borderRadius: 'var(--radius-full)',
  background: 'var(--surface-300)',
  overflow: 'hidden',
}

const FILL_BASE_STYLE: CSSProperties = {
  height: '100%',
  borderRadius: 'var(--radius-full)',
  background: 'var(--accent-600)',
  transition:
    'width var(--dur-base) var(--ease-standard)',
  willChange: 'width',
}

/**
 * Мягкий clamp: `NaN` → 0, <0 → 0, >1 → 1. Не кидает исключение, чтобы
 * не обрушить дерево из-за одного «плохого» значения с бэкенда.
 */
function clamp01(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

export function ProgressBar({
  value,
  label,
  className,
  style,
  id: idProp,
  'aria-label': ariaLabelProp,
  'aria-labelledby': ariaLabelledByProp,
  ...rest
}: ProgressBarProps) {
  const fraction = clamp01(value)
  // Целые проценты — стабильное значение для скринридеров и для
  // сравнения в тестах. Визуально ширина задаётся той же величиной.
  const percent = Math.round(fraction * 100)

  const generatedLabelId = useId()
  const labelId = label ? idProp ?? generatedLabelId : undefined

  // Если есть видимый label — связываем через aria-labelledby.
  // Если label нет и потребитель не передал aria-label —
  // оставляем компонент без имени (это ответственность вызывающего).
  const ariaLabelledBy = label
    ? ariaLabelledByProp ?? labelId
    : ariaLabelledByProp
  const ariaLabel = label ? undefined : ariaLabelProp

  return (
    <div
      {...rest}
      className={cn(className)}
      style={{ ...ROOT_STYLE, ...style }}
      data-ds="progress-bar"
    >
      {label ? (
        <p id={labelId} style={LABEL_STYLE}>
          {label}
        </p>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        style={TRACK_STYLE}
      >
        <div
          aria-hidden="true"
          data-ds="progress-bar-fill"
          style={{ ...FILL_BASE_STYLE, width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
