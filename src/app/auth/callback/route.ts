import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Create profile if first login
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: existing } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', user.id)
                    .single()

                if (!existing) {
                    await supabase.from('profiles').insert({
                        id: user.id,
                        username: user.user_metadata?.user_name || user.email?.split('@')[0],
                        display_name: user.user_metadata?.full_name || user.user_metadata?.name,
                        avatar_url: user.user_metadata?.avatar_url,
                    })
                    // Initialize user progress
                    await supabase.from('user_progress').insert({
                        user_id: user.id,
                    })
                }
            }
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
