import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'

import { PROFILE_BENTO_SLOTS, StatsBento } from './StatsBento'

/**
 * `<StatsBento />` — unit tests (task 21.1).
 *
 * Validates the behavioural contract documented in Requirements
 * 18.1 / 18.2 / 22.4:
 *
 *   - `PROFILE_BENTO_SLOTS === 4` — одна точка правды.
 *   - Компонент рендерит РОВНО 4 `.bento-item`-плитки.
 *   - Раскладка slots: индексы 0..3 соответствуют семантическим
 *     именам profile / stats / achievements / activity.
 *   - Каждая плитка получает colSpan=6, rowSpan=1 (6+6 / 6+6).
 *   - Runtime-guard (dev) бросает при некорректной длине массива,
 *     даже если TypeScript обошли через `as any`.
 *
 * Компонент ⟶ `<BentoGrid />` → `.bento-grid` с 4 детьми `.bento-item`.
 */

afterEach(() => cleanup())

const mkSlots = () =>
    [
        <span key="0" data-testid="s0">
            profile
        </span>,
        <span key="1" data-testid="s1">
            stats
        </span>,
        <span key="2" data-testid="s2">
            ach
        </span>,
        <span key="3" data-testid="s3">
            act
        </span>,
    ] as const

describe('PROFILE_BENTO_SLOTS', () => {
    it('equals exactly 4', () => {
        expect(PROFILE_BENTO_SLOTS).toBe(4)
    })
})

describe('<StatsBento />', () => {
    it('renders exactly PROFILE_BENTO_SLOTS BentoItem cells', () => {
        const { container } = render(<StatsBento slots={mkSlots()} />)
        const items = container.querySelectorAll('.bento-item')
        expect(items.length).toBe(PROFILE_BENTO_SLOTS)
    })

    it('renders slot contents in order and tags them with semantic slot names', () => {
        const { container, getByTestId } = render(
            <StatsBento slots={mkSlots()} />,
        )
        // Содержимое каждого слота присутствует в DOM.
        expect(getByTestId('s0').textContent).toBe('profile')
        expect(getByTestId('s1').textContent).toBe('stats')
        expect(getByTestId('s2').textContent).toBe('ach')
        expect(getByTestId('s3').textContent).toBe('act')

        // Семантические имена data-profile-bento-slot расставлены
        // в контрактном порядке profile / stats / achievements / activity.
        const named = Array.from(
            container.querySelectorAll('[data-profile-bento-slot]'),
        ).map((el) => el.getAttribute('data-profile-bento-slot'))
        expect(named).toEqual([
            'profile',
            'stats',
            'achievements',
            'activity',
        ])
    })

    it('applies 6+6 / 6+6 grid spans (colSpan=6, rowSpan=1) to every slot', () => {
        const { container } = render(<StatsBento slots={mkSlots()} />)
        const items = Array.from(
            container.querySelectorAll('.bento-item'),
        ) as HTMLElement[]
        expect(items.length).toBe(4)
        for (const el of items) {
            // `BentoItem` проставляет span через inline-style как строку.
            expect(el.style.gridColumn).toBe('span 6')
            expect(el.style.gridRow).toBe('span 1')
        }
    })

    it('exposes root-level data attributes for CI / tooling checks', () => {
        const { container } = render(<StatsBento slots={mkSlots()} />)
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('bento-grid')).toBe(true)
        expect(root.getAttribute('data-profile-bento')).toBe('')
        expect(root.getAttribute('data-profile-bento-slots')).toBe(
            String(PROFILE_BENTO_SLOTS),
        )
    })

    it('merges a custom className with the base .bento-grid', () => {
        const { container } = render(
            <StatsBento className="profile-bento-wrap" slots={mkSlots()} />,
        )
        const root = container.firstChild as HTMLElement
        expect(root.classList.contains('bento-grid')).toBe(true)
        expect(root.classList.contains('profile-bento-wrap')).toBe(true)
    })

    it('runtime-guards against wrong-length slot arrays in dev', () => {
        // TypeScript запретил бы передачу массива длины 3 — поэтому
        // намеренно обходим тип через `as any`, чтобы ударить по
        // runtime-проверке `assertProfileBentoSlotsLength`.
        const bad = [<span key="a" />, <span key="b" />, <span key="c" />] as unknown as readonly [
            ReactNode,
            ReactNode,
            ReactNode,
            ReactNode,
        ]
        expect(() => render(<StatsBento slots={bad} />)).toThrow(
            /ровно 4 слот/,
        )
    })
})
