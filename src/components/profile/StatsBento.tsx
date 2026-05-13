'use client'

/**
 * `<StatsBento />` — Bento-сетка раздела `/profile` РОВНО из 4 карточек
 * (Requirements 18.1, 18.2).
 *
 * Контракт (UI Redesign 2026, task 21.1):
 *
 *   - Число карточек **фиксировано** на уровне типа и не может быть
 *     ни больше, ни меньше 4. Реализация:
 *
 *       1. Exported `const PROFILE_BENTO_SLOTS = 4 as const` — единый
 *          источник истины, который можно импортировать из тестов/
 *          CI-скриптов и валидировать runtime.
 *       2. `ProfileBentoSlots` — readonly-кортеж длины 4, объявленный
 *          напрямую как `readonly [ReactNode, ReactNode, ReactNode,
 *          ReactNode]`. TypeScript гарантирует, что передать массив
 *          длины 3 или 5 невозможно без явного `as any`, причём
 *          `readonly`-модификатор дополнительно запрещает мутации
 *          (`push`, `pop`) на уровне типа.
 *       3. `AssertLength` — compile-time assertion, что
 *          `ProfileBentoSlots['length'] extends typeof PROFILE_BENTO_SLOTS`.
 *          Если кто-то расширит tuple до 5 — тип не скомпилируется.
 *       4. Runtime guard `assertProfileBentoSlotsLength()` в dev
 *          (непроизводственный билд) сверяется с `PROFILE_BENTO_SLOTS`
 *          и бросает ошибку при несовпадении. В `production`
 *          проверка деактивирована, чтобы не штрафовать бюджет
 *          (Req 12) — компиляция TS уже гарантирует корректность.
 *
 *   - Раскладка Bento — две строки по `6 + 6` колонок из 12-колоночной
 *     `BentoGrid` (предсказуемые spans, прямо из постановки задачи):
 *
 *        Row 1:  slot[0]  (6×1)  |  slot[1]  (6×1)
 *        Row 2:  slot[2]  (6×1)  |  slot[3]  (6×1)
 *
 *     Имена слотов по семантике Req 18.2:
 *        slot[0] = profile
 *        slot[1] = stats
 *        slot[2] = achievements
 *        slot[3] = activity
 *
 *     Заданы стабильные `data-profile-bento-slot` атрибуты (индексом
 *     и именем) — так тесты/CI могут проверить инвариант «ровно 4
 *     слота», не заглядывая в реализацию детей.
 *
 *   - Рендер через `BentoGrid` / `BentoItem` из `@/components/dashboard`
 *     (единственная актуальная реализация 12-колоночной сетки —
 *     Req 22.4, 5.2). Импортировать эту сетку в profile-модуль
 *     допустимо: `dashboard/` экспортирует `BentoGrid` как часть
 *     своего публичного API, а сам `BentoGrid` не содержит
 *     dashboard-специфичных допущений.
 *
 *   - Все строки — через `t('profile.*')` (Req 24.2). Хардкод-литералов
 *     (hex/rgb/px) нет; `BentoGrid` использует токены Design_System
 *     (Req 1.8).
 */

import type { ReactNode } from 'react'

import { BentoGrid, BentoItem } from '@/components/dashboard'

// ── Public contract ──────────────────────────────────────────────────────

/**
 * Единственный источник истины числа карточек Bento-сетки профиля.
 * Экспортируется для тестов, CI-скриптов и чтобы `readonly`-tuple
 * ниже мог структурно «сослаться» на это число через
 * `AssertLength<...>`.
 *
 * Изменение этой константы требует параллельного расширения/сужения
 * `ProfileBentoSlots` — иначе compile-time assertion упадёт.
 */
export const PROFILE_BENTO_SLOTS = 4 as const

