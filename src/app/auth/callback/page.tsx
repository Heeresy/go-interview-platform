/**
 * `/auth/callback` — Supabase OAuth callback (DS v2 migration, task 16.2).
 *
 * Contract (preserved verbatim from the previous `route.ts` implementation —
 * Requirements 13.1, 13.2):
 *
 *   1. Read `code` and `next` from the URL search params; default `next = "/"`.
 *   2. If `code` is present:
 *        a. Call `supabase.auth.exchangeCodeForSession(code)`.
 *        b. On success, call `supabase.auth.getUser()` and, if the user has no
 *           `profiles` row yet, insert one derived from `user_metadata`
 *           (`user_name`/`email` → username, `full_name`/`name` → display_name,
 *           `avatar_url` → avatar_url) plus a companion `user_progress` row.
 *        c. Redirect to `next`.
 *   3. If `code` is missing or the exchange fails, redirect to
 *      `/login?error=auth_failed`.
 *
 * No database schema is touched (Requirement 13.2, 21.2). The Supabase SSR
 * client (`@supabase/ssr`) and its cookie wiring are reused as-is.
 *
 * UI (Requirement 13.6, 24.2):
 *   The callback performs its work server-side and terminates in a `redirect()`,
 *   so under normal conditions the body of this page is never committed to the
 *   screen. The brief streaming window is covered by the co-located
 *   `loading.tsx`, which composes the same Design_System primitives
 *   (`GlassCard` + `Skeleton`) with strings from `src/lib/i18n`.
 *
 * Rendering strategy: pure Server Component (per `design.md` route table —
 * `/login, /auth/callback` are SSR under the Auth surface, budget ≤ 180 KB).
 * No `"use client"` directive; the redirect is performed via
 * `next/navigation`'s `redirect()`, which throws a `NEXT_REDIRECT` signal and
 * never streams markup on the happy path.
 */

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Next.js 16 App Router passes `searchParams` as a Promise to Server
// Component pages. Declare a thin local type to keep the handler self-
// contained and typed without pulling in framework internals.
type CallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(
  raw: string | string[] | undefined,
): string | undefined {
  if (raw === undefined) return undefined
  return Array.isArray(raw) ? raw[0] : raw
}

export default async function AuthCallbackPage({
  searchParams,
}: CallbackPageProps) {
  const params = await searchParams
  const code = firstValue(params.code)
  const nextRaw = firstValue(params.next)
  const next = nextRaw ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // First-login bootstrap — same queries as the previous route handler,
      // kept identical so database schema and side-effects are unchanged
      // (Requirement 13.2, 21.2).
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existing) {
          await supabase.from('profiles').insert({
            id: user.id,
            username:
              user.user_metadata?.user_name ||
              user.email?.split('@')[0],
            display_name:
              user.user_metadata?.full_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
          })
          await supabase.from('user_progress').insert({
            user_id: user.id,
          })
        }
      }

      redirect(next)
    }
  }

  redirect('/login?error=auth_failed')
}
