'use client'

/**
 * LandingCTA — публичная landing-секция с финальным призывом к действию.
 *
 * Спека: UI Redesign 2026, task 13.3, Requirements 4.2, 4.3, 22.1.
 *
 * Контракт:
 *
 *  - Секция `<section>` с `role="region"` и `aria-labelledby` на свой
 *    заголовок — даёт скринридерам объявляемую границу.
 *
 *  - Заголовок — `t('landing.ctaSection.title')` («Готовы начать?»).
 *    Подзаголовок — `t('landing.cta.subtitle')`.
 *
 *  - Содержит ≥ 2 CTA-кнопок, обе ведут на `/login` (Req 4.3):
 *      • Primary — `t('landing.cta.primary')`  («Начать бесплатно»);
 *      • Secondary — `t('landing.cta.secondary')` («Войти»).
 *    Кнопки реализованы как `Button` (primary/secondary) из
 *    `@/components/ui`, обёрнутые в `next/link`. Next.js App Router
 *    корректно отрендерит `<Link>` как `<a>`, сохранив DS-стили и
 *    loading-поведение кнопки. Ссылки помечены `data-cta` атрибутами
 *    для property-тестов.
 *
 *  - Все строки через `t()` (Req 24.1), только токены Design_System
 *    (Req 1.8). Inline-стили используют `var(--space-*)`,
 *    `var(--radius-*)`, `var(--fs-*)` — никаких хардкод-значений.
 */

import Link from 'next/link'
import { type ReactNode } from 'react'

import { Button } from '@/components/ui'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import './LandingCTA.css'

export interface LandingCTAProps {
    /** Дополнительный className на корневую секцию. */
    className?: string
    /**
     * Опциональное переопределение href — например, для тестов/
     * превью. По умолчанию обе кнопки ведут на `/login` (Req 4.3).
     */
    href?: string
}

export function LandingCTA({
    className,
    href = '/login',
}: LandingCTAProps): ReactNode {
    const titleId = 'landing-cta-title'

    return (
        <section
            role="region"
            aria-labelledby={titleId}
            className={cn('landing-cta', className)}
            data-landing-section="cta"
        >
            <div className="landing-cta__inner glass landing-cta__panel">
                <header className="landing-cta__header">
                    <h2 id={titleId} className="landing-cta__title">
                        {t('landing.ctaSection.title')}
                    </h2>
                    <p className="landing-cta__subtitle">
                        {t('landing.cta.subtitle')}
                    </p>
                </header>

                <div
                    className="landing-cta__actions"
                    data-testid="landing-cta-actions"
                >
                    {/* Primary CTA → /login (Req 4.3). `Link` → `<a>`,
                        внутри — DS `Button` с сохранением стилей и
                        loading-поведения. */}
                    <Link
                        href={href}
                        className="landing-cta__link"
                        data-cta="primary"
                    >
                        <Button variant="primary" size="lg" tabIndex={-1}>
                            {t('landing.cta.primary')}
                        </Button>
                    </Link>

                    {/* Secondary CTA → /login (Req 4.3). Оба действия
                        ведут на один и тот же вход, давая пользователю
                        визуально альтернативный путь. */}
                    <Link
                        href={href}
                        className="landing-cta__link"
                        data-cta="secondary"
                    >
                        <Button variant="secondary" size="lg" tabIndex={-1}>
                            {t('landing.cta.secondary')}
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default LandingCTA
