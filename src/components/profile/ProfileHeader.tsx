'use client'

/**
 * `<ProfileHeader />` — заголовочная карточка раздела `/profile`
 * (Requirements 18.1, 18.2).
 *
 * Контракт (UI Redesign 2026, task 21.1):
 *
 *   - Рендерится как `GlassPanel` (Req 3.4, 3.5, 22.1). Визуальный
 *     эффект glass + border + shadow живёт в классе `.glass`
 *     (`src/app/globals.css`), поэтому модуль не импортирует лишних
 *     стилей — только inline-style на токенах Design_System.
 *
 *   - Аватар: если `user.avatarUrl` непустая строка — рендерится
 *     `<img>` тег (мы не заводим `next/image` для произвольных
 *     пользовательских URL, т.к. это потребует конфигурации
 *     `images.remotePatterns`; это осознанная задержка — см. TODO).
 *     Если URL нет — рендерится иконка `User` из `lucide-react`
 *     в круглой surface-плашке, размер через токен `--space-*`.
 *
 *   - Имя: приоритет `user.name → user.email → t('profile.header.title')`.
 *     Это гарантирует непустой текстовый контент даже у профиля
 *     без заполненных полей (Req 18.1 «отображение данных
 *     пользователя»).
 *
 *   - Email: отображается отдельной строкой под именем; если
 *     `user.email` отсутствует — блок email-а не рендерится.
 *
 *   - Все строки — через `t('profile.*')` (Req 24.2). Хардкод
 *     строк отсутствует.
 *
 *   - Только токены Design_System (Req 1.8): spacing, radius,
 *     typography, цвета, shadow — всё через CSS custom properties.
 *     `size={32}` у иконки — визуальный внутренний размер иконки,
 *     а не CSS-значение, и укладывается в размерную сетку (8px grid).
 *
 *   - Размер аватара задаётся через токен `--space-18` (72px) —
 *     ровно 72×72, что соответствует минимальному touch-target
 *     ≥ 44×44 для clickable-интеракций в будущих расширениях и
 *     консервативно крупному визуальному якорю профиля.
 *
 *   - Для скринридеров: у `<img>` `alt=""` (декоративная иконка,
 *     рядом читается `<h1>` с именем); у иконки-заглушки —
 *     `aria-hidden="true"`.
 */

import * as React from 'react'
import { User } from 'lucide-react'

import { GlassPanel } from '@/components/ui'
import { t } from '@/lib/i18n'

// ── Public prop types ────────────────────────────────────────────────────

/**
 * Минимальная проекция профиля пользователя, необходимая `<ProfileHeader />`.
 * Шире, чем `Profile` из `@/types/database` — мы не завязываемся на
 * точную форму Supabase-строки, чтобы компонент оставался
 * переиспользуемым из любых консьюмеров (dashboard, settings, modal).
 */
export interface ProfileHeaderUser {
    /** Стабильный идентификатор пользователя (Supabase user.id). */
    id: string
    /** Email — отображается под именем. Может отсутствовать. */
    email?: string
    /** Отображаемое имя. Если пусто — фоллбек на email → заголовок. */
    name?: string
    /** URL аватара. Если пусто — рендерится иконка-заглушка. */
    avatarUrl?: string
}

export interface ProfileHeaderProps {
    /** Минимальная проекция профиля; см. `ProfileHeaderUser`. */
    user: ProfileHeaderUser
    /**
     * Дополнительный CSS-класс. Объединяется с базовым `.glass`
     * внутри `GlassPanel`, не заменяет его.
     */
    className?: string
}

// ── Styles (tokens only; Req 1.8) ────────────────────────────────────────

const ROOT_STYLE: React.CSSProperties = {
    padding: 'var(--space-6)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-5)',
    minHeight: '100%',
}

const AVATAR_STYLE: React.CSSProperties = {
    // 72×72 = --space-18 (step 4px, N * 4)
    width: 'var(--space-18)',
    height: 'var(--space-18)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-200)',
    color: 'var(--border-600)',
    flexShrink: 0,
    border:
        '1px solid color-mix(in oklch, var(--border-500) 10%, transparent)',
}

const AVATAR_IMG_STYLE: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
}

const INFO_STYLE: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    // `min-width: 0` необходим, чтобы flex-item корректно
    // сжимал длинное имя/email и срабатывал text-overflow.
    minWidth: 0,
    flex: 1,
}

const NAME_STYLE: React.CSSProperties = {
    fontSize: 'var(--fs-xl)',
    fontWeight: 'var(--fw-semibold)',
    lineHeight: 1.2,
    color: 'var(--border-900)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
}

const EMAIL_STYLE: React.CSSProperties = {
    fontSize: 'var(--fs-sm)',
    fontWeight: 'var(--fw-regular)',
    lineHeight: 1.4,
    color: 'var(--border-600)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Заголовок профиля: аватар + имя + email внутри `GlassPanel`.
 */
export function ProfileHeader({ user, className }: ProfileHeaderProps) {
    const trimmedName = user.name?.trim() ?? ''
    const trimmedEmail = user.email?.trim() ?? ''
    const trimmedAvatar = user.avatarUrl?.trim() ?? ''

    // Фоллбек-цепочка имени: name → email → общий заголовок раздела.
    const displayName =
        trimmedName.length > 0
            ? trimmedName
            : trimmedEmail.length > 0
                ? trimmedEmail
                : t('profile.header.title')

    const hasAvatar = trimmedAvatar.length > 0

    return (
        <GlassPanel
            className={className}
            style={ROOT_STYLE}
            data-profile-section="header"
            data-user-id={user.id}
        >
            <span
                style={AVATAR_STYLE}
                data-profile-avatar={hasAvatar ? 'image' : 'placeholder'}
                aria-hidden="true"
            >
                {hasAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={trimmedAvatar}
                        alt=""
                        style={AVATAR_IMG_STYLE}
                        data-testid="profile-header-avatar-image"
                    />
                ) : (
                    <User
                        size={32}
                        aria-hidden="true"
                        data-testid="profile-header-avatar-icon"
                    />
                )}
            </span>

            <div style={INFO_STYLE}>
                <h1 style={NAME_STYLE} data-testid="profile-header-name">
                    {displayName}
                </h1>
                {trimmedEmail.length > 0 ? (
                    <p
                        style={EMAIL_STYLE}
                        data-testid="profile-header-email"
                    >
                        {trimmedEmail}
                    </p>
                ) : null}
            </div>
        </GlassPanel>
    )
}

export default ProfileHeader
