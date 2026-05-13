/**
 * Documented integrations registry.
 *
 * Every third-party service used by the platform MUST be listed here.
 * The `detectIntegrations()` function in boot.ts cross-references this list
 * against the runtime environment to flag undocumented dependencies.
 */

export interface Integration {
  name: string
  /** ENV variables that indicate this integration is active */
  envKeys: string[]
  /** npm packages associated with this integration */
  packages?: string[]
  description: string
}

export const DOCUMENTED_INTEGRATIONS: Integration[] = [
  {
    name: 'Supabase',
    envKeys: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    packages: ['@supabase/supabase-js', '@supabase/ssr'],
    description: 'Database, Auth, Storage',
  },
  {
    name: 'Google Generative AI',
    envKeys: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY'],
    packages: ['@google/generative-ai'],
    description: 'AI evaluation',
  },
  {
    name: 'Sentry',
    envKeys: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN'],
    packages: ['@sentry/nextjs'],
    description: 'Error monitoring',
  },
  {
    name: 'Vercel Analytics',
    envKeys: ['NEXT_PUBLIC_VERCEL_ANALYTICS_ID'],
    packages: ['@vercel/analytics'],
    description: 'Web analytics',
  },
  {
    name: 'Speed Insights',
    envKeys: ['NEXT_PUBLIC_SPEED_INSIGHTS_ID'],
    packages: ['@vercel/speed-insights'],
    description: 'Performance monitoring',
  },
]
