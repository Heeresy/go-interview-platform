'use client'

/**
 * `/` — корневой маршрут.
 *
 * Рендерит `<PublicLanding />` для гостей и `<Dashboard />` внутри
 * `<AppShell />` для авторизованных. Переключение между ветками
 * делает клиентский `<AuthGate />` через подписку на
 * `supabase.auth.onAuthStateChange` — без `router.push('/')` и
 * без полной перезагрузки страницы (Req 5.7, 6.8).
 *
 * Если URL содержит `?code=` (OAuth PKCE callback, когда Supabase
 * перенаправляет на корень вместо `/auth/callback`), компонент
 * обменивает код на сессию и очищает URL.
 */

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { AppShell, AuthGate } from '@/components/shell'
import { Dashboard } from '@/components/dashboard'
import { PublicLanding } from '@/components/landing'
import { createClient } from '@/lib/supabase/client'

function OAuthCodeExchange() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get('code')

  useEffect(() => {
    if (!code) return

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!error) {
        // Очищаем ?code= из URL без перезагрузки
        router.replace('/', { scroll: false })
      }
    })
  }, [code, router])

  return null
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <OAuthCodeExchange />
      </Suspense>
      <AuthGate
        guest={<PublicLanding />}
        authenticated={({ user }) => (
          <AppShell user={user}>
            <Dashboard />
          </AppShell>
        )}
      />
    </>
  )
}
