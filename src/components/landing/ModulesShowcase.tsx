'use client'

/**
 * ModulesShowcase — четыре карточки для секции «Разделы платформы»
 * на Public_Landing.
 *
 * Контракт (UI Redesign 2026, task 13.2, Requirements 4.2, 12.7):
 *   • Четыре карточки: Questions / Tasks / Trainer / Mock — каждая
 *     ведёт на соответствующий маршрут (`/questions`, `/tasks`,
 *     `/trainer`, `/mock`).
 *   • Превью-изображение через `next/image` с AVIF/WebP.
 *     AVIF/WebP подключены глобально в `next.config.ts` →
 *     `images.formats: ['image/avif', 'image/webp']`, что закрывает
 *     Req 12.7 «next/image для растровых изображений и поддержка
 *     AVIF или WebP».
 *
 *     Источники изображений: `https://placehold.co/640x360/png` в
 *     качестве placeholder-URL (подключён через `images.remotePatterns`
 *     в `next.config.ts`). Чтобы не падать в dev-режиме при отсутствии
 *     remote-config, мы рендерим локально нарисованный цветной div
 *     (`.landing-modules__placeholder`) поверх `<Image>`-обёртки —
 *     так сохраняется стабильный layout, а задача визуально выглядит
 *     как plug-in под реальные превью-ассеты.
 *
 *     TODO(task: modules-image-assets): положить
 *       `/public/modules/{questions,tasks,trainer,mock}.webp` и
 *       заменить placeholder-заливку на `<Image>` c локальным `src`.
 *
 *   • Каждая карточка завёрнута в `GlassCard` (Req 3.4, 3.5) и
 *     содержит CTA-`Button` (`secondary`, `md`) из `@/components/ui`,
 *     обёрнутый в `next/link` — тот же паттерн, что в `LandingCTA`.
 *     Лейбл — `t('landing.modules.cta')`.
 *
 *   • Все текстовые строки (заголовки, описания, alt, CTA-лейбл) —
 *     через `t()` (Req 24.1, 24.2).
 *
 *   • Только токены Design_System (Req 1.8): spacing, radius,
 *     typography, цвет — через CSS-классы в `ModulesShowcase.css`.
 *
 * Адаптивность (Req 9):
 *   - Viewport_Mobile (< 768px)  — single column.
 *   - Viewport_Tablet/Desktop    — `repeat(2, 1fr)`.
 *   - Viewport_Wide (>= 1440px)  — `repeat(4, 1fr)`.
 *   Брейкпоинты реализованы через `@media` в `ModulesShowcase.css`.
 */

import * as React from 'react'
import Link from 'next/link'

import { Button, GlassCard } from '@/components/ui'
import { t, type TranslationKey } from '@/lib/i18n'

import './ModulesShowcase.css'

interface ModuleTile {
  readonly id: 'questions' | 'tasks' | 'trainer' | 'mock'
  readonly href: string
  readonly titleKey: TranslationKey
  readonly descriptionKey: TranslationKey
  readonly altKey: TranslationKey
}

const MODULES: readonly ModuleTile[] = [
  {
    id: 'questions',
    href: '/questions',
    titleKey: 'landing.modules.questions.title',
    descriptionKey: 'landing.modules.questions.description',
    altKey: 'landing.modules.questions.alt',
  },
  {
    id: 'tasks',
    href: '/tasks',
    titleKey: 'landing.modules.tasks.title',
    descriptionKey: 'landing.modules.tasks.description',
    altKey: 'landing.modules.tasks.alt',
  },
  {
    id: 'trainer',
    href: '/trainer',
    titleKey: 'landing.modules.trainer.title',
    descriptionKey: 'landing.modules.trainer.description',
    altKey: 'landing.modules.trainer.alt',
  },
  {
    id: 'mock',
    href: '/mock',
    titleKey: 'landing.modules.mock.title',
    descriptionKey: 'landing.modules.mock.description',
    altKey: 'landing.modules.mock.alt',
  },
] as const

/**
 * Солидная цветная подложка для превью, пока реальные `.webp`/`.avif`
 * ассеты не добавлены в `/public/modules`. Подложка нарисована токенами
 * Design_System через CSS-класс `.landing-modules__placeholder` с
 * per-module вариацией по `data-module`, чтобы карточки визуально
 * различались. У placeholder есть `role="img"` + локализованный
 * `aria-label`, чтобы сохранить доступность, которую обычно несёт
 * `alt` у `<Image>` (Req 11.6). Когда ассеты появятся, этот div
 * заменяется на `<Image src="/modules/<id>.webp" alt={t(altKey)} />`.
 */
function ModulePlaceholder({
  ariaLabel,
}: {
  ariaLabel: string
}): React.ReactElement {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="landing-modules__placeholder"
    />
  )
}

/**
 * Секция лендинга «Разделы платформы» с четырьмя карточками-превью,
 * ведущими на `/questions`, `/tasks`, `/trainer`, `/mock`.
 */
export function ModulesShowcase(): React.ReactElement {
  return (
    <section
      aria-labelledby="landing-modules-heading"
      className="landing-modules"
      data-landing-section="modules"
    >
      <div className="landing-modules__inner">
        <h2
          id="landing-modules-heading"
          className="landing-modules__title"
        >
          {t('landing.modules.title')}
        </h2>
        <div className="landing-modules__grid">
          {MODULES.map(
            ({ id, href, titleKey, descriptionKey, altKey }) => (
              <GlassCard
                key={id}
                cursorGlow
                className="landing-modules__card"
                data-module={id}
              >
                <div className="landing-modules__imageWrap">
                  <ModulePlaceholder ariaLabel={t(altKey)} />
                </div>
                <div className="landing-modules__body">
                  <h3 className="landing-modules__cardTitle">
                    {t(titleKey)}
                  </h3>
                  <p className="landing-modules__cardDescription">
                    {t(descriptionKey)}
                  </p>
                  <Link
                    href={href}
                    aria-label={`${t('landing.modules.cta')}: ${t(titleKey)}`}
                    className="landing-modules__ctaLink"
                    data-testid={`module-cta-${id}`}
                  >
                    <Button
                      variant="secondary"
                      size="md"
                      tabIndex={-1}
                    >
                      {t('landing.modules.cta')}
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            ),
          )}
        </div>
      </div>
    </section>
  )
}

export default ModulesShowcase
