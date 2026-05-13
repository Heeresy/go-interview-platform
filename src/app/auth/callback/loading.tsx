/**
 * `/auth/callback/loading.tsx` — Suspense fallback for the Supabase OAuth
 * callback (DS v2 migration, task 16.2).
 *
 * Rendered by Next.js while the async server page in `./page.tsx` awaits
 * `supabase.auth.exchangeCodeForSession()` and the first-login profile
 * bootstrap. Uses the same Design_System primitives as the page body:
 *   - `GlassCard` (Requirements 3.4, 3.5)
 *   - `Skeleton` with `role="status"` (Requirement 20.1)
 *   - strings from `src/lib/i18n` (Requirement 24.2)
 *   - all dimensions referenced via tokens, no hardcoded literals
 *     (Requirement 1.8)
 *
 * Requirements: 13.1, 13.2, 13.6.
 */

import { GlassCard, Skeleton } from '@/components/ui'
import { t } from '@/lib/i18n'

export default function AuthCallbackLoading() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <GlassCard
        role="status"
        aria-live="polite"
        style={{
          width: '100%',
          maxWidth: 'calc(var(--space-32) * 3)',
          padding: 'var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'var(--fs-md)',
            fontWeight: 'var(--fw-medium)',
            color: 'var(--text-primary, inherit)',
            lineHeight: 1.5,
          }}
        >
          {t('state.loading')}
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <Skeleton
            variant="line"
            label={t('common.loading')}
            style={{ width: '100%' }}
          />
          <Skeleton
            variant="line"
            label={t('common.loading')}
            style={{ width: '80%' }}
          />
          <Skeleton
            variant="line"
            label={t('common.loading')}
            style={{ width: '60%' }}
          />
        </div>
      </GlassCard>
    </div>
  )
}
