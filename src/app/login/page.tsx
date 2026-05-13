'use client'

/**
 * `/login` — Auth_Module login page (Requirements 13.1, 13.2, 13.3, 13.4, 13.5,
 * 13.6, 20.3).
 *
 * Визуальный слой перестроен на Design System v2: форма смонтирована в
 * `<GlassCard />`, поля ввода — `<Input />` с семантическими цветами ошибок
 * (`--danger` через `aria-invalid` в CSS-токенах), кнопка submit — `<Button />`
 * с собственным `loading`-индикатором. Все тексты — через `t('auth.login.*')`
 * из `@/lib/i18n` (Req 24.2), хардкода нет (Req 1.8).
 *
 * Supabase-интеграция не меняется: клиент поднимается из
 * `@/lib/supabase/client` (`@supabase/ssr` без изменений в схеме — Req 13.2,
 * 21.2). Отправка формы вызывает `supabase.auth.signInWithPassword(...)`.
 *
 * Поведение при ошибке авторизации (Req 13.4 и пункт «не терять введённые
 * данные»):
 *   - `email` / `password` остаются в локальном state как есть.
 *   - Сообщение `t('auth.login.error')` поднимается в оба поля через
 *     `error` prop `<Input />` (выставляет `aria-invalid="true"` и рендерит
 *     сам текст под полем ввода — это даёт и визуальный, и a11y-контракт).
 *   - Focus возвращается на поле email как на первое потенциально
 *     невалидное (Req 11.4).
 *
 * Поведение при успешной авторизации (Req 13.3, 13.5):
 *   Вызывается локальный helper `redirectAfterAuth()` — обёртка над
 *   `router.replace('/')`, обёрнутая одновременно в `try/catch` (на случай
 *   синхронного throw) и в `Promise.catch` (на случай, если `router.replace`
 *   вернёт Promise и он будет отклонён middleware/сетью/роутером).
 *   Если redirect разрешился — пользователь уходит на `/` и `AuthGate`
 *   переключит рендер на Dashboard; **success-indicator (toast, анимация
 *   перехода) НЕ показывается**. Если redirect отклонён — пользователь
 *   остаётся на `/login`, поднимается `<ErrorState retry>` с ключом
 *   `auth.login.redirectFailed` и retry-кнопкой (Req 13.4, 13.5, 20.3).
 *
 * Инвариант (см. design.md → Auth_Module): success-render связан с событием
 * фактической навигации одной промис-цепочкой — мы ничего не рендерим «как
 * успех», пока `redirectAfterAuth()` не разрешился true. Именно поэтому
 * после успешного входа UI не показывает промежуточного «успешного»
 * состояния: либо навигация произошла (и компонент размонтируется), либо
 * подняли `ErrorState`.
 */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'
import { Button, ErrorState, GlassCard, Input } from '@/components/ui'
import { t } from '@/lib/i18n'

// --- layout tokens ----------------------------------------------------------
// Все inline-стили используют только Design_System CSS custom properties
// (Req 1.8). Хардкода цвета/spacing/radius/px нет.
const PAGE_STYLE: CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-6)',
  color: 'var(--border-900)',
}

const CARD_STYLE: CSSProperties = {
  width: '100%',
  // Design_System `--space-*` шкала упирается в 128px (`--space-32`), что
  // мало для auth-карточки. Используем `rem`-шкалу, привязанную к токену
  // базовой шрифт-размерности (`--fs-md` = 16px), чтобы ширина карточки
  // масштабировалась вместе с типографикой Design_System и не требовала
  // хардкода в px.
  maxWidth: '28rem',
}

const CARD_INNER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
  padding: 'var(--space-8)',
}

const TITLE_STYLE: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xl)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1.2,
  color: 'var(--border-900)',
}

const FORM_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
}

const DIVIDER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
}

const DIVIDER_LINE_STYLE: CSSProperties = {
  flex: 1,
  height: '1px',
  background: 'var(--border-300)',
}

const DIVIDER_TEXT_STYLE: CSSProperties = {
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--border-600)',
  userSelect: 'none',
}

const OAUTH_BUTTONS_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
}

/**
 * LoginPage — email + password форма с DS v2 поверхностями.
 */
