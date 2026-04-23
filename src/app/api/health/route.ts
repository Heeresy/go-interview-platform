import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    gemini: {
      configured: !!process.env.GOOGLE_AI_API_KEY,
    },
    supabase: {
      urlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      keyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    sentry: {
      configured: !!process.env.SENTRY_DSN,
    },
  }

  const allConfigured =
    checks.gemini.configured &&
    checks.supabase.urlConfigured &&
    checks.supabase.keyConfigured

  const status = allConfigured ? 'healthy' : 'degraded'

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks,
      message: allConfigured
        ? 'All services are configured'
        : 'Some services are not configured. Check the checks object for details.',
    },
    { status: allConfigured ? 200 : 503 }
  )
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}
