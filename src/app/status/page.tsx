'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Bot,
  Activity,
  Shield,
  ExternalLink,
} from 'lucide-react'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error'
  timestamp: string
  environment: string
  checks: {
    gemini: {
      configured: boolean
    }
    supabase: {
      urlConfigured: boolean
      keyConfigured: boolean
    }
    sentry: {
      configured: boolean
    }
  }
  message: string
}

export default function StatusPage() {
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async (isManual = false) => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (isManual) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      setError('Не удалось получить статус системы')
      console.error('Status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await Promise.resolve()
      fetchStatus()
    }
    init()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? (
      <CheckCircle2 size={20} style={{ color: 'var(--accent-green)' }} />
    ) : (
      <XCircle size={20} style={{ color: 'var(--accent-red)' }} />
    )
  }

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'var(--accent-green)' : 'var(--accent-red)'
  }

  return (
    <div className="page">
      <div className="container container--narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="page__header">
            <h1 className="page__title flex items-center gap-3">
              <Activity size={28} style={{ color: 'var(--accent-blue)' }} />
              Статус системы
            </h1>
            <p className="page__subtitle">
              Проверка конфигурации сервисов и API
            </p>
          </div>

          {/* Overall Status */}
          {!loading && status && (
            <motion.div
              className="glass glass--strong"
              style={{
                padding: '24px',
                marginBottom: '24px',
                borderLeft: `4px solid ${status.status === 'healthy'
                  ? 'var(--accent-green)'
                  : 'var(--accent-orange)'
                  }`,
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
                {status.status === 'healthy' ? (
                  <CheckCircle2 size={32} style={{ color: 'var(--accent-green)' }} />
                ) : (
                  <AlertCircle size={32} style={{ color: 'var(--accent-orange)' }} />
                )}
                <div>
                  <h2
                    style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 700,
                      color:
                        status.status === 'healthy'
                          ? 'var(--accent-green)'
                          : 'var(--accent-orange)',
                    }}
                  >
                    {status.status === 'healthy' ? 'Модели Gemini активны' : 'Требуется настройка API'}
                  </h2>
                  <p className="text-sm text-muted">{status.message}</p>
                </div>
              </div>
              <div className="text-xs text-muted" style={{ marginTop: '12px' }}>
                Последнее обновление: {new Date(status.timestamp).toLocaleString('ru-RU')}
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="glass text-center" style={{ padding: '48px' }}>
              <RefreshCw size={32} className="spin" style={{ color: 'var(--accent-blue)' }} />
              <p className="text-muted" style={{ marginTop: '16px' }}>
                Проверка статуса...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              className="glass"
              style={{
                padding: '24px',
                background: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid var(--accent-red)',
              }}
            >
              <div className="flex items-center gap-2" style={{ color: 'var(--accent-red)' }}>
                <XCircle size={20} />
                <span>{error}</span>
              </div>
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => fetchStatus(true)}
                style={{ marginTop: '16px' }}
              >
                <RefreshCw size={14} />
                Повторить
              </button>
            </div>
          )}

          {/* Service Details */}
          {status && (
            <div className="grid grid--2" style={{ gap: '16px' }}>
              {/* Gemini Status */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="card__header">
                  <div className="flex items-center gap-2">
                    <Bot size={20} style={{ color: 'var(--accent-purple)' }} />
                    <h3 className="card__title">Google Gemini AI</h3>
                  </div>
                  {getStatusIcon(status.checks.gemini.configured)}
                </div>
                <div className="card__body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API ключ (GOOGLE_AI_API_KEY)</span>
                      {getStatusIcon(status.checks.gemini.configured)}
                    </div>
                  </div>
                </div>
                <div className="card__footer">
                  {!status.checks.gemini.configured ? (
                    <Link
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--primary btn--sm"
                      style={{ width: '100%' }}
                    >
                      Получить API ключ
                      <ExternalLink size={14} />
                    </Link>
                  ) : (
                    <span className="text-sm text-muted flex items-center gap-1">
                      <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                      Готово к работе (Flash 1.5)
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Supabase Status */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="card__header">
                  <div className="flex items-center gap-2">
                    <Database size={20} style={{ color: 'var(--accent-green)' }} />
                    <h3 className="card__title">Supabase</h3>
                  </div>
                  {getStatusIcon(
                    status.checks.supabase.urlConfigured && status.checks.supabase.keyConfigured
                  )}
                </div>
                <div className="card__body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">URL настроен</span>
                      {getStatusIcon(status.checks.supabase.urlConfigured)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Anon Key настроен</span>
                      {getStatusIcon(status.checks.supabase.keyConfigured)}
                    </div>
                  </div>
                </div>
                <div className="card__footer">
                  <span
                    className="text-sm"
                    style={{
                      color:
                        status.checks.supabase.urlConfigured && status.checks.supabase.keyConfigured
                          ? 'var(--accent-green)'
                          : 'var(--accent-red)',
                    }}
                  >
                    {status.checks.supabase.urlConfigured && status.checks.supabase.keyConfigured
                      ? '✓ Подключение активно'
                      : '✗ Требуется настройка'}
                  </span>
                </div>
              </motion.div>

              {/* Sentry Status */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="card__header">
                  <div className="flex items-center gap-2">
                    <Shield size={20} style={{ color: 'var(--accent-orange)' }} />
                    <h3 className="card__title">Sentry</h3>
                  </div>
                  {getStatusIcon(status.checks.sentry.configured)}
                </div>
                <div className="card__body">
                  <p className="text-sm text-muted">
                    {status.checks.sentry.configured
                      ? 'Мониторинг ошибок активен'
                      : 'Sentry не настроен (опционально)'}
                  </p>
                </div>
                <div className="card__footer">
                  <span className="text-xs text-muted">
                    Статус:{' '}
                    <span
                      style={{
                        color: getStatusColor(status.checks.sentry.configured),
                      }}
                    >
                      {status.checks.sentry.configured ? 'Активен' : 'Не настроен'}
                    </span>
                  </span>
                </div>
              </motion.div>

              {/* Environment Info */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="card__header">
                  <div className="flex items-center gap-2">
                    <Server size={20} style={{ color: 'var(--accent-blue)' }} />
                    <h3 className="card__title">Окружение</h3>
                  </div>
                </div>
                <div className="card__body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Режим</span>
                      <span
                        className="badge"
                        style={{
                          background:
                            status.environment === 'production'
                              ? 'var(--accent-green)'
                              : 'var(--accent-blue)',
                          color: '#fff',
                        }}
                      >
                        {status.environment}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* AI Assistant Test */}
          {status?.checks.gemini.configured && (
            <motion.div
              className="glass glass--strong"
              style={{ marginTop: '32px', padding: '24px' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
                <Bot size={20} style={{ color: 'var(--accent-purple)' }} />
                Тест Gemini AI
              </h3>
              <p className="text-sm text-muted" style={{ marginBottom: '16px' }}>
                Нажмите на значок AI помощника в правом нижнем углу экрана и отправьте тестовое
                сообщение, чтобы проверить работу Google Gemini API.
              </p>
              <div className="flex gap-3">
                <Link href="/" className="btn btn--secondary">
                  На главную
                </Link>
                <button className="btn btn--primary" onClick={() => fetchStatus(true)}>
                  <RefreshCw size={14} />
                  Обновить статус
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
