/**
 * Integration health detection.
 *
 * `detectIntegrations()` is called from the application root to verify that
 * all active integrations are documented in the registry. Undocumented
 * integrations produce a console warning and a Sentry message but NEVER
 * throw, exit, or block application startup.
 */

import { DOCUMENTED_INTEGRATIONS } from './registry'

export interface IntegrationsHealth {
  /** Names of documented integrations whose ENV keys are present */
  documented: string[]
  /** Integrations detected via ENV but not listed in the registry */
  undocumented: { name: string; source: string }[]
  /** Quick flag: true when at least one undocumented integration is detected */
  hasUndocumented: boolean
}

/**
 * Patterns that commonly indicate a third-party integration ENV key.
 * Used to detect undocumented integrations by scanning `process.env`.
 */
const INTEGRATION_PATTERNS: RegExp[] = [
  /_API_KEY$/,
  /_SECRET$/,
  /_DSN$/,
  /_TOKEN$/,
  /_CLIENT_ID$/,
  /_CLIENT_SECRET$/,
]

/**
 * ENV keys that are known framework/platform variables and should NOT
 * be flagged as undocumented integrations.
 */
const IGNORED_ENV_KEYS: Set<string> = new Set([
  'NODE_ENV',
  'NEXT_PUBLIC_VERCEL_ENV',
  'NEXT_PUBLIC_VERCEL_URL',
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_URL',
  'VERCEL_GIT_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_REF',
  'CI',
])

/**
 * Detect active integrations and flag any that are not documented.
 *
 * This function is safe to call in both server and client contexts.
 * It never throws, never calls `process.exit`, and never blocks startup.
 */
export function detectIntegrations(): IntegrationsHealth {
  const health: IntegrationsHealth = {
    documented: [],
    undocumented: [],
    hasUndocumented: false,
  }

  // Collect all documented ENV keys into a set for fast lookup
  const documentedEnvKeys = new Set<string>()
  for (const integration of DOCUMENTED_INTEGRATIONS) {
    for (const key of integration.envKeys) {
      documentedEnvKeys.add(key)
    }
  }

  // 1. Identify which documented integrations are active
  for (const integration of DOCUMENTED_INTEGRATIONS) {
    const isActive = integration.envKeys.some(
      (key) => typeof process !== 'undefined' && process.env?.[key]
    )
    if (isActive) {
      health.documented.push(integration.name)
    }
  }

  // 2. Scan process.env for undocumented integration-like keys
  if (typeof process !== 'undefined' && process.env) {
    for (const key of Object.keys(process.env)) {
      // Skip if already documented or in the ignore list
      if (documentedEnvKeys.has(key) || IGNORED_ENV_KEYS.has(key)) {
        continue
      }

      // Check if the key matches any integration pattern
      const matchesPattern = INTEGRATION_PATTERNS.some((pattern) =>
        pattern.test(key)
      )

      if (matchesPattern) {
        const entry = { name: key, source: 'env' }
        health.undocumented.push(entry)
      }
    }
  }

  // 3. Report undocumented integrations
  if (health.undocumented.length > 0) {
    health.hasUndocumented = true

    for (const entry of health.undocumented) {
      console.warn('[integrations] undocumented:', {
        name: entry.name,
        source: entry.source,
      })
    }

    // Attempt to report to Sentry (dynamic import — won't crash if unavailable)
    reportToSentry(health.undocumented)
  }

  return health
}

/**
 * Dynamically imports Sentry and reports undocumented integrations.
 * Fails silently if Sentry is not installed or not configured.
 */
function reportToSentry(
  undocumented: { name: string; source: string }[]
): void {
  try {
    // Use dynamic require-style import that won't break bundling if Sentry is absent.
    // In Next.js, @sentry/nextjs is the canonical package.
    const Sentry =
      typeof window !== 'undefined'
        ? require('@sentry/nextjs')
        : require('@sentry/nextjs')

    if (Sentry?.captureMessage) {
      Sentry.captureMessage(
        `[integrations] undocumented integrations detected: ${undocumented.map((u) => u.name).join(', ')}`,
        { level: 'warning', extra: { undocumented } }
      )
    }
  } catch {
    // Sentry not available — silently continue
  }
}
