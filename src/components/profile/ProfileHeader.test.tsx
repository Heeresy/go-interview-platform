import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import { ProfileHeader } from './ProfileHeader'
import { t } from '@/lib/i18n'

/**
 * `<ProfileHeader />` — unit tests (task 21.1).
 *
 * Validates the behavioural contract documented in Requirements
 * 18.1 / 18.2 / 22.1 / 1.8 / 24.2:
 *
 *   - Рендер аватара: если `avatarUrl` передан — <img>; иначе — иконка
 *     User из lucide-react.
 *   - Имя: приоритет name → email → t('profile.header.title').
 *   - Email: отображается при наличии; скрыт при отсутствии.
 *   - Корень — `GlassPanel` (класс `.glass`).
 *   - `data-user-id` проставлен на корне для идентификации.
 */

afterEach(() => cleanup())

describe('<ProfileHeader />', () => {
    it('renders User icon placeholder when avatarUrl is missing', () => {
        const { getByTestId, queryByTestId } = render(
            <ProfileHeader user={{ id: 'u1', email: 'user@example.com' }} />,
        )
        expect(getByTestId('profile-header-avatar-icon')).toBeTruthy()
        expect(queryByTestId('profile-header-avatar-image')).toBeNull()
    })

    it('renders <img> avatar when avatarUrl is provided', () => {
        const { getByTestId, queryByTestId } = render(
            <ProfileHeader
                user={{
                    id: 'u2',
                    email: 'u2@example.com',
                    avatarUrl: 'https://example.com/a.png',
                }}
            />,
        )
        const img = getByTestId('profile-header-avatar-image') as HTMLImageElement
        expect(img.tagName).toBe('IMG')
        expect(img.getAttribute('src')).toBe('https://example.com/a.png')
        // Алт — декоративный, имя читается по <h1>.
        expect(img.getAttribute('alt')).toBe('')
        expect(queryByTestId('profile-header-avatar-icon')).toBeNull()
    })

    it('prefers explicit name when rendering the heading', () => {
        const { getByTestId } = render(
            <ProfileHeader
                user={{ id: 'u3', name: 'Ada Lovelace', email: 'ada@example.com' }}
            />,
        )
        expect(getByTestId('profile-header-name').textContent).toBe(
            'Ada Lovelace',
        )
    })

    it('falls back to email when name is empty', () => {
        const { getByTestId } = render(
            <ProfileHeader user={{ id: 'u4', name: '   ', email: 'fallback@example.com' }} />,
        )
        expect(getByTestId('profile-header-name').textContent).toBe(
            'fallback@example.com',
        )
    })

    it('falls back to t("profile.header.title") when both name and email are missing', () => {
        const { getByTestId, queryByTestId } = render(
            <ProfileHeader user={{ id: 'u5' }} />,
        )
        expect(getByTestId('profile-header-name').textContent).toBe(
            t('profile.header.title'),
        )
        // Email-блок не рендерится без email.
        expect(queryByTestId('profile-header-email')).toBeNull()
    })

    it('renders email block when email is provided', () => {
        const { getByTestId } = render(
            <ProfileHeader user={{ id: 'u6', name: 'X', email: 'x@y.z' }} />,
        )
        expect(getByTestId('profile-header-email').textContent).toBe('x@y.z')
    })

    it('exposes data-user-id and glass class on the root', () => {
        const { container } = render(
            <ProfileHeader user={{ id: 'root-id' }} />,
        )
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.getAttribute('data-profile-section')).toBe('header')
        expect(root.getAttribute('data-user-id')).toBe('root-id')
    })

    it('merges custom className with the glass class', () => {
        const { container } = render(
            <ProfileHeader
                className="custom-wrap"
                user={{ id: 'u7' }}
            />,
        )
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.classList.contains('custom-wrap')).toBe(true)
    })
})
