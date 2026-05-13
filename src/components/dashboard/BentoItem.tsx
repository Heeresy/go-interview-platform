/**
 * `<BentoItem />` — обёртка одного ребёнка BentoGrid (DS v2).
 *
 * Контракт (Requirements 5.2, 22.4):
 *
 *   - Принимает `colSpan` и `rowSpan` (числа ≥ 1) и проставляет их
 *     через inline `style` как `grid-column: span <n>` и
 *     `grid-row: span <n>`. CSS Grid корректно клампит `span` до
 *     числа доступных колонок/строк, поэтому большие значения на
 *     узких брейкпоинтах (например, `colSpan = 8` на Mobile с 4
 *     колонками) не ломают layout.
 *
 *   - Дефолты: `colSpan = 1`, `rowSpan = 1` — минимальная ячейка.
 *     Значения санитизируются `Math.max(1, Math.floor(n))`, чтобы
 *     не попадали `NaN`/0/отрицательные значения в inline-style
 *     (иначе CSS Grid проигнорирует свойство и ребёнок схлопнется
 *     в 1×1, что мы и так получаем по дефолту — но явная санитизация
 *     делает контракт предсказуемым).
 *
 *   - Inline-стиль объединяется с пользовательским `style`, чтобы
 *     consumer мог, например, задать `minHeight` или `alignSelf`
 *     для конкретной плитки, не теряя grid-span.
 *
 *   - `className` пробрасывается после базового `.bento-item` —
 *     см. BentoGrid.css.
 *
 * Никаких токенов цвета/spacing/radius здесь не применяется —
 * BentoItem визуально прозрачен, его единственная задача —
 * позиционирование в grid-е (Req 1.8 выполняется тривиально:
 * компонент не имеет визуального слоя).
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

export interface BentoItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Содержимое плитки (обычно одна dashboard-карточка). */
  children: ReactNode
  /**
   * Сколько колонок grid-сетки занимает плитка. По умолчанию `1`.
   * Большие значения автоматически клампятся CSS Grid'ом до ширины
   * текущего брейкпоинта.
   */
  colSpan?: number
  /**
   * Сколько строк grid-сетки занимает плитка. По умолчанию `1`.
   * Используется вместе с `grid-auto-rows: minmax(140px, auto)`
   * контейнера.
   */
  rowSpan?: number
  /**
   * Дополнительный CSS-класс. Объединяется после базового
   * `.bento-item`, не заменяет его.
   */
  className?: string
}

/**
 * Санитизирует span-значение: округляет до целого, клампит снизу
 * до 1. Для невалидных значений (NaN, undefined, null, <= 0)
 * возвращает `1`. Такое поведение единообразно для `colSpan`
 * и `rowSpan`.
 */
function sanitizeSpan(n: number | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 1
  const rounded = Math.floor(n)
  return rounded >= 1 ? rounded : 1
}

export function BentoItem({
  children,
  colSpan,
  rowSpan,
  className,
  style,
  ...rest
}: BentoItemProps) {
  const col = sanitizeSpan(colSpan)
  const row = sanitizeSpan(rowSpan)

  // Используем строковую форму `span N`, а не отдельные свойства
  // `grid-column-start`/`-end`, чтобы оставить контракт простым
  // и совместимым с авто-размещением grid-сетки (CSS Grid сам
  // решает, где разместить плитку).
  const mergedStyle: CSSProperties = {
    ...style,
    gridColumn: `span ${col}`,
    gridRow: `span ${row}`,
  }

  const mergedClassName = className ? `bento-item ${className}` : 'bento-item'

  return (
    <div
      {...rest}
      className={mergedClassName}
      style={mergedStyle}
      data-ds="bento-item"
    >
      {children}
    </div>
  )
}

export default BentoItem
