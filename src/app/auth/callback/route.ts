import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * GET /auth/callback — Supabase OAuth PKCE callback (Route Handler).
 *
 * Route Handlers in Next.js guarantee Set-Cookie headers are sent
 * with the redirect response, unlike Server Component pages where
 * `redirect()` may not propagate cookies reliably on Vercel.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // First-login bootstrap: create profile if not exists
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

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
