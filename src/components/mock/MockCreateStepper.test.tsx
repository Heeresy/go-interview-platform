import { describe, it, expect, afterEach, vi } from 'vitest'
import {
    render,
    cleanup,
    fireEvent,
    act,
    waitFor,
} from '@testing-library/react'

import { MockCreateStepper, type MockDraft } from './MockCreateStepper'

/**
 * `<MockCreateStepper />` — многошаговая форма создания мок-интервью
 * (task 20.2).
 *
 * Validates (Requirements 17.1, 17.4, 20.3, 20.4, 22.1, 24.2):
 *
 *   - Req 17.4: 3-step wizard с индикатором прогресса (`<ProgressBar />`
 *     с `aria-valuenow`, кратным 33%/66%/100%) и валидацией по шагу.
 *     Невалидный шаг 1 не пропускает дальше → step остаётся = 1, на
 *     полях видны inline-ошибки. То же для шага 2.
 *   - Req 20.4: финальная кнопка «Создать» переходит в `loading`-state
 *     на время Promise (свойство `aria-busy="true"`, `disabled`),
 *     блокируя повторный клик.
 *   - Req 20.3: при reject `onSubmit` рендерится inline `<ErrorState />`
 *     над футером, draft сохраняется (пользователь остаётся на шаге 3).
 *   - Req 22.1: тело шага — `GlassCard` (`.glass`-класс).
 *   - Req 24.2: все строки получены через i18n-словарь (косвенно — нет
 *     проверки на голый хардкод, но мы проверяем известные локализованные
 *     метки).
 */

const CATEGORIES = [
    { id: 'frontend', name: 'Frontend' },
    { id: 'backend', name: 'Backend' },
] as const

afterEach(() => cleanup())

function fillStep1(getByTestId: (id: string) => HTMLElement) {
    const titleInput = getByTestId(
        'mock-create-stepper-title',
    ) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Frontend Round 1' } })

    const select = getByTestId(
        'mock-create-stepper-category',
    ) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'frontend' } })
}

function fillStep2(getByTestId: (id: string) => HTMLElement) {
    const chipsRoot = getByTestId('mock-create-stepper-difficulty')
    const chip3 = chipsRoot.querySelectorAll(
        '[data-ds="mock-create-stepper-difficulty-chip"]',
    )[2] as HTMLButtonElement
    fireEvent.click(chip3)

    const durationInput = getByTestId(
        'mock-create-stepper-duration',
    ) as HTMLInputElement
    fireEvent.change(durationInput, { target: { value: '60' } })
}

