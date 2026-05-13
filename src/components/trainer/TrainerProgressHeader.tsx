/**
 * `<TrainerProgressHeader />` — шапка тренажёра на Viewport_Desktop
 * (task 19.1, UI Redesign 2026).
 *
 * Requirement 16.2: Trainer_Module SHALL отображать текущий уровень,
 * прогресс-бар к следующему уровню и количество решённых задач на
 * Viewport_Desktop в верхней части экрана.
 *
 * Контракт:
 *
 *  - **Props:** `{ level: number; solved: number; progressToNext: number; className?: string }`.
 *    - `level`            — текущий уровень (целое ≥ 1), рендерится в бейдже
 *                           `Уровень N` через `t('trainer.header.level', { level })`.
 *    - `solved`           — количество решённых задач (целое ≥ 0),
 *                           рендерится как `Решено: N` через
 *                           `t('trainer.header.solved', { count: solved })`.
 *    - `progressToNext`   — прогресс к следующему уровню в диапазоне `[0..1]`.
 *                           Передаётся в `<ProgressBar />` напрямую, там же
 *                           выполняется мягкий clamp (значения за пределами
 *                           и `NaN` клэмпаются в `[0, 1]`).
 *    - `className`        — опциональный extra-класс для композиции.
 *
 *  - **Чистая презентация (Req 22.1):** компонент не хранит собственное
 *    состояние, не читает глобальные сторы и не делает сетевых запросов;
 *    все данные приходят через пропсы. Благодаря этому компонент безопасен
 *    и для SSR, и для клиентского рендера без директивы `'use client'`.
 *
 *  - **Layout (Req 16.2):** flex-row на Viewport_Desktop (≥ 1024px),
 *    flex-column на Viewport_Mobile/Tablet — переключение через
 *    `@media (min-width: 1024px)` в `TrainerProgressHeader.css`, без
 *    JS-ветвления на match-media, чтобы SSR и первый клиентский рендер
 *    выдавали согласованный HTML.
 *
 *  - **Sticky (design.md §Trainer_Module):** `<GlassPanel />` используется
 *    как контейнер; CSS всегда задаёт `position: sticky; top: var(--space-4)`,
 *    что «активируется» только если у компонента есть scroll-ancestor.
 *    На страницах, где шапка встроена просто в статический поток, sticky
 *    деградирует до `relative` без визуальных артефактов.
 *
 *  - **Design System (Req 1.8, 22.1):** все визуальные величины —
 *    через DS v2 токены (классы `.glass`, локальные CSS-правила на
 *    `--space-*`, `--fs-*`, `--fw-*`, `--border-*`). Хардкод значений
 *    цвета / spacing / radius отсутствует.
 *
 *  - **i18n (Req 24.2):** все строки берутся через типизированный `t()`
 *    из словаря `ru.ts`; никаких inline-строк на русском в TSX нет.
 *
 *  - **a11y (Req 11.6):**
 *    - Внешний контейнер — `<header role="banner">` внутри тренажёрной
 *      страницы будет вложен в `<main>`, поэтому здесь используем
 *      нейтральный `<div>` с `data-ds` и `aria-label={t('trainer.header.level', …)}`
 *      НЕ задаём — шапка содержит семантически помеченные дочерние
 *      узлы (ProgressBar с `role="progressbar"`; Badge — визуальный
 *      label; счётчик — обычный `<p>`), что уже достаточно для SR.
 *    - `ProgressBar` получает локализованный `label` — имя связывается
 *      через `aria-labelledby` автоматически.
 */

import type { CSSProperties } from 'react'

import { Badge, GlassPanel, ProgressBar } from '@/components/ui'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import './TrainerProgressHeader.css'

export interface TrainerProgressHeaderProps {
  /** Текущий уровень пользователя (целое ≥ 1). */
  level: number
  /** Количество решённых задач в этой сессии / всего (целое ≥ 0). */
  solved: number
  /**
   * Прогресс к следующему уровню в диапазоне `[0..1]`. Значения за
   * пределами и `NaN` мягко клэмпаются внутри `<ProgressBar />`.
   */
  progressToNext: number
  /** Опциональный extra-класс для композиции в TrainerShell. */
  className?: string
}

/**
 * `style`-объект `<GlassPanel />` не используется — вся раскладка
 * живёт в `TrainerProgressHeader.css`. Держим явный `undefined`, чтобы
 * не плодить inline-styles в компоненте и не провоцировать срабатывания
 * runtime-render-guard на хардкод-значения.
 */
const PANEL_STYLE: CSSProperties | undefined = undefined

export function TrainerProgressHeader({
  level,
  solved,
  progressToNext,
  className,
}: TrainerProgressHeaderProps) {
  const levelLabel = t('trainer.header.level', { level })
  const solvedLabel = t('trainer.header.solved', { count: solved })

  return (
    <GlassPanel
      data-ds="trainer-progress-header"
      className={cn('trainer-progress-header', className)}
      style={PANEL_STYLE}
    >
      <Badge
        variant="neutral"
        className="trainer-progress-header__level"
        data-testid="trainer-progress-header-level"
      >
        {levelLabel}
      </Badge>
      <ProgressBar
        value={progressToNext}
        label={levelLabel}
        className="trainer-progress-header__progress"
        data-testid="trainer-progress-header-progress"
      />
      <p
        className="trainer-progress-header__solved"
        data-testid="trainer-progress-header-solved"
      >
        {solvedLabel}
      </p>
    </GlassPanel>
  )
}

export default TrainerProgressHeader
