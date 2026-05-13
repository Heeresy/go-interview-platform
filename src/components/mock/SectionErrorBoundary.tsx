'use client'

/**
 * `<SectionErrorBoundary />` — ErrorBoundary для сегментов
 * `Mock_Module` (task 20.1, Requirements 17.2, 17.3).
 *
 * Контракт:
 *
 *   - `MockList` и `MockFilters` — сиблинги. Каждый оборачивается в
 *     собственный экземпляр этой границы. Ошибка одного **не может**
 *     деградировать другой (Req 17.3: при крахе монтирования/
 *     раскрытия фильтров клики по карточкам, открытие `/mock/[id]`,
 *     рейтинг и комментарии остаются работоспособными).
 *
 *   - Fallback — тонкий inline-блок на основе `<ErrorState />` (см.
 *     `@/components/ui`) с `messageKey="state.error.unknown"` и
 *     кнопкой «Повторить». Никакого полноэкранного overlay, никакого
 *     блокирующего баннера — fallback живёт строго в границах
 *     собственного сегмента.
 *
 *   - Для фильтров на мобайле допустима ветка `renderEmptyOnError`:
 *     при указанном значении `true` fallback не рендерится вовсе,
 *     сегмент становится «невидимым», чтобы не занимать место на
 *     экране и не мешать списку. По умолчанию рендерим минимальный
 *     ErrorState — разработчик принимает решение по каждому сегменту
 *     отдельно.
 *
 *   - Retry-семантика: повторяет паттерн `CardErrorBoundary`
 *     (dashboard). При вызове сначала — опциональный внешний
 *     callback `retry` (обёрнут в try/catch), затем — инкремент
 *     внутреннего `retryKey` для принудительного ремонта поддерева.
 *     Это закрывает оба случая: render-throw из самого сегмента
 *     (boundary сам чинит) и loader-fail (родитель чинит nonce).
 *
 *   - `onError` — опциональный hook для аналитики/логирования; throw
 *     внутри обёрнут в try/catch, чтобы не каскадировать через уже
 *     смонтированный fallback.
 */

import {
    Component,
    type CSSProperties,
    type ErrorInfo,
    type ReactNode,
} from 'react'

import { ErrorState } from '@/components/ui'

export interface SectionErrorBoundaryProps {
    /** Содержимое сегмента. Любой throw внутри будет перехвачен. */
    children: ReactNode
    /**
     * Опциональный внешний retry-коллбек. Типично: `useCallback`
     * у родителя, инкрементирующий reload-nonce. Boundary всё равно
     * ремонтирует поддерево после вызова — чтобы сегмент не остался
     * «залипшим» в fallback при render-throw-е.
     */
    retry?: () => void
    /**
     * Опциональный hook на факт ошибки — для аналитики.
     * Вызов внутри обёрнут в try/catch.
     */
    onError?: (error: Error, info: ErrorInfo) => void
    /**
     * Если `true` — при ошибке сегмент отрисовывает пустой
     * fragment (ничего) вместо inline `<ErrorState />`. Это полезно
     * для MockFilters: при ошибке фильтров sticky-панель скрывается,
     * а список карточек получает полную ширину и остаётся
     * полностью функциональным (Req 17.3).
     * @default false
     */
    renderEmptyOnError?: boolean
    /** Inline-стиль для fallback-обёртки. */
    fallbackStyle?: CSSProperties
    /** Дополнительный className для fallback-обёртки. */
    fallbackClassName?: string
    /**
     * data-атрибут для тестов / диагностики. По умолчанию
     * `"mock-section-error-boundary-fallback"`.
     */
    fallbackDataDs?: string
}

interface SectionErrorBoundaryState {
    hasError: boolean
    /**
     * Инкрементальный ключ поддерева: любой retry увеличивает его,
     * что вынуждает React смонтировать свежий инстанс сегмента.
     */
    retryKey: number
}

const FALLBACK_WRAPPER_STYLE: CSSProperties = {
    width: '100%',
    minWidth: 0,
}

export class SectionErrorBoundary extends Component<
    SectionErrorBoundaryProps,
    SectionErrorBoundaryState
> {
    constructor(props: SectionErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, retryKey: 0 }
        this.handleRetry = this.handleRetry.bind(this)
    }

    static getDerivedStateFromError(): Partial<SectionErrorBoundaryState> {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        try {
            this.props.onError?.(error, info)
        } catch {
            /* no-op — fallback UI already rendered */
        }
    }

    handleRetry(): void {
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
        const {
            children,
            fallbackStyle,
            fallbackClassName,
            fallbackDataDs,
            renderEmptyOnError,
        } = this.props
        const { hasError, retryKey } = this.state

        if (hasError) {
            if (renderEmptyOnError) {
                // Полностью «невидимая» ветка: фильтры пропадают, список
                // в сиблинге продолжает работать (Req 17.3).
                return null
            }
            return (
                <div
                    className={fallbackClassName}
                    style={{ ...FALLBACK_WRAPPER_STYLE, ...fallbackStyle }}
                    data-ds={
                        fallbackDataDs ??
                        'mock-section-error-boundary-fallback'
                    }
                >
                    <ErrorState
                        messageKey="state.error.unknown"
                        retry={this.handleRetry}
                    />
                </div>
            )
        }

        return <RetryKeyScope keyValue={retryKey}>{children}</RetryKeyScope>
    }
}

/**
 * Тонкая обёртка, которая через React `key` ремонтирует поддерево
 * при смене `keyValue`. `display: contents` не добавляет лишнего
 * визуального контейнера — layout сиблингов остаётся прежним.
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

export default SectionErrorBoundary
