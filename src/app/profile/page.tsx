'use client'

/**
 * `/profile` — страница профиля пользователя.
 *
 * Структурно повторяет паттерн `/trainer` / `/tasks`: клиентский
 * `<AuthGate />` решает, что показывать; авторизованная ветка обёрнута
 * в `<AppShell />` и рендерит модульные компоненты профиля из
 * `@/components/profile` (Req 18.1, 21.1, 21.5, 22.4, 22.5).
 *
 * Почему `'use client'`: `<AuthGate />` принимает render-функцию
 * `authenticated={({ user }) => ...}`, а функции не сериализуются через
 * границу server→client в Next.js App Router.
 *
 * `guest={null}` — к моменту рендера `src/middleware.ts` (Supabase
 * session refresh + перенаправление неавторизованных на `/login`) уже
 * отработал. `null` — безопасный fallback на случай гонок при первичной
 * загрузке.
 *
 * Бизнес-логика (`src/lib/**`, `src/app/api/**`, Supabase schema)
 * остаётся без изменений — см. Req 21.1, 21.2, 21.5.
 */

import { AppShell, AuthGate } from '@/components/shell'
import { ProfileContent } from './ProfileContent'

export default function ProfilePage() {
  return (
    <AuthGate
      guest={null}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <ProfileContent user={user} />
        </AppShell>
      )}
    />
  )
}
