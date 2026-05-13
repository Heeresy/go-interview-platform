'use client'

/**
 * `useCardData` — общий hook для dashboard-карточек DS v2.
 *
 * Контракт (Requirements 5.4, 5.5, 5.6, 20.1, 20.3):
 *
 *   - `data`, `isLoading`, `error`, `retry` — **строго локальны к
 *     инстансу карточки**. Никакого глобального state / контекста не
 *     используется. Это прямо закрывает Req 5.6: состояние одной
 *     карточки изолировано от сиблингов, и успешный fetch карточки
 *     не зависит от того, в каком состоянии находятся соседи.
 *
 *   - Начальное состояние — `isLoading=true`, что заставляет карточку
 *     сразу показать `<Skeleton />` (Req 5.4).
 *
 *   - При асинхронной ошибке loader-а карточка переходит в
 *     `error != null` / `isLoading=false`. UI тогда рендерит
 *     inline `<ErrorState retry={retry} />` (Req 5.5, 20.3). Retry
 *     локальный — он просто увеличивает `attempt`, что перезапускает
 *     эффект.
 *
 *   - `loader` пробрасывается через `useCallback` снаружи и хранится
 *     в ref, чтобы смена идентичности функции на каждом ренде
 *     родителя не порождала бесконечные re-fetch-ы. Эффект
 *     перезапускается только по `attempt`.
 *
 *   - Гонку между параллельными запросами решаем флагом `cancelled`
 *     в замыкании: результат устаревшего запроса просто отбрасывается.
 *
 *   - Если loader возвращает не-Promise или throw-ит синхронно,
 *     try/catch вокруг вызова гарантирует, что ошибка всё равно
 *     попадёт в state.error и не разрушит рендер всей карточки.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface CardDataState<T> {
    /** Загруженные данные. `null`, пока `isLoading` или есть `error`. */
    data: T | null
    /** Флаг активной загрузки. */
    isLoading: boolean
    /** Последняя ошибка загрузки. `null`, если ошибки нет. */
    error: Error | null
    /** Принудительно перезапустить loader. */
    retry: () => void
}

/**
 * Загружает данные карточки через `loader()` и управляет локальным
 * lifecycle (loading/success/error). Никакого внешнего контекста
 * не использует — state полностью принадлежит конкретному инстансу.
 *
 * @param loader фабрика Promise-а с данными карточки. Обычно — тонкая
 *               обёртка над Supabase-запросом или над `fetch`.
 */
export function useCardData<T>(loader: () => Promise<T>): CardDataState<T> {
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [attempt, setAttempt] = useState(0)

    // `loader` хранится в ref, чтобы смена идентичности функции (обычная
    // ситуация на каждом рендере родителя без useCallback) не порождала
    // бесконечные re-fetch-ы. Эффект перезапускается только по `attempt`.
    const loaderRef = useRef(loader)
    loaderRef.current = loader

    useEffect(() => {
        let cancelled = false
        setIsLoading(true)
        setError(null)

        const run = async () => {
            try {
                const result = await loaderRef.current()
                if (cancelled) return
                setData(result)
                setError(null)
                setIsLoading(false)
            } catch (e) {
                if (cancelled) return
                const err =
                    e instanceof Error ? e : new Error(String(e ?? 'Unknown error'))
                setError(err)
                setIsLoading(false)
            }
        }

        // Ловим синхронные throw-ы `run`, маловероятно, но строгий контракт.
        run().catch((e) => {
            if (cancelled) return
            const err =
                e instanceof Error ? e : new Error(String(e ?? 'Unknown error'))
            setError(err)
            setIsLoading(false)
        })

        return () => {
            cancelled = true
        }
    }, [attempt])

    const retry = useCallback(() => {
        setAttempt((n) => n + 1)
    }, [])

    return { data, isLoading, error, retry }
}
