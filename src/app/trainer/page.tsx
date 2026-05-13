'use client'

/**
 * `/trainer` — маршрут тренажёра (task 19.4, UI Redesign 2026).
 *
 * Структурно повторяет паттерн `/` (`src/app/page.tsx`): клиентский
 * `<AuthGate />` решает, что показывать; авторизованная ветка обёрнута
 * в `<AppShell />` и рендерит `<TrainerShell />` — оркестратор сессии
 * тренажёра из `src/components/trainer/` (Req 16.1, 21.1, 21.5,
 * 22.4, 22.5).
 *
 * Почему `'use client'`: `<AuthGate />` принимает render-функцию
 * `authenticated={({ user }) => …}`, а функции не сериализуются через
 * границу server→client в Next.js App Router. Та же причина, по
 * которой `'use client'` стоит в `src/app/page.tsx`.
 *
 * Бизнес-логика тренажёра не трогается: уровневая логика (skip /
 * retry / stay) живёт в `src/lib/trainer.ts` и используется напрямую
 * `<TrainerShell />` без обёрток. Этот файл — чистая композиция
 * shell + trainer, без собственных эффектов, fetch'ей и стейта
 * (Req 21.1, 21.2, 21.5).
 *
 * Гостевая ветка: `/trainer` — auth-only маршрут (см. design.md
 * §Routing/Layouts: `App_Shell` для всех protected-routes). Защиту
 * обеспечивает `src/middleware.ts` (Supabase session refresh +
 * перенаправление неавторизованных). На клиенте `<AuthGate />`
 * всё равно требует prop `guest`, поэтому передаём `null` как
 * безопасный fallback на случай гонок при первичной загрузке —
 * к моменту рендера middleware уже редиректнул guest'а на `/login`.
 */

import { useSearchParams } from 'next/navigation'

import { AppShell, AuthGate } from '@/components/shell'
import { TrainerShell } from '@/components/trainer'
import type { Difficulty } from '@/types/database'

export default function TrainerPage() {
  const searchParams = useSearchParams()
  const levelParam = Number(searchParams.get('level'))
  const initialLevel: Difficulty =
    levelParam >= 1 && levelParam <= 5 ? (levelParam as Difficulty) : 1

  return (
    <AuthGate
      guest={null}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <TrainerShell initialLevel={initialLevel} />
        </AppShell>
      )}
    />
  )
}
