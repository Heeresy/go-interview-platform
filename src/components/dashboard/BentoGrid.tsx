/**
 * `<BentoGrid />` — CSS Grid контейнер для Dashboard-bento (DS v2).
 *
 * Контракт (Requirements 5.2, 22.4):
 *
 *   - Default (Viewport_Tablet / Desktop / Wide, ≥ 768px):
 *     `grid-template-columns: repeat(12, 1fr)`,
 *     `grid-auto-rows: minmax(140px, auto)`,
 *     `gap: var(--space-4)` по умолчанию. Карточки заявляют
 *     желаемый размер через пропсы `colSpan` / `rowSpan` у
 *     `<BentoItem />`.
 *
 *   - Viewport_Mobile (< 768px): контейнер коллапсирует
 *     в одну колонку (`grid-template-columns: 1fr`). Соседний
 *     CSS-override в BentoGrid.css форсирует `grid-column: 1 / -1`
 *     на каждом `<BentoItem />`, то есть `colSpan` на этой
 *     ширине игнорируется и все карточки занимают всю строку —
 *     прямой контракт задачи 14.1.
 *
 *   - `grid-auto-rows: minmax(140px, auto)` — единственное
 *     разрешённое литеральное px-значение в этом модуле (оно
 *     прописано прямо в постановке задачи как минимальная
 *     высота строки бенто-сетки). Все прочие величины идут
 *     через токены (`--space-*`, `--bento-grid-gap`).
 *
 *   - `gap` проп — любое валидное CSS-значение gap. Чаще всего
 *     токен (`var(--space-6)` для более воздушного layout'а).
 *     Значение пробрасывается как CSS custom property
 *     `--bento-grid-gap`, чтобы дефолт `var(--space-4)` оставался
 *     в одном месте (в CSS) и чтобы consumer мог переопределить
 *     его и через внешние классы.
 *
 *   - `className` пробрасывается после базового `.bento-grid`,
 *     чтобы потребитель мог добавить свою утилиту (например,
 *     `margin-block` в layout страницы), не ломая основной
 *     контракт grid-а.
 *
 * Токены: `--space-4` (по умолчанию gap). Хардкод цветов, радиусов
 * или прочих px-значений отсутствует (Req 1.8, 22.4).
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import './BentoGrid.css'

export interface BentoGridProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Дочерние элементы, обычно `<BentoItem />` карточки Dashboard. */
  children: ReactNode
  /**
   * Custom gap между ячейками сетки. Любое валидное CSS-значение
   * (например, `var(--space-6)` для более воздушного layout'а).
   * По умолчанию `var(--space-4)` (16px). Прокидывается как
   * CSS custom property `--bento-grid-gap` — это оставляет
   * возможность переопределять gap из внешних стилей без
   * перезаписи inline-стиля.
   */
  gap?: string
  /**
   * Дополнительный CSS-класс. Объединяется после базового
   * `.bento-grid`, не заменяет его.
   */
  className?: string
}

export function BentoGrid({
  children,
  gap,
  className,
  style,
  ...rest
}: BentoGridProps) {
  // Объединяем переданный inline-style с кастомным `--bento-grid-gap`.
  // Если `gap` не задан, CSS-переменная в стиле не выставляется, и
  // правило `var(--bento-grid-gap, var(--space-4))` в CSS использует
  // дефолтный fallback. Это сохраняет единственный источник истины
  // для дефолта — CSS, а не JS.
  const mergedStyle: CSSProperties | undefined =
    gap !== undefined
      ? ({ ...style, ['--bento-grid-gap' as string]: gap } as CSSProperties)
      : style

  const mergedClassName = className ? `bento-grid ${className}` : 'bento-grid'

  return (
    <div
      {...rest}
      className={mergedClassName}
      style={mergedStyle}
      data-ds="bento-grid"
    >
      {children}
    </div>
  )
}

export default BentoGrid
