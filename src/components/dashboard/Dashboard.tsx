/**
 * `<Dashboard />` — композит маршрута `/` для авторизованного пользователя
 * (Requirements 5.1, 5.2, 5.3, 22.4).
 *
 * Компонент собирает 6 dashboard-карточек внутри `<BentoGrid />` с помощью
 * `<BentoItem />`-обёрток:
 *
 *   Row 1: ProgressCard   (6×1) | NextTaskCard     (6×1)
 *   Row 2: ActivityCard              (12×1)
 *   Row 3: LeaderboardCard(6×2) | TrainerQuickCard (3×1) | MockQuickCard (3×1)
 *   Row 4:   ↳ leaderboard занимает 2 строки; справа (col 7–12) пусто
 *
 * Суммы: 12/12 в каждой строке верхнего плана — чистый desktop layout
 * при `grid-template-columns: repeat(12, 1fr)` (см. BentoGrid).
 *
 * Контракт:
 *   - Ни один глобальный Dashboard-level ErrorState / skeleton / overlay
 *     здесь не вводится. Все состояния загрузки/ошибок/успеха живут
 *     строго внутри каждой карточки (Req 5.5, 5.6, инвариант Property 15).
 *     Dashboard лишь расставляет плитки в Bento-сетке.
 *
 *   - Никаких данных Dashboard сам не фетчит — каждая карточка
 *     самостоятельно тянет свои данные через свой `useEffect` /
 *     `useCardData`. Это оставляет Dashboard чисто презентационным
 *     и упрощает тестирование композиции.
 *
 *   - На Viewport_Mobile BentoGrid коллапсирует сетку в одну колонку
 *     (см. BentoGrid.css), поэтому `colSpan` здесь игнорируется —
 *     все карточки рендерятся подряд. На Tablet/Desktop/Wide работает
 *     полный 12-колоночный layout (Req 5.2, 9.1, 9.2).
 *
 *   - Никаких hex/rgb литералов и px-значений — только токены
 *     Design_System (Req 1.8). Сам компонент визуально прозрачен и
 *     делегирует всю типографику/цвета карточкам.
 *
 * Dashboard рендерится как ребёнок AppShell-а из `src/app/page.tsx`
 * (Req 5.1, 6.8). Использование вне `/` допустимо — компонент
 * независим от маршрута.
 */

import type { ReactNode } from 'react'

import { ActivityCard } from './ActivityCard'
import { BentoGrid } from './BentoGrid'
import { BentoItem } from './BentoItem'
import { LeaderboardCard } from './LeaderboardCard'
import { MockQuickCard } from './MockQuickCard'
import { NextTaskCard } from './NextTaskCard'
import { ProgressCard } from './ProgressCard'
import { TrainerQuickCard } from './TrainerQuickCard'

export interface DashboardProps {
  /**
   * Дополнительный className на корневой `<BentoGrid />`. Объединяется
   * с базовым `.bento-grid`, не заменяет его. Полезно для страничной
   * обёртки (например, вертикальные отступы в layout страницы).
   */
  className?: string
}

/**
 * Композит 6 карточек Dashboard в 12-колоночной Bento-сетке.
 * См. module doc для раскладки по строкам.
 */
export function Dashboard({ className }: DashboardProps = {}): ReactNode {
  return (
    <BentoGrid className={className} data-dashboard-root="">
      {/* Row 1 — progress + next task, по половине ширины. */}
      <BentoItem colSpan={6} rowSpan={1} data-dashboard-cell="progress">
        <ProgressCard />
      </BentoItem>
      <BentoItem colSpan={6} rowSpan={1} data-dashboard-cell="next-task">
        <NextTaskCard />
      </BentoItem>

      {/* Row 2 — wide активность за 7 дней. */}
      <BentoItem colSpan={12} rowSpan={1} data-dashboard-cell="activity">
        <ActivityCard />
      </BentoItem>

      {/* Row 3 (и половина Row 4) — лидерборд слева 6×2; справа две
          узкие «quick» плитки по 3×1 (Trainer, Mock). На Row 4
          справа колонки 7–12 остаются пустыми — это осознанный
          «air» в layout-е. */}
      <BentoItem colSpan={6} rowSpan={2} data-dashboard-cell="leaderboard">
        <LeaderboardCard />
      </BentoItem>
      <BentoItem colSpan={3} rowSpan={1} data-dashboard-cell="trainer-quick">
        <TrainerQuickCard />
      </BentoItem>
      <BentoItem colSpan={3} rowSpan={1} data-dashboard-cell="mock-quick">
        <MockQuickCard />
      </BentoItem>
    </BentoGrid>
  )
}

export default Dashboard
