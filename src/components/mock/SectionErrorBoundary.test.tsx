import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import { MockList } from './MockList'

/**
 * `<SectionErrorBoundary />` — guard for sibling sections of
 * `Mock_Module` (task 20.1, Req 17.3).
 *
 * Validates:
 *
 *   1. Стандартное поведение boundary: render-throw в child →
 *      fallback `data-ds="..."`-обёртка с inline `<ErrorState />`.
 *   2. `renderEmptyOnError`: при ошибке возвращает `null` —
 *      поведение, нужное `MockFilters` (фильтры исчезают, sibling
 *      `MockList` остаётся работоспособным).
 *   3. **Сиблинг-изоляция (Req 17.3, ключевой инвариант task 20.1):**
 *      когда одна секция (фильтры) краш-нутая, другая (список)
 *      продолжает рендерить карточки и принимать клики/навигацию.
 *      Это конструктивно гарантировано тем, что границы стоят
 *      на сиблингах, а не на родителе.
 *   4. Retry-семантика: вызов внешнего `retry`-callback +
 *      инкрементальный ремонт поддерева.
 */

afterEach(() => cleanup())

function Boom(): never {
    throw new Error('boom')
}

// Suppress React's noisy console.error for these intentional throws.
let originalError: typeof console.error
beforeAll(() => {
    originalError = console.error
    console.error = () => {}
})
afterAll(() => {
    console.error = originalError
})

// Tiny shim so this file remains self-contained without bringing the
// vitest globals types into scope of test discovery filters.
function beforeAll(fn: () => void) {
    // @ts-expect-error vitest exposes beforeAll on import in this env
    return import('vitest').then(({ beforeAll: ba }) => ba(fn))
}
function afterAll(fn: () => void) {
    // @ts-expect-error vitest exposes afterAll on import in this env
    return import('vitest').then(({ afterAll: aa }) => aa(fn))
}

describe('SectionErrorBoundary', () => {
    it('renders ErrorState fallback when child throws (default branch)', () => {
        const { container, queryByRole } = render(
            <SectionErrorBoundary>
                <Boom />
            </SectionErrorBoundary>,
        )
        // Default fallback dataset.
        const fallback = container.querySelector(
            '[data-ds="mock-section-error-boundary-fallback"]',
        )
        expect(fallback).not.toBeNull()
        // ErrorState exposes role="alert".
        expect(queryByRole('alert')).not.toBeNull()
    })

    it('honours `fallbackDataDs`', () => {
        const { container } = render(
            <SectionErrorBoundary fallbackDataDs="custom-fallback">
                <Boom />
            </SectionErrorBoundary>,
        )
        expect(
            container.querySelector('[data-ds="custom-fallback"]'),
        ).not.toBeNull()
    })

    it('renderEmptyOnError → returns null fallback', () => {
        const { container } = render(
            <SectionErrorBoundary renderEmptyOnError>
                <Boom />
            </SectionErrorBoundary>,
        )
        // No alert, no fallback wrapper.
        expect(container.querySelector('[role="alert"]')).toBeNull()
        expect(
            container.querySelector(
                '[data-ds="mock-section-error-boundary-fallback"]',
            ),
        ).toBeNull()
    })

    it('calls onError when child throws', () => {
        const onError = vi.fn()
        render(
            <SectionErrorBoundary onError={onError}>
                <Boom />
            </SectionErrorBoundary>,
        )
        expect(onError).toHaveBeenCalledTimes(1)
        expect((onError.mock.calls[0][0] as Error).message).toBe('boom')
    })

    it('retry button calls external retry and remounts the subtree', () => {
        // Module-scoped flag (not a render counter) — robust to React 19
        // concurrent-rendering recovery passes that may invoke a failing
        // child more than once before showing the fallback.
        let shouldThrow = true
        const externalRetry = vi.fn(() => {
            // First retry click flips the flag — next mount returns ok.
            shouldThrow = false
        })
        const Child = () => {
            if (shouldThrow) throw new Error('boom')
            return <div data-testid="child-ok">ok</div>
        }

        const { container, getByRole, queryByTestId } = render(
            <SectionErrorBoundary retry={externalRetry}>
                <Child />
            </SectionErrorBoundary>,
        )
        // First render: child threw → fallback shown.
        expect(
            container.querySelector(
                '[data-ds="mock-section-error-boundary-fallback"]',
            ),
        ).not.toBeNull()

        // Click retry — boundary calls externalRetry (flips flag) then
        // remounts subtree via retryKey.
        fireEvent.click(getByRole('button'))
        expect(externalRetry).toHaveBeenCalledTimes(1)
        // Subtree successfully remounted with the non-throwing child.
        expect(queryByTestId('child-ok')).not.toBeNull()
    })

    it('sibling isolation: filter crash does not break sibling list (Req 17.3)', () => {
        // Compose the canonical Mock_Module sibling pair: a filters-style
        // section that throws on mount, and a real `<MockList />` next to it.
        const FiltersThatThrow = () => {
            throw new Error('filters mount failed')
        }

        const { container, queryAllByTestId } = render(
            <div>
                <SectionErrorBoundary
                    renderEmptyOnError
                    fallbackDataDs="filters-fallback"
                >
                    <FiltersThatThrow />
                </SectionErrorBoundary>
                <MockList
                    mocks={[
                        {
                            id: 'a',
                            title: 'A',
                            difficulty: 2,
                            category: 'X',
                            averageRating: 4,
                            commentCount: 1,
                        },
                        {
                            id: 'b',
                            title: 'B',
                            difficulty: 4,
                            category: 'Y',
                            averageRating: 3,
                            commentCount: 0,
                        },
                    ]}
                />
            </div>,
        )

        // Filters fallback is empty (renderEmptyOnError) — nothing visible.
        expect(
            container.querySelector('[data-ds="filters-fallback"]'),
        ).toBeNull()

        // Sibling list still mounted and rendering both cards.
        const cards = queryAllByTestId('mock-card')
        expect(cards.length).toBe(2)

        // Mock card links still resolve to /mock/{id} — opening
        // /mock/[id] remains functional even when filters crashed.
        const links = queryAllByTestId(
            'mock-card-link',
        ) as HTMLAnchorElement[]
        expect(links.map((l) => l.getAttribute('href'))).toEqual([
            '/mock/a',
            '/mock/b',
        ])
    })
})
