import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import { AchievementsGrid, type Achievement } from './AchievementsGrid'
import { t } from '@/lib/i18n'

/**
 * `<AchievementsGrid />` — unit tests (task 21.3).
 *
 * Validates the behavioural contract documented in Requirements
 * 18.1 / 18.2 / 22.1 / 1.8 / 24.2:
 *
 *   - Пустой список → `<EmptyState />` с локализованными строками,
 *     сама сетка `<ul data-testid="achievements-grid">` не рендерится.
 *   - Непустой список → элементы в порядке входного массива, каждый
 *     с data-атрибутами `data-achievement-unlocked` и id.
 *   - Locked-плитки получают grayscale-фильтр на icon-wrapper.
 *   - Badge-статусы локализованы и соответствуют `unlocked`.
 *   - Корень — `GlassCard` c классом `.glass`.
 */

afterEach(() => cleanup())

const mkIcon = () => <span data-testid="icon-inner">★</span>

const sample: readonly Achievement[] = [
    { id: 'a1', name: 'Первый шаг', icon: mkIcon(), unlocked: true },
    { id: 'a2', name: 'Марафонец', icon: mkIcon(), unlocked: false },
    { id: 'a3', name: 'Топ', icon: mkIcon(), unlocked: true },
] as const

describe('<AchievementsGrid />', () => {
    it('renders EmptyState when achievements list is empty', () => {
        const { queryByTestId, getByRole, getByText } = render(
            <AchievementsGrid achievements={[]} />,
        )
        // Сетка не смонтирована.
        expect(queryByTestId('achievements-grid')).toBeNull()
        // EmptyState: role="status" и локализованный заголовок присутствует.
        expect(getByRole('status')).toBeTruthy()
        expect(
            getByText(t('profile.achievements.empty.title')),
        ).toBeTruthy()
    })

    it('renders the achievements grid with stable order when list is non-empty', () => {
        const { getByTestId } = render(
            <AchievementsGrid achievements={sample} />,
        )
        const grid = getByTestId('achievements-grid')
        const items = Array.from(
            grid.querySelectorAll('[data-achievement-id]'),
        )
        expect(items.map((el) => el.getAttribute('data-achievement-id'))).toEqual(
            ['a1', 'a2', 'a3'],
        )
    })

    it('renders the localized section title', () => {
        const { getByText } = render(
            <AchievementsGrid achievements={sample} />,
        )
        expect(getByText(t('profile.achievements.title'))).toBeTruthy()
    })

    it('applies grayscale filter to locked achievement icon-wrappers only', () => {
        const { getByTestId } = render(
            <AchievementsGrid achievements={sample} />,
        )
        const unlocked = getByTestId('achievement-icon-a1') as HTMLElement
        const locked = getByTestId('achievement-icon-a2') as HTMLElement
        expect(unlocked.style.filter).toBe('')
        expect(locked.style.filter).toBe('grayscale(1)')
        // Opacity также снижается, но ненулевая — иконка остаётся видимой.
        expect(Number(locked.style.opacity)).toBeGreaterThan(0)
        expect(Number(locked.style.opacity)).toBeLessThan(1)
    })

    it('uses success badge for unlocked and neutral badge for locked', () => {
        const { getByTestId } = render(
            <AchievementsGrid achievements={sample} />,
        )
        const unlockedBadge = getByTestId('achievement-badge-a1')
        const lockedBadge = getByTestId('achievement-badge-a2')
        expect(unlockedBadge.getAttribute('data-variant')).toBe('success')
        expect(lockedBadge.getAttribute('data-variant')).toBe('neutral')
        expect(unlockedBadge.textContent).toBe(
            t('profile.achievements.unlocked'),
        )
        expect(lockedBadge.textContent).toBe(
            t('profile.achievements.locked'),
        )
    })

    it('exposes unlocked state and id as data attributes per item', () => {
        const { getByTestId } = render(
            <AchievementsGrid achievements={sample} />,
        )
        const unlockedItem = getByTestId('achievement-item-a1')
        const lockedItem = getByTestId('achievement-item-a2')
        expect(unlockedItem.getAttribute('data-achievement-unlocked')).toBe(
            'true',
        )
        expect(lockedItem.getAttribute('data-achievement-unlocked')).toBe(
            'false',
        )
    })

    it('uses CSS Grid with auto-fill columns at minmax(120px, 1fr)', () => {
        const { getByTestId } = render(
            <AchievementsGrid achievements={sample} />,
        )
        const grid = getByTestId('achievements-grid') as HTMLElement
        expect(grid.style.display).toBe('grid')
        expect(grid.style.gridTemplateColumns).toBe(
            'repeat(auto-fill, minmax(120px, 1fr))',
        )
    })

    it('exposes glass class and data-profile-section on the root', () => {
        const { container } = render(
            <AchievementsGrid achievements={sample} />,
        )
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.getAttribute('data-profile-section')).toBe(
            'achievements',
        )
    })

    it('merges a custom className with the glass class', () => {
        const { container } = render(
            <AchievementsGrid
                className="custom-wrap"
                achievements={sample}
            />,
        )
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('glass')).toBe(true)
        expect(root.classList.contains('custom-wrap')).toBe(true)
    })
})
