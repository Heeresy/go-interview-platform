'use client'

/**
 * LandingFooter — подвал публичного Landing.
 *
 * Спека: UI Redesign 2026, task 13.3, Requirements 4.2, 22.1.
 *
 * Контракт:
 *
 *  - Семантический `<footer role="contentinfo">` с `aria-label`, чтобы
 *    скринридер мог обозначить секцию как "contentinfo" страницы.
 *
 *  - Копирайт генерируется через `t('landing.footer.copyright',
 *    { year: new Date().getFullYear() })` (Req 24.1, 24.2).
 *    Год вычисляется на render-time; для SSR это серверное время, для
 *    гидратации клиент получает то же значение (разница допустима лишь
 *    в новогоднюю ночь между SSR и hydration — React обрабатывает без
 *    warning, т.к. значение стабильно в рамках одного рендера).
 *
 *  - Опциональные ссылки (GitHub, Docs) — обычные `<a target="_blank"
 *    rel="noopener noreferrer">` (task инструкция: `target="_blank"
 *    rel="noopener"`; мы расширяем до `noopener noreferrer` — это
 *    стандартная a11y/security рекомендация и не противоречит task).
 *    aria-label для каждой ссылки локализован и отличается от
 *    видимого текста, чтобы скринридер уточнял "открыть в новой
 *    вкладке".
 *
 *  - Только токены Design_System (Req 1.8); inline-стили используют
 *    `var(--space-*)`, `var(--fs-*)`, `var(--fw-*)`, `var(--border-*)`.
 */

import type * as React from 'react'
import { type ReactNode } from 'react'

import { t, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface LandingFooterLink {
    /** Уникальный id — используется как key и data-атрибут. */
    readonly id: string
    /** Целевой URL. Ожидается абсолютный внешний адрес. */
    readonly href: string
    /** Ключ видимого текста ссылки. */
    readonly labelKey: TranslationKey
    /** Ключ доступного имени (aria-label), расширяющего labelKey. */
    readonly ariaLabelKey: TranslationKey
}

export interface LandingFooterProps {
    /** Дополнительный className на корневом `<footer>`. */
    className?: string
    /**
     * Переопределение списка ссылок. По умолчанию — GitHub и Docs.
     * Передать `[]` (пустой массив) для отключения ссылок — тогда
     * блок `<ul>` не рендерится.
     */
    links?: readonly LandingFooterLink[]
}

/**
 * Дефолтные ссылки подвала. URL — placeholder на один из публичных
 * проектов: в продакшне могут быть переопределены через пропс `links`.
 */
const DEFAULT_LINKS: readonly LandingFooterLink[] = [
    {
        id: 'github',
        href: 'https://github.com/',
        labelKey: 'landing.footer.github',
        ariaLabelKey: 'landing.footer.githubAriaLabel',
    },
    {
        id: 'docs',
        href: 'https://nextjs.org/docs',
        labelKey: 'landing.footer.docs',
        ariaLabelKey: 'landing.footer.docsAriaLabel',
    },
]

const FOOTER_STYLE: React.CSSProperties = {
    width: '100%',
    paddingTop: 'var(--space-10)',
    paddingBottom: 'var(--space-10)',
    paddingLeft: 'var(--space-4)',
    paddingRight: 'var(--space-4)',
    borderTop: '1px solid color-mix(in oklch, var(--border-500) 10%, transparent)',
    color: 'var(--border-600)',
}

const INNER_STYLE: React.CSSProperties = {
    maxWidth: '1440px',
    marginInline: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
    textAlign: 'center',
}

const LINKS_STYLE: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 'var(--space-6)',
    listStyle: 'none',
    margin: 0,
    padding: 0,
}

const LINK_STYLE: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-medium)',
    color: 'var(--border-700)',
    textDecoration: 'none',
    transition: 'color var(--dur-fast) var(--ease-standard)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-1) var(--space-2)',
}

const COPYRIGHT_STYLE: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    color: 'var(--border-600)',
    margin: 0,
}

/**
 * Публичный футер лендинга. Показывает копирайт с текущим годом и
 * опциональный ряд внешних ссылок (GitHub, Docs).
 */
export function LandingFooter({
    className,
    links = DEFAULT_LINKS,
}: LandingFooterProps): ReactNode {
    const year = new Date().getFullYear()

    return (
        <footer
            role="contentinfo"
            aria-label={t('landing.footer.product')}
            className={cn('landing-footer', className)}
            data-landing-section="footer"
            style={FOOTER_STYLE}
        >
            <div style={INNER_STYLE}>
                {links.length > 0 && (
                    <ul style={LINKS_STYLE} aria-label={t('landing.footer.resources')}>
                        {links.map((link) => (
                            <li key={link.id}>
                                <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={t(link.ariaLabelKey)}
                                    data-footer-link={link.id}
                                    style={LINK_STYLE}
                                >
                                    {t(link.labelKey)}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}

                <p style={COPYRIGHT_STYLE} data-testid="landing-footer-copyright">
                    {t('landing.footer.copyright', { year })}
                </p>
            </div>
        </footer>
    )
}

export default LandingFooter
