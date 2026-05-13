'use client'

/**
 * `<CardErrorBoundary />` — общий wrapper для Dashboard-карточек DS v2.
 *
 * Контракт (Requirements 5.5, 5.6, 20.3, 22.4):
 *
 *   - Ловит любой runtime-throw из рендера карточки и подменяет её
 *     на inline `<ErrorState messageKey="state.error.unknown"
 *     retry={...} />` (Req 5.5). Сама по себе граница **не знает**,
 *     как перезапустить загрузку карточки — если родитель хочет это
 *     контролировать, он передаёт `retry` пропом. Типичный паттерн
 *     родителя — `useCallback(() => setReloadNonce(n => n + 1), [])`
 *     плюс reloadNonce в dep-array `useEffect` карточки.
 *
 *   - Retry-семантика:
 *       * **`retry` передан извне.** ErrorState получает обёртку, которая
 *         сначала вызывает `props.retry()` (инкрементит nonce у
 *         родителя), а затем сбрасывает `hasError` + `retryKey` у
 *         самого boundary, чтобы ребёнок гарантированно пере-
 *         монтировался даже при render-throw-е. Вызов `props.retry()`
 *         обёрнут в try/catch — крах callback-а не должен оставить
 *         boundary в сломанном состоянии.
 *       * **`retry` не передан.** Boundary сам ремонтирует поддерево
 *         через смену внутреннего `retryKey`. Это корректно обрабатывает
 *         изолированный render-throw из render-цепочки (например, TDZ,
 *         прочитанный state с неожиданной формой) без участия родителя.
 *
 *   - Изоляция сиблингов (Req 5.6): каждая карточка оборачивается в
 *     собственный экземпляр. Ошибка одной карточки никогда не рушит
 *     рендер соседних — классический React error boundary:
 *     `getDerivedStateFromError` поднимает `hasError=true` только в
 *     поддереве этого boundary, поэтому сиблинги в соседних BentoItem-ах
 *     продолжают рендериться со своим state-ом.
 *
 *   - Fallback обёрнут в `<GlassCard>`, чтобы визуально занимать то же
 *     место, что и нормальная карточка (высота/ширина Bento-ячейки),
 *     и сетка не «прыгала» при сбое. `data-ds="card-error-boundary-
 *     fallback"` помечает контейнер для property-тестов.
 *
 *   - `onError` — опциональный hook для аналитики/логирования. Вызов
 *     обёрнут в try/catch, чтобы его throw не каскадировал обратно
 *     через уже отрисованный fallback.
 *
 * Тест контракта изоляции сиблингов (Property 15, task 14.3b) опирается
 * на инвариант: любая success-карточка должна рендерить свой контент,
 * а сиблинги в состоянии error — только собственный ErrorState внутри
 * своей BentoItem-ячейки.
 */

import {
    Component,
    type CSSProperties,
    type ErrorInfo,
    type ReactNode,
} from 'react'

import { ErrorState, GlassCard } from '@/components/ui'

export interface CardErrorBoundaryProps {
    /** Содержимое карточки. Любой throw внутри будет перехвачен. */
    children: ReactNode
    /**
     * Опциональный внешний retry-коллбек. Обычно — `useCallback`
     * у родителя, инкрементирующий reload-nonce карточки. Если
     * передан, boundary делегирует ему перезапуск загрузки, при
     * этом всё равно сбрасывает собственный `hasError` и
     * ремонтирует поддерево, чтобы ребёнок не остался в fallback-е
     * при render-throw-е.
     */
    retry?: () => void
    /**
     * Опциональный hook на факт ошибки — для аналитики/логирования.
     * Вызов обёрнут в try/catch внутри boundary.
     */
    onError?: (error: Error, info: ErrorInfo) => void
    /**
     * Inline-стиль для fallback-контейнера. По умолчанию fallback
     * занимает ту же ширину/высоту, что и нормальная карточка (через
     * `height: 100%`), чтобы BentoItem-ячейка не схлопывалась.
     */
    fallbackStyle?: CSSProperties
    /**
     * Дополнительный className для fallback-обёртки `<GlassCard>`.
     */
    fallbackClassName?: string
}

interface CardErrorBoundaryState {
    hasError: boolean
    /**
     * Инкрементальный ключ поддерева. Любой retry увеличивает его,
     * что вынуждает React смонтировать свежий инстанс карточки со
     * сбросом всего локального state — самый надёжный способ
     * перезапустить загрузку, так как мы не знаем, какие useState/
     * useEffect карточка использует.
     */
    retryKey: number
}

const FALLBACK_STYLE: CSSProperties = {
    width: '100%',
    height: '100%',
    padding: 'var(--space-5)',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch',
    borderRadius: 'var(--radius-lg)',
}

export class CardErrorBoundary extends Component<
    CardErrorBoundaryProps,
    CardErrorBoundaryState
> {
    // Явно инициализируем state в конструкторе (а не через class-field
    // declaration), чтобы избежать любых тонкостей транспиляции class-
    // fields в тестовом окружении vite/vitest и гарантировать, что
    // `handleRetry` — полноценный метод прототипа с bind в конструкторе.
    constructor(props: CardErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, retryKey: 0 }
        this.handleRetry = this.handleRetry.bind(this)
    }

    static getDerivedStateFromError(): Partial<CardErrorBoundaryState> {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        // Изолируем возможную ошибку callback-а — fallback уже смонтирован
        // через getDerivedStateFromError, поэтому throw здесь не должен
        // ни остановить отрисовку fallback-а, ни пробиться вверх к соседям.
        try {
            this.props.onError?.(error, info)
        } catch {
            /* no-op — fallback UI already rendered */
        }
    }

    handleRetry(): void {
        // Порядок важен: сначала даём родителю перезапустить свою
        // загрузку (инкремент nonce), затем сбрасываем локальный
        // hasError + ремонтируем поддерево через новый retryKey.
        // Это покрывает оба сценария:
        //   1) Render-throw без внешнего retry — boundary сам чинит.
        //   2) Loader-fail с внешним retry — родитель тянет nonce,
        //      boundary следом ремонтирует, чтобы сетка перешла
        //      в свежий loading → success/error пайплайн.
        try {
            this.props.retry?.()
        } catch {
            /* no-op — не позволяем callback-у оставить boundary «залипшим» */
        }
        this.setState((prev) => ({
            hasError: false,
            retryKey: prev.retryKey + 1,
        }))
    }

    render(): ReactNode {
        const { children, fallbackStyle, fallbackClassName } = this.props
        const { hasError, retryKey } = this.state

        if (hasError) {
            return (
                <GlassCard
                    className={fallbackClassName}
                    style={{ ...FALLBACK_STYLE, ...fallbackStyle }}
                    data-ds="card-error-boundary-fallback"
                >
                    <ErrorState
                        messageKey="state.error.unknown"
                        retry={this.handleRetry}
                    />
                </GlassCard>
            )
        }

        // `key` пробрасывается детям через фрагмент с ключом, чтобы
        // retry полностью ремонтировал поддерево (сброс useState/useEffect).
        return <RetryKeyScope keyValue={retryKey}>{children}</RetryKeyScope>
    }
}

/**
 * Тонкая обёртка, единственная задача которой — продвинуть React key
 * к детям через промежуточный узел. Смена `keyValue` вынуждает
 * React уничтожить старое поддерево и создать новое.
 */
function RetryKeyScope({
    keyValue,
    children,
}: {
    keyValue: number
    children: ReactNode
}): ReactNode {
    return (
        <div key={keyValue} style={{ display: 'contents' }}>
            {children}
        </div>
    )
}

export default CardErrorBoundary
