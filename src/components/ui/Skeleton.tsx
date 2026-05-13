/**
 * `<Skeleton />` — унифицированный loading-плейсхолдер для DS v2.
 *
 * Варианты (`card | line | avatar`) покрывают основные кейсы:
 *   - `card`   — блок высотой ≈ высота Bento-карточки (Dashboard, списки);
 *   - `line`   — одна текстовая строка (заголовок, подпись);
 *   - `avatar` — круглый плейсхолдер под аватар.
 *
 * Компонент не рендерит реальных данных и не блокирует клик, но он
 * объявлен как `role="status"` с `aria-busy="true"`, чтобы скринридер
 * корректно сообщал о загрузке (Requirement 20.1).
 *
 * Дизайн-токены: фон/градиент — `--surface-100` / `--surface-300`,
 * radius — `--radius-{md,lg,full}`, motion — `--dur-slow` / `--ease-standard`.
 * Хардкод-значений цвета / spacing / radius нет (Requirement 1.8).
 *
 * Анимация `skeleton-shimmer` определена в `src/app/globals.css` и
 * автоматически отключается медиа-запросом `prefers-reduced-motion`.
 */

import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type SkeletonVariant = 'card' | 'line' | 'avatar'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Визуальный вариант плейсхолдера. По умолчанию `line`. */
  variant?: SkeletonVariant
  /** Локализованный label для скринридера. По умолчанию — пустой (role="status" сам объявляет). */
  label?: string
}

const BASE_STYLE: CSSProperties = {
  background: `linear-gradient(
    90deg,
    var(--surface-100) 25%,
    var(--surface-300) 50%,
    var(--surface-100) 75%
  )`,
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer var(--dur-dramatic, 720ms) var(--ease-standard, ease-in-out) infinite',
  display: 'block',
}

const VARIANT_STYLE: Record<SkeletonVariant, CSSProperties> = {
  card: {
    width: '100%',
    height: 'var(--space-32)',
    borderRadius: 'var(--radius-lg)',
  },
  line: {
    width: '100%',
    height: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
  },
  avatar: {
    width: 'var(--space-12)',
    height: 'var(--space-12)',
    borderRadius: 'var(--radius-full)',
    flexShrink: 0,
  },
}

export function Skeleton({
  variant = 'line',
  label,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      data-variant={variant}
      data-ds="skeleton"
      className={cn(className)}
      style={{
        ...BASE_STYLE,
        ...VARIANT_STYLE[variant],
        ...style,
      }}
      {...rest}
    />
  )
}
