'use client'

/**
 * FeatureGrid — три крупные glass-плитки для Public_Landing.
 *
 * Визуальный контракт (UI Redesign 2026, task 13.2, Requirements 4.2, 12.7):
 *   - Три GlassCard-плитки: «Скорость», «AI», «Адаптивность».
 *   - Каждая плитка содержит иконку (lucide-react: Zap / Sparkles / Gauge),
 *     заголовок и короткое описание; все строки — через `t()`
 *     (Req 24.1, 24.2).
 *   - Композиция и spacing — только Design_System токены (Req 1.8),
 *     через CSS-классы в `FeatureGrid.css`; никаких хардкод-значений
 *     цвета / spacing / radius в TSX нет.
 *
 * Адаптивность (Req 9):
 *   - Viewport_Mobile (< 1024px) — single column (stacked).
 *   - Viewport_Desktop/Wide (>= 1024px) — `grid-template-columns:
 *     repeat(3, 1fr)`.
 *   Брейкпоинт реализован через `@media (min-width: 1024px)` в
 *   `FeatureGrid.css` — не через JS-width-check, чтобы исключить
 *   промежуточные состояния при resize.
 *
 * Примечание по i18n: словарь использует ключ `landing.features.adaptivity.*`
 * (а не `adaptive`), что согласуется с `src/lib/i18n/ru.ts`.
 */

import * as React from 'react'
import { Gauge, Sparkles, Zap } from 'lucide-react'

import { GlassCard } from '@/components/ui'
import { t, type TranslationKey } from '@/lib/i18n'

import './FeatureGrid.css'

interface FeatureTile {
  readonly id: string
  readonly titleKey: TranslationKey
  readonly descriptionKey: TranslationKey
  readonly Icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
}

const FEATURES: readonly FeatureTile[] = [
  {
    id: 'speed',
    titleKey: 'landing.features.speed.title',
    descriptionKey: 'landing.features.speed.description',
    Icon: Zap,
  },
  {
    id: 'ai',
    titleKey: 'landing.features.ai.title',
    descriptionKey: 'landing.features.ai.description',
    Icon: Sparkles,
  },
  {
    id: 'adaptivity',
    titleKey: 'landing.features.adaptivity.title',
    descriptionKey: 'landing.features.adaptivity.description',
    Icon: Gauge,
  },
] as const

/**
 * Секция лендинга «Возможности» с тремя крупными glass-плитками.
 */
export function FeatureGrid(): React.ReactElement {
  return (
    <section
      aria-labelledby="landing-features-heading"
      className="landing-features"
      data-landing-section="features"
    >
      <div className="landing-features__inner">
        <h2
          id="landing-features-heading"
          className="landing-features__title"
        >
          {t('landing.features.title')}
        </h2>
        <div className="landing-features__grid">
          {FEATURES.map(({ id, titleKey, descriptionKey, Icon }) => (
            <GlassCard
              key={id}
              cursorGlow
              className="landing-features__card"
              data-feature={id}
            >
              <span
                className="landing-features__iconWrap"
                aria-hidden
              >
                <Icon size={24} aria-hidden />
              </span>
              <h3 className="landing-features__cardTitle">{t(titleKey)}</h3>
              <p className="landing-features__cardDescription">
                {t(descriptionKey)}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeatureGrid
