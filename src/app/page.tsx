'use client'

/**
 * `/` — корневой маршрут.
 *
 * Рендерит `<PublicLanding />` для гостей и `<Dashboard />` внутри
 * `<AppShell />` для авторизованных. Переключение между ветками
 * делает клиентский `<AuthGate />` через подписку на
 * `supabase.auth.onAuthStateChange`.
 *
 * Если URL содержит `?code=` (OAuth PKCE callback), компонент
 * обменивает код на сессию перед рендером AuthGate.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { AppShell, AuthGate } from '@/components/shell'
import { Dashboard } from '@/components/dashboard'
import { PublicLanding } from '@/components/landing'
import { createClient } from '@/lib/supabase/client'

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = searchParams.get('code')
  const [exchanging, setExchanging] = useState(!!code)

  useEffect(() => {
    if (!code) return

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(() => {
      // Очищаем ?code= из URL и разрешаем AuthGate рендериться
      setExchanging(false)
      router.replace('/', { scroll: false })
    }).catch(() => {
      setExchanging(false)
    })
  }, [code, router])

  if (exchanging) {
    // Пока идёт обмен кода — не рендерим ни landing, ни dashboard
    return null
  }

  return (
    <AuthGate
      guest={<PublicLanding />}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <Dashboard />
        </AppShell>
      )}
    />
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
