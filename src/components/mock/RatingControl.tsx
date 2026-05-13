'use client'

/**
 * `<RatingControl />` — интерактивный 5-звёздочный контрол рейтинга
 * для `Mock_Module` (task 20.3; Requirements 17.1, 17.5, 10.8, 1.8,
 * 22.1, 24.2).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       value?: number;                           // 0..5
 *       onChange?: (n: number) => Promise<void>;
 *       disabled?: boolean;
 *     }
 *
 *   Поведение:
 *
 *   - 5 кнопок-звёзд (`<button type="button">`) с `aria-label` через
 *     `t('mock.rating.starAriaLabel', { value })`. Заполнение —
 *     по `Math.round(currentValue)`.
 *
 *   - Управляемый/неуправляемый режим: если передан `value` — он имеет
 *     приоритет; иначе компонент держит собственный `selectedValue`
 *     в `useState`. После успешного `onChange` обновляется
 *     `selectedValue` (для неуправляемого режима) и проигрывается
 *     pulse-анимация на конкретной звезде.
 *
 *   - При клике вызывается `onChange(n)`. До резолва — `pending=true`,
 *     все звёзды disabled (Req 20.4 — повторный клик блокирован).
 *     После успешного резолва:
 *       1) `pending=false`;
 *       2) выводится `toast(t('mock.rating.saved'), variant: 'success')`
 *          через `useToast()` (Req 20.5);
 *       3) триггерится pulse-микро-анимация на нажатой звезде через
 *          framer-motion (`scale` + `opacity` в одном кадре).
 *     При reject Promise:
 *       1) `pending=false`;
 *       2) выводится toast c `state.error.unknown`, variant: 'error';
 *       3) анимация подтверждения **не** проигрывается (значение не
 *          сохранено).
 *
 *   - Reduced motion (Req 10.8): длительность pulse-анимации
 *     переключается в 0 через `reduced(duration.fast, 0)`. Узел
 *     `motion.*` остаётся технически активным, конечный визуальный
 *     результат идентичен — мгновенное подтверждение без промежуточных
 *     кадров.
 *
 *   - Disabled (внешний пропс): полностью блокирует клики. Звёзды
 *     остаются видимыми, но не реагируют на ввод. Состояние pending
 *     также блокирует звёзды (как dim-disabled).
 *
 *   - Все строки UI — через `t()` (Req 24.2).
 *   - Стили — только токены DS (Req 1.8). Никаких `#xxx` / `rgb()` /
 *     px-литералов.
 *   - Touch-target ≥ 44×44 на мобайле через `min-width`/`min-height`
 *     = `var(--space-11)` (Req 11.8).
 */

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import {
  useCallback,
  useState,
  type CSSProperties,
} from 'react'

import { useToast } from '@/components/ui'
import { t } from '@/lib/i18n'
import { duration, easing, reduced } from '@/lib/motion'

// ── Public API ──────────────────────────────────────────────────────────

export interface RatingControlProps {
  /** Текущее значение рейтинга (0..5). Если undefined — компонент работает в неуправляемом режиме. */
  value?: number
  /**
   * Async callback на изменение значения. Должен вернуть Promise:
   * на время его resolve компонент сам показывает pending-состояние,
   * блокирует повторные клики и проигрывает pulse-анимацию подтверждения
   * после resolve.
   */
  onChange?: (n: number) => Promise<void>
  /** Полностью отключает контрол. */
  disabled?: boolean
  /** Дополнительный className на корневой контейнер. */
  className?: string
}

// ── Constants ───────────────────────────────────────────────────────────

const STAR_COUNT = 5

// ── Styles (tokens only; Req 1.8) ───────────────────────────────────────

const ROOT_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  minWidth: 0,
}

const STAR_BUTTON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 'var(--space-11)',
  minHeight: 'var(--space-11)',
  padding: 'var(--space-2)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--warning-strong)',
  cursor: 'pointer',
  transition:
    'background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
}

const STAR_BUTTON_DISABLED_STYLE: CSSProperties = {
  ...STAR_BUTTON_STYLE,
  cursor: 'not-allowed',
  opacity: 0.6,
}

const STAR_ICON_FILLED_STYLE: CSSProperties = {
  color: 'var(--warning-strong)',
  fill: 'var(--warning-strong)',
}