/**
 * Readonly-кортеж длины `PROFILE_BENTO_SLOTS = 4`.
 *
 * Используется как тип пропа `slots`. Попытка передать массив длины
 * не равной 4 приводит к ошибке компиляции TypeScript — «пятый слот»
 * физически не проходит type-check.
 */
export type ProfileBentoSlots = readonly [
    ReactNode,
    ReactNode,
    ReactNode,
    ReactNode,
]

/**
 * Compile-time assertion: длина `ProfileBentoSlots` равна
 * `PROFILE_BENTO_SLOTS`. Если кто-то расширит tuple до 5, TypeScript
 * выдаст ошибку "Type 'X' does not satisfy the constraint 'Y'".
 */
type AssertLength<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ extends ProfileBentoSlots['length'] extends typeof PROFILE_BENTO_SLOTS
        ? true
        : false,
> = true
// Материализуем assertion: ошибка typecheck появится именно здесь,
// если `ProfileBentoSlots['length']` перестанет совпадать с
// `PROFILE_BENTO_SLOTS`. Переменная не экспортируется и не
// используется в runtime (поглощается tree-shaking).
const _assertProfileBentoSlotsLength: AssertLength<true> = true
void _assertProfileBentoSlotsLength

export interface StatsBentoProps {
    /**
     * Содержимое 4 плиток Bento-сетки профиля. Порядок:
     *   [0] — профиль
     *   [1] — сводная статистика
     *   [2] — достижения
     *   [3] — история активности
     *
     * Тип `readonly [ReactNode, ReactNode, ReactNode, ReactNode]`
     * гарантирует ровно 4 элемента на уровне TypeScript —
     * добавление пятого слота запрещено, см. module doc.
     */
    slots: ProfileBentoSlots
    /**
     * Дополнительный класс на корневой `<BentoGrid />`. Объединяется
     * после базового `.bento-grid`.
     */
    className?: string
}

// ── Runtime guard (dev-only) ─────────────────────────────────────────────

/**
 * Семантические имена слотов — в том же порядке, что и в
 * `ProfileBentoSlots`. Используется как `data-profile-bento-slot`
 * имя для селекторов тестов и CI-проверок.
 */
const SLOT_NAMES = [
    'profile',
    'stats',
    'achievements',
    'activity',
] as const

/**
 * Runtime-страховка числа карточек. В dev-режиме падает с ясной
 * ошибкой, если какой-либо консьюмер обойдёт type-check (`as any`)
 * и передаст tuple неправильной длины. В production деактивирована.
 */
function assertProfileBentoSlotsLength(slots: ReadonlyArray<ReactNode>): void {
    if (process.env.NODE_ENV === 'production') return
    if (slots.length !== PROFILE_BENTO_SLOTS) {
        throw new Error(
            `StatsBento: ожидалось ровно ${PROFILE_BENTO_SLOTS} слот(ов), получено ${slots.length}. ` +
                `Добавление/удаление слотов запрещено контрактом Requirement 18.2.`,
        )
    }
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Рендер 4 слотов Bento-сетки профиля в `BentoGrid` c раскладкой
 * `6+6` / `6+6` (две строки по две плитки).
 *
 * Каждый `BentoItem` помечен `data-profile-bento-slot` атрибутом
 * с индексом и семантическим именем — позволяет CI/тестам
 * валидировать «ровно 4 слота» без знания деталей дочерних
 * компонентов.
 */
export function StatsBento({ slots, className }: StatsBentoProps) {
    assertProfileBentoSlotsLength(slots)

    return (
        <BentoGrid
            className={className}
            data-profile-bento=""
            data-profile-bento-slots={PROFILE_BENTO_SLOTS}
        >
            {slots.map((slot, index) => (
                <BentoItem
                    key={index}
                    colSpan={6}
                    rowSpan={1}
                    data-profile-bento-slot={SLOT_NAMES[index]}
                    data-profile-bento-slot-index={index}
                >
                    {slot}
                </BentoItem>
            ))}
        </BentoGrid>
    )
}

export default StatsBento
