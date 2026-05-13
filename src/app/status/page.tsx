'use client'

/**
 * `/status` — страница статуса сервисов.
 *
 * Переиспользует существующий `/api/health` без изменения контракта
 * (Req 21.5). Маппит ответ health-check в массив `ServiceCardState[]`
 * и рендерит через `<StatusGrid />` внутри `<AppShell />`.
 *
 * Гостевая ветка — `null`: middleware уже редиректит неавторизованных
 * на `/login`, здесь лишь страховка на гонках первичной загрузки.
 *
 * Requirements: 19.1, 21.5, 22.4, 22.5.
 */

import { useState, useEffect, useCallback } from 'react'

import { AppShell, AuthGate } from '@/components/shell'
import { StatusGrid, type ServiceCardState } from '@/components/status'
import { t } from '@/lib/i18n'

// ── Health API contract (read-only, не модифицируем) ─────────────────────

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'error'
  timestamp: string
  environment: string
  checks: {
    gemini: { configured: boolean }
    supabase: { urlConfigured: boolean; keyConfigured: boolean }
    sentry: { configured: boolean }
  }
  message: string
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Маппит ответ `/api/health` в массив `ServiceCardState[]` для
 * `<StatusGrid />`. Каждый сервис получает `kind` на основе
 * конфигурационных флагов из health-check.
 */
function mapHealthToServices(
  health: HealthResponse,
  retry: () => Promise<void>,
): ServiceCardState[] {
  const geminiConfigured = health.checks.gemini.configured
  const supabaseConfigured =
    health.checks.supabase.urlConfigured && health.checks.supabase.keyConfigured
  const sentryConfigured = health.checks.sentry.configured

  return [
    geminiConfigured
      ? { kind: 'operational', name: 'Google Gemini AI' }
      : { kind: 'outage', name: 'Google Gemini AI', message: 'API ключ не настроен' },
    supabaseConfigured
      ? { kind: 'operational', name: 'Supabase' }
      : {
          kind: 'outage',
          name: 'Supabase',
          message: !health.checks.supabase.urlConfigured
            ? 'URL не настроен'
            : 'Anon Key не настроен',
        },
    sentryConfigured
      ? { kind: 'operational', name: 'Sentry' }
      : { kind: 'degraded', name: 'Sentry', message: 'Мониторинг не настроен (опционально)' },
    { kind: 'operational', name: health.environment ?? 'unknown' },
  ]
}

// ── Page component ───────────────────────────────────────────────────────

function StatusContent() {
  const [services, setServices] = useState<ServiceCardState[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      const data: HealthResponse = await res.json()
      setServices(mapHealthToServices(data, fetchStatus))
    } catch {
      setError(t('status.unknown'))
      setServices(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (loading && !services) {
    return (
      <p style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        {t('common.loading')}
      </p>
    )
  }

  if (error && !services) {
    return (
      <StatusGrid
        services={[{ kind: 'unknown', name: t('status.title'), retry: fetchStatus }]}
      />
    )
  }

  if (services) {
    return <StatusGrid services={services} />
  }

  return null
}

export default function StatusPage() {
  return (
    <AuthGate
      guest={null}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <StatusContent />
        </AppShell>
      )}
    />
  )
}
