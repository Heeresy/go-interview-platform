'use client'

/**
 * AuthGate — клиентский переключатель рендера между гостевой
 * и авторизованной ветками одного и того же маршрута (Req 5.7).
 *
 * Используется на `/` для перехода `Public_Landing` ↔ `Dashboard`
 * без `router.push('/')` и без полной перезагрузки страницы.
 *
 * Контракт:
 *  - Подписывается на `supabase.auth.onAuthStateChange` (SIGNED_IN,
 *    SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED). Переключение между
 *    ветками происходит как обычный React re-render — ни
 *    `router.push`, ни `window.location` не вызываются.
 *  - Initial state подтягивается через `supabase.auth.getUser()`,
 *    чтобы не мигать гостевой веткой для уже авторизованного
 *    пользователя и наоборот.
 *  - Пока initial state ещё не получен, компонент рендерит проп
 *    `loading` (по умолчанию `null`) — это предотвращает FOUC
 *    между гостевым и авторизованным деревом (особенно важно,
 *    т.к. Public_Landing и Dashboard визуально сильно различаются).
 *  - Пропсы `guest` и `authenticated` могут быть как React-узлами,
 *    так и render-функциями. Render-функция `authenticated`
 *    получает `{ user }`, render-функция `guest` вызывается без
 *    контекста (сигнатура `(ctx: {}) => ReactNode` по задаче).
 *
 * Requirements: 5.7, 6.8, 21.2 (использует существующий
 * `@/lib/supabase/client` без изменений контракта).
 */

import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type GuestRenderer = ReactNode | ((ctx: Record<string, never>) => ReactNode)
type AuthenticatedRenderer = ReactNode | ((ctx: { user: User }) => ReactNode)

export interface AuthGateProps {
  guest: GuestRenderer
  authenticated: AuthenticatedRenderer
  /**
   * Что рендерить, пока первоначальный `supabase.auth.getUser()`
   * ещё не завершился. По умолчанию — `null` (пустой рендер), чтобы
   * избежать FOUC между гостевым и авторизованным деревом.
   */
  loading?: ReactNode
}

type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authenticated'; user: User }

function isRenderFn<T>(v: unknown): v is (ctx: T) => ReactNode {
  // React-узлы не вызываемы — `typeof === "function"` однозначно
  // отличает render-функцию от ReactNode.
  return typeof v === 'function'
}

export function AuthGate({ guest, authenticated, loading = null }: AuthGateProps) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    const supabase = createClient()

    // 1) Initial fetch — единожды на mount. Согласно @supabase/ssr,
    //    getUser() валидирует сессию и возвращает свежего пользователя
    //    (или `null`, если нет валидной сессии).
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return
        const user = data.user
        setState(
          user
            ? { status: 'authenticated', user }
            : { status: 'guest' },
        )
      })
      .catch(() => {
        // Сетевой/любой сбой при инициализации — считаем гостем.
        // Последующий onAuthStateChange всё равно скорректирует
        // состояние, если у пользователя валидная сессия.
        if (!active) return
        setState({ status: 'guest' })
      })

    // 2) Подписка на изменения сессии. Переключает ветки без
    //    router.push и без полной перезагрузки — чистый re-render.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const user = session?.user ?? null
      setState(
        user
          ? { status: 'authenticated', user }
          : { status: 'guest' },
      )
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (state.status === 'loading') {
    // Промежуточное "ни гостя, ни дашборда" — избегаем FOUC.
    // По умолчанию `loading === null`.
    return <>{loading}</>
  }

  if (state.status === 'guest') {
    return (
      <>{isRenderFn<Record<string, never>>(guest) ? guest({}) : guest}</>
    )
  }

  return (
    <>
      {isRenderFn<{ user: User }>(authenticated)
        ? authenticated({ user: state.user })
        : authenticated}
    </>
  )
}

export default AuthGate