const STAR_ICON_EMPTY_STYLE: CSSProperties = {
  color: 'var(--border-300)',
  fill: 'transparent',
}

// ── Component ───────────────────────────────────────────────────────────

export function RatingControl({
  value: valueProp,
  onChange,
  disabled = false,
  className,
}: RatingControlProps) {
  // Неуправляемый режим: собственное состояние, инициализированное из
  // `valueProp` на mount. После успешного onChange также обновляется
  // здесь, чтобы UI отражал последнее подтверждённое значение.
  const [internalValue, setInternalValue] = useState<number>(() =>
    sanitizeValue(valueProp),
  )
  // Pending-состояние: блокирует повторные клики, пока resolve onChange
  // не отработал (Req 20.4).
  const [pending, setPending] = useState<boolean>(false)
  // Индекс звезды, на которой нужно проиграть pulse после успешного
  // resolve. `null` — анимация не активна.
  const [pulseIndex, setPulseIndex] = useState<number | null>(null)

  const toast = useToast().toast

  const currentValue =
    valueProp === undefined ? internalValue : sanitizeValue(valueProp)

  const handleClick = useCallback(
    async (selected: number) => {
      if (disabled || pending) return
      if (!onChange) {
        // Без callback'а просто обновляем неуправляемое значение.
        setInternalValue(selected)
        setPulseIndex(selected - 1)
        return
      }

      setPending(true)
      try {
        await onChange(selected)
        // Успех: обновляем неуправляемое значение, тостим, играем pulse.
        if (valueProp === undefined) setInternalValue(selected)
        setPulseIndex(selected - 1)
        toast({
          variant: 'success',
          title: t('mock.rating.saved'),
        })
      } catch {
        // Reject: pulse не проигрываем, выдаём error-toast.
        toast({
          variant: 'error',
          title: t('state.error.unknown'),
        })
      } finally {
        setPending(false)
      }
    },
    [disabled, pending, onChange, valueProp, toast],
  )

  // Длительность pulse: при reduced motion → 0, иначе fast (160ms).
  // Узел motion.* остаётся активным, конечное состояние идентично
  // (Req 10.8).
  const pulseDuration = reduced(duration.fast, 0)

  const filledCount = Math.round(currentValue)

  return (
    <div
      className={className}
      style={ROOT_STYLE}
      data-ds="rating-control"
      data-value={currentValue}
      data-pending={pending ? 'true' : undefined}
      data-testid="rating-control"
      role="radiogroup"
      aria-label={t('mock.rating.label')}
    >
      {Array.from({ length: STAR_COUNT }).map((_, i) => {
        const starValue = i + 1
        const filled = i < filledCount
        const isPulsing = pulseIndex === i
        const isInert = disabled || pending
        const buttonStyle = isInert
          ? STAR_BUTTON_DISABLED_STYLE
          : STAR_BUTTON_STYLE

        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={filledCount === starValue}
            aria-label={t('mock.rating.starAriaLabel', { value: starValue })}
            disabled={isInert}
            style={buttonStyle}
            onClick={() => {
              void handleClick(starValue)
            }}
            data-testid={`rating-control-star-${starValue}`}
            data-filled={filled ? 'true' : 'false'}
          >
            <motion.span
              aria-hidden="true"
              // pulse: scale 1 → 1.3 → 1 в одном кадре. При reduced
              // motion duration = 0, конечный кадр совпадает с начальным.
              animate={
                isPulsing
                  ? { scale: [1, 1.3, 1] }
                  : { scale: 1 }
              }
              transition={{
                duration: pulseDuration,
                ease: easing.standard,
              }}
              onAnimationComplete={() => {
                // Сбрасываем индекс, чтобы повторный клик на ту же
                // звезду снова мог триггерить анимацию.
                if (isPulsing) setPulseIndex(null)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              data-testid={
                isPulsing ? `rating-control-pulse-${starValue}` : undefined
              }
            >
              <Star
                size={20}
                strokeWidth={2}
                style={
                  filled ? STAR_ICON_FILLED_STYLE : STAR_ICON_EMPTY_STYLE
                }
              />
            </motion.span>
          </button>
        )
      })}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────

function sanitizeValue(v: number | undefined): number {
  if (v === undefined || !Number.isFinite(v)) return 0
  if (v < 0) return 0
  if (v > STAR_COUNT) return STAR_COUNT
  return v
}

export default RatingControl
