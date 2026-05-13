'use client'

/**
 * SocialProof — публичная landing-секция "социальное доказательство".
 *
 * Спека: UI Redesign 2026, task 13.3, Requirements 4.2, 22.1.
 *
 * Контракт:
 *
 *  - Секция `<section>` с `role="region"` и `aria-labelledby` на свой
 *    заголовок (Req 22.1, WCAG 2.1 AA). Без явного labelledby/label
 *    браузер проигнорировал бы роль, поэтому привязываемся к
 *    локализованному `<h2>`.
 *
 *  - Заголовок — `t('landing.socialProof.title')` (Req 24.1). Ключ
 *    уже присутствует в `ru.ts`. Подзаголовок — `landing.socialProof.subtitle`.
 *
 *  - Ряд из 5 placeholder-логотипов/аватаров. Согласно task 13.3 —
 *    нейтральные `<div>`-блоки с фоном `--surface-300`; каждый блок
 *    имеет `aria-label` с локализованным именем компании, чтобы
 *    скринридер мог объявить элемент списка осмысленно.
 *    Никаких внешних изображений: (1) это placeholders, (2) без
 *    запросов в сеть — хорошо для LCP на Public_Landing (Req 4.7 /
 *    12.1).
 *
 *  - Только токены Design_System (Req 1.8). Цвета фона, spacing,
 *    radius и размеры шрифта берутся из CSS custom properties,
 *    объявленных в `globals.css` и `SocialProof.css`.
 */

import { type ReactNode } from 'react'

import { GlassPanel } from '@/components/ui'
import { t, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import './SocialProof.css'

/**
 * Placeholder-компания: имя из i18n + отображаемая буква-маркер.
 * 5 элементов — верхняя граница диапазона «3–5» из задачи 13.3.
 */
interface SocialProofCompany {
    /** Стабильный id — ключ React и data-атрибут. */
    readonly id: string
    /** 1 буква, рендерящаяся по центру placeholder-блока. */
    readonly mark: string
    /** i18n-ключ локализованного имени компании. */
    readonly labelKey: TranslationKey
}

const COMPANIES: readonly SocialProofCompany[] = [
    { id: 'acme', mark: 'A', labelKey: 'landing.socialProof.company.acme' },
    { id: 'nova', mark: 'N', labelKey: 'landing.socialProof.company.nova' },
    { id: 'pulse', mark: 'P', labelKey: 'landing.socialProof.company.pulse' },
    { id: 'orbit', mark: 'O', labelKey: 'landing.socialProof.company.orbit' },
    { id: 'lumen', mark: 'L', labelKey: 'landing.socialProof.company.lumen' },
]

export interface SocialProofProps {
    /**
     * Дополнительный className на корневой `<section>`; не перетирает
     * базовый `social-proof`, а дополняет его.
     */
    className?: string
    /** Опциональный слот — например, для RevealOnScroll-детей. */
    children?: ReactNode
}

export function SocialProof({ className, children }: SocialProofProps): ReactNode {
    const titleId = 'landing-social-proof-title'

    return (
        <section
            role="region"
            aria-labelledby={titleId}
            className={cn('social-proof', className)}
            data-landing-section="social-proof"
        >
            <GlassPanel className="social-proof__panel">
                <header className="social-proof__header">
                    <h2 id={titleId} className="social-proof__title">
                        {t('landing.socialProof.title')}
                    </h2>
                    <p className="social-proof__subtitle">
                        {t('landing.socialProof.subtitle')}
                    </p>
                </header>

                <ul
                    className="social-proof__list"
                    aria-label={t('landing.socialProof.title')}
                >
                    {COMPANIES.map((company) => {
                        const label = t(company.labelKey)
                        return (
                            <li
                                key={company.id}
                                className="social-proof__item"
                                data-company={company.id}
                            >
                                {/* Нейтральный placeholder-блок с фоном
                                    `--surface-300`. aria-label задаётся прямо
                                    на `<div>` и объявляется скринридером как
                                    имя элемента (role="img" делает блок
                                    стандартизированным именованным элементом). */}
                                <div
                                    role="img"
                                    aria-label={label}
                                    className="social-proof__placeholder"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="social-proof__placeholder-mark"
                                    >
                                        {company.mark}
                                    </span>
                                </div>
                                <span aria-hidden="true" className="social-proof__name">
                                    {label}
                                </span>
                            </li>
                        )
                    })}
                </ul>

                {children}
            </GlassPanel>
        </section>
    )
}

export default SocialProof