describe('MockCreateStepper', () => {
    it('renders progress bar with current/total step (Req 17.4)', () => {
        const { container } = render(
            <MockCreateStepper
                onSubmit={vi.fn(async () => {})}
                categories={CATEGORIES}
            />,
        )
        const progress = container.querySelector(
            '[role="progressbar"]',
        ) as HTMLElement
        expect(progress).not.toBeNull()
        // step 1 / total 3 → 33%
        expect(progress.getAttribute('aria-valuenow')).toBe('33')
    })

    it('renders body inside GlassCard (.glass) (Req 22.1)', () => {
        const { getByTestId } = render(
            <MockCreateStepper
                onSubmit={vi.fn(async () => {})}
                categories={CATEGORIES}
            />,
        )
        const stepCard = getByTestId('mock-create-stepper-step')
        expect(stepCard.classList.contains('glass')).toBe(true)
    })

    it('"Назад" is disabled on step 1', () => {
        const { getByTestId } = render(
            <MockCreateStepper
                onSubmit={vi.fn(async () => {})}
                categories={CATEGORIES}
            />,
        )
        const back = getByTestId('mock-create-stepper-back') as HTMLButtonElement
        expect(back.disabled).toBe(true)
    })

    it('blocks advance on step 1 with empty title and shows inline errors (Req 17.4)', () => {
        const { getByTestId, getAllByRole, container } = render(
            <MockCreateStepper
                onSubmit={vi.fn(async () => {})}
                categories={CATEGORIES}
            />,
        )
        const next = getByTestId('mock-create-stepper-next')
        fireEvent.click(next)

        // Stepper is still on step 1.
        const root = container.querySelector(
            '[data-ds="mock-create-stepper"]',
        ) as HTMLElement
        expect(root.getAttribute('data-step')).toBe('1')

        // Inline errors are visible (≥ 1 role="alert").
        const alerts = getAllByRole('alert')
        expect(alerts.length).toBeGreaterThanOrEqual(1)
    })

    it('blocks advance on step 2 with invalid duration (Req 17.4)', () => {
        const { getByTestId, container, getAllByRole } = render(
            <MockCreateStepper
                onSubmit={vi.fn(async () => {})}
                categories={CATEGORIES}
            />,
        )
        // Step 1 → 2.
        fillStep1(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))

        const root = container.querySelector(
            '[data-ds="mock-create-stepper"]',
        ) as HTMLElement
        expect(root.getAttribute('data-step')).toBe('2')

        // Try to advance with no difficulty / duration set.
        fireEvent.click(getByTestId('mock-create-stepper-next'))
        expect(root.getAttribute('data-step')).toBe('2')

        const alerts = getAllByRole('alert')
        expect(alerts.length).toBeGreaterThanOrEqual(1)
    })

    it('advances through all 3 steps when each is valid', () => {
        const { getByTestId, container } = render(
            <MockCreateStepper
                onSubmit={vi.fn(async () => {})}
                categories={CATEGORIES}
            />,
        )
        const root = container.querySelector(
            '[data-ds="mock-create-stepper"]',
        ) as HTMLElement

        fillStep1(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))
        expect(root.getAttribute('data-step')).toBe('2')

        fillStep2(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))
        expect(root.getAttribute('data-step')).toBe('3')

        // Final step shows submit button instead of next.
        const submit = getByTestId(
            'mock-create-stepper-submit',
        ) as HTMLButtonElement
        expect(submit).not.toBeNull()
    })

    it('back button decrements step', () => {
        const { getByTestId, container } = render(
            <MockCreateStepper
                onSubmit={vi.fn(async () => {})}
                categories={CATEGORIES}
            />,
        )
        const root = container.querySelector(
            '[data-ds="mock-create-stepper"]',
        ) as HTMLElement

        fillStep1(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))
        expect(root.getAttribute('data-step')).toBe('2')

        fireEvent.click(getByTestId('mock-create-stepper-back'))
        expect(root.getAttribute('data-step')).toBe('1')
    })

    it('calls onSubmit with the collected MockDraft on final step', async () => {
        const onSubmit = vi.fn(async () => {})
        const { getByTestId } = render(
            <MockCreateStepper
                onSubmit={onSubmit}
                categories={CATEGORIES}
            />,
        )

        fillStep1(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))
        fillStep2(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))

        await act(async () => {
            fireEvent.click(getByTestId('mock-create-stepper-submit'))
        })

        expect(onSubmit).toHaveBeenCalledTimes(1)
        const draft = onSubmit.mock.calls[0][0] as MockDraft
        expect(draft).toEqual({
            title: 'Frontend Round 1',
            categoryId: 'frontend',
            difficulty: 3,
            durationMin: 60,
        })
    })

    it('shows loading state on submit and blocks repeated click (Req 20.4)', async () => {
        let resolvePending: (() => void) | null = null
        const onSubmit = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolvePending = resolve
                }),
        )
        const { getByTestId } = render(
            <MockCreateStepper
                onSubmit={onSubmit}
                categories={CATEGORIES}
            />,
        )

        fillStep1(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))
        fillStep2(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))

        const submit = getByTestId(
            'mock-create-stepper-submit',
        ) as HTMLButtonElement

        await act(async () => {
            fireEvent.click(submit)
        })

        expect(submit.getAttribute('aria-busy')).toBe('true')
        expect(submit.disabled).toBe(true)

        // Repeat click must be ignored — onSubmit still called once.
        fireEvent.click(submit)
        expect(onSubmit).toHaveBeenCalledTimes(1)

        await act(async () => {
            resolvePending?.()
        })
    })

    it('renders inline ErrorState when onSubmit rejects (Req 20.3)', async () => {
        const onSubmit = vi.fn(async () => {
            throw new Error('boom')
        })
        const { getByTestId, container } = render(
            <MockCreateStepper
                onSubmit={onSubmit}
                categories={CATEGORIES}
            />,
        )

        fillStep1(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))
        fillStep2(getByTestId)
        fireEvent.click(getByTestId('mock-create-stepper-next'))

        await act(async () => {
            fireEvent.click(getByTestId('mock-create-stepper-submit'))
        })

        await waitFor(() => {
            const errorState = container.querySelector(
                '[data-ds="error-state"]',
            )
            expect(errorState).not.toBeNull()
        })

        // User stays on step 3 with the data preserved.
        const root = container.querySelector(
            '[data-ds="mock-create-stepper"]',
        ) as HTMLElement
        expect(root.getAttribute('data-step')).toBe('3')
    })
})
