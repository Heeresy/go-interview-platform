/**
 * Fuzzy string matching and filtering for Command_Palette (Requirement 7).
 *
 * Публичный API:
 *   - fuzzyScore(text, query): скоринг подпоследовательности символов с бонусом
 *     за совпадение в начале слова и за подряд идущие совпадения.
 *   - fuzzyFilter(items, query, options): чистая функция, возвращает отсортированный
 *     по score массив. Пустой запрос возвращает items в исходном стабильном порядке.
 *
 * Budget enforcement (Req 7.5):
 *   Каждые BUDGET_CHECK_INTERVAL (32) итераций сверяется performance.now() - start;
 *   если прошло ≥ deadlineMs (default 50) или signal.aborted — цикл прерывается,
 *   возвращаются накопленные частичные результаты. Функция не владеет AbortController —
 *   вызывающий код (CommandPalette) создаёт новый контроллер на каждый ввод и отменяет
 *   предыдущий; отменённая операция не блокирует запуск фильтра для нового запроса.
 *
 * Целевая производительность: ≤ 50ms на 100 элементов (Req 7.4).
 */

/** Опции поведения fuzzyFilter. */
export interface FuzzyFilterOptions {
    /** Максимальное время (ms) до возврата частичных результатов. Default 50. */
    deadlineMs?: number
    /** AbortSignal для отмены фильтрации. Abort → ранний выход с накопленным. */
    signal?: AbortSignal
}

/** Минимальный контракт элемента, поддерживаемого fuzzyFilter. */
export interface FuzzyItem {
    title: string
}

/** Шаг проверки бюджета/отмены в тесных циклах. */
const BUDGET_CHECK_INTERVAL = 32

/** Бюджет по умолчанию согласно Req 7.4/7.5. */
const DEFAULT_DEADLINE_MS = 50

// Scoring weights — вынесены в константы, чтобы не плодить magic numbers.
const SCORE_BASE_HIT = 1
const SCORE_WORD_START_BONUS = 8
const SCORE_CONSECUTIVE_BONUS = 4

/** Монотоничный таймер: performance.now() в браузере/jsdom, fallback на Date.now(). */
function now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now()
    }
    return Date.now()
}

/**
 * Символ считается границей слова, если перед ним нет символа (начало строки) или
 * предыдущий символ не является буквой/цифрой (включая юникод-алфавиты).
 */
function isWordBoundary(prevChar: string | undefined): boolean {
    if (prevChar === undefined) return true
    return !/[\p{L}\p{N}]/u.test(prevChar)
}

/**
 * Возвращает неотрицательный score, если query — подпоследовательность символов text
 * (без учёта регистра), иначе 0.
 *
 * Бонусы:
 *   +SCORE_WORD_START_BONUS, если совпадение в начале слова;
 *   +SCORE_CONSECUTIVE_BONUS, если совпадение сразу после предыдущего совпадения;
 *   +SCORE_BASE_HIT за каждый подпоследовательный символ.
 *
 * Пустой query возвращает 0 — "пустой запрос" обрабатывается на уровне fuzzyFilter.
 */
export function fuzzyScore(text: string, query: string): number {
    if (query.length === 0) return 0

    const t = text.toLowerCase()
    const q = query.toLowerCase()

    let score = 0
    let queryIdx = 0
    // sentinel: первое совпадение не должно трактоваться как подряд идущее
    let prevMatchIdx = -2

    for (let i = 0; i < t.length && queryIdx < q.length; i++) {
        if (t[i] === q[queryIdx]) {
            score += SCORE_BASE_HIT

            const prevChar = i === 0 ? undefined : t[i - 1]
            if (isWordBoundary(prevChar)) {
                score += SCORE_WORD_START_BONUS
            }
            if (i === prevMatchIdx + 1) {
                score += SCORE_CONSECUTIVE_BONUS
            }

            prevMatchIdx = i
            queryIdx++
        }
    }

    // query не полностью покрыт подпоследовательностью → не совпало
    if (queryIdx < q.length) return 0

    return score
}

/**
 * Чистая функция фильтрации + сортировки по score.
 *
 * Контракты:
 *   1. query === ""  → возвращает items.slice() (стабильный исходный порядок).
 *   2. query !== ""  → оставляет только items c fuzzyScore(title, query) > 0,
 *      сортирует по убыванию score, tie-break по исходному индексу (стабильно).
 *   3. Budget/abort → каждые 32 итерации проверяем signal.aborted и time-budget;
 *      при срабатывании — выходим из цикла и возвращаем накопленные результаты
 *      (может быть пустым массивом).
 *   4. Сортировка выполняется на уже собранном подмножестве; сортировка дешёвая и
 *      не тормозит typing latency даже при ранней отмене — мы сортируем только то,
 *      что успели собрать.
 */
export function fuzzyFilter<T extends FuzzyItem>(
    items: readonly T[],
    query: string,
    options: FuzzyFilterOptions = {}
): T[] {
    const { deadlineMs = DEFAULT_DEADLINE_MS, signal } = options

    // Пустой запрос: исходный порядок, новый массив (чтобы вызывающий не портил items).
    if (query.length === 0) {
        return items.slice()
    }

    // Пред-отмена: если сигнал уже aborted до старта — никакой работы не делаем.
    if (signal?.aborted) {
        return []
    }

    const start = now()
    const scored: Array<{ item: T; score: number; index: number }> = []

    for (let i = 0; i < items.length; i++) {
        // Периодический budget check — без оверхеда на каждой итерации.
        if (i > 0 && i % BUDGET_CHECK_INTERVAL === 0) {
            if (signal?.aborted) break
            if (now() - start >= deadlineMs) break
        }

        const item = items[i]
        const s = fuzzyScore(item.title, query)
        if (s > 0) {
            scored.push({ item, score: s, index: i })
        }
    }

    // Стабильная сортировка: Array.prototype.sort стабилен с ES2019, но
    // явная tie-break по index делает порядок детерминированным.
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.index - b.index
    })

    return scored.map((s) => s.item)
}