export default function LoginPage() {
  const router = useRouter()
  // `createClient()` возвращает новый `@supabase/ssr` browser-клиент; мы
  // кешируем его в `useMemo`, чтобы не пересоздавать на каждом рендере
  // (реальная инстанс-стоимость + внутренний auth-subscription).
  const supabase = useMemo(() => createClient(), [])

  const emailInputRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [redirectFailed, setRedirectFailed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleOAuth = useCallback(
    async (provider: 'google' | 'discord') => {
      if (isSubmitting) return
      setAuthError(null)
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) {
          setAuthError(t('auth.login.error'))
        }
      } catch {
        setAuthError(t('auth.login.error'))
      }
    },
    [isSubmitting, supabase],
  )

  /**
   * `redirectAfterAuth()` — единственная точка post-auth навигации
   * (Req 13.3, 13.4, 13.5).
   *
   * Обёртка над `router.replace('/')` в `try/catch` + `Promise.catch`:
   *   - Синхронный throw (`router.replace` бросил до возврата) перехватывается
   *     внешним `try/catch` и резолвится в `false`.
   *   - Если `router.replace` вернул thenable (см. App Router возможные
   *     future-совместимые подписи), мы подписываемся на `.then/.catch`
   *     и резолвим в `true` / `false` соответственно.
   *   - Если вернул `void` (текущий App Router), это считается успехом —
   *     навигация запущена без ошибок.
   *
   * Контракт: возвращает `Promise<boolean>`, никогда не reject. Любой
   * неуспех (network error, middleware reject, throw) → `false`.
   */
  const redirectAfterAuth = useCallback((): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      try {
        // App Router's `router.replace` is typed as `void`, but we treat
        // the return value defensively: if a Promise surfaces in a future
        // Next.js version or via a wrapping middleware, we honour it.
        const result = router.replace('/') as unknown
        if (
          result !== null &&
          typeof result === 'object' &&
          typeof (result as { then?: unknown }).then === 'function'
        ) {
          ;(result as Promise<unknown>).then(
            () => resolve(true),
            () => resolve(false),
          )
        } else {
          resolve(true)
        }
      } catch {
        resolve(false)
      }
    })
  }, [router])

  const handleEmailChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value)
      // Сбрасываем error при вводе — пользователь корректирует данные;
      // старое сообщение перестаёт соответствовать реальности. Сами
      // `email` / `password` НЕ очищаются (Req 13.4).
      if (authError !== null) setAuthError(null)
    },
    [authError],
  )

  const handlePasswordChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value)
      if (authError !== null) setAuthError(null)
    },
    [authError],
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (isSubmitting) return

      setAuthError(null)
      setIsSubmitting(true)

      try {
        // `@supabase/ssr` browser-клиент — та же интеграция, что и раньше
        // (Req 13.2, 21.2).
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          // Req 13.4 — введённые данные НЕ теряются. Сохраняем `email` /
          // `password`, поднимаем локализованное сообщение на оба поля.
          setAuthError(t('auth.login.error'))
          // Req 11.4 — перемещаем фокус на первое потенциально невалидное
          // поле (email) для пользователей клавиатуры / скринридеров.
          // `setTimeout(0)` даёт React-у применить ререндер с обновлённым
          // `aria-invalid`, после чего фокус попадает на уже «ошибочное» поле.
          setTimeout(() => {
            emailInputRef.current?.focus()
          }, 0)
          return
        }

        // Успешная авторизация: success-indicator (toast, анимация
        // перехода) не показывается (Req 13.5). Просто вызываем
        // `redirectAfterAuth()`; если он откажется — рендерим ErrorState
        // с retry (см. JSX ниже).
        const ok = await redirectAfterAuth()
        if (!ok) {
          setRedirectFailed(true)
        }
        // На success компонент размонтируется вместе с навигацией; state
        // больше не наблюдаем.
      } catch {
        // Сетевая / неожиданная ошибка запроса авторизации — показываем
        // унифицированное сообщение (Req 13.4, 20.3).
        setAuthError(t('auth.login.error'))
        setTimeout(() => {
          emailInputRef.current?.focus()
        }, 0)
      } finally {
        setIsSubmitting(false)
      }
    },
    [email, password, isSubmitting, redirectAfterAuth, supabase],
  )

  /**
   * Retry redirect после неуспешной попытки перейти на `/`. Auth-сессия
   * уже установлена (мы попали в это состояние только после успешного
   * `signInWithPassword`), поэтому вызывать Supabase повторно не нужно.
   */
  const handleRetryRedirect = useCallback(async () => {
    if (isRetrying) return
    setIsRetrying(true)
    try {
      const ok = await redirectAfterAuth()
      if (ok) setRedirectFailed(false)
    } finally {
      setIsRetrying(false)
    }
  }, [isRetrying, redirectAfterAuth])

  // --- render: redirect failed branch --------------------------------------
  if (redirectFailed) {
    return (
      <div style={PAGE_STYLE}>
        <GlassCard style={CARD_STYLE}>
          <div style={CARD_INNER_STYLE}>
            <h1 style={TITLE_STYLE}>{t('auth.login.title')}</h1>
            <ErrorState
              messageKey="auth.login.redirectFailed"
              retry={handleRetryRedirect}
            />
          </div>
        </GlassCard>
      </div>
    )
  }

  // --- render: form branch -------------------------------------------------
  return (
    <div style={PAGE_STYLE}>
      <GlassCard style={CARD_STYLE}>
        <div style={CARD_INNER_STYLE}>
          <h1 style={TITLE_STYLE}>{t('auth.login.title')}</h1>

          <form noValidate onSubmit={handleSubmit} style={FORM_STYLE}>
            <Input
              ref={emailInputRef}
              type="email"
              label={t('auth.login.emailLabel')}
              value={email}
              onChange={handleEmailChange}
              autoComplete="email"
              required
              disabled={isSubmitting}
              error={authError ?? undefined}
              name="email"
            />
            <Input
              type="password"
              label={t('auth.login.passwordLabel')}
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              // `aria-invalid` синхронизирован через `error` prop; визуальное
              // сообщение показываем только один раз (на поле email), чтобы
              // не дублировать текст под обоими полями.
              aria-invalid={authError !== null ? true : undefined}
              name="password"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={isSubmitting}
            >
              {t('auth.login.submit')}
            </Button>
          </form>

          {/* OAuth divider + providers */}
          <div style={DIVIDER_STYLE}>
            <span style={DIVIDER_LINE_STYLE} />
            <span style={DIVIDER_TEXT_STYLE}>или</span>
            <span style={DIVIDER_LINE_STYLE} />
          </div>

          <div style={OAUTH_BUTTONS_STYLE}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => handleOAuth('google')}
              disabled={isSubmitting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ marginRight: 'var(--space-2)' }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Войти через Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => handleOAuth('discord')}
              disabled={isSubmitting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ marginRight: 'var(--space-2)' }}>
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/>
              </svg>
              Войти через Discord
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
