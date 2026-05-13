import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import { t } from '@/lib/i18n'
import TrainerProgressHeader from './TrainerProgressHeader'

/**
 * Behavioural contract tests for `<TrainerProgressHeader />` (task 19.1).
 *
 * Validates Requirement 16.2:
 *   - Текущий уровень рендерится в бейдже `Уровень N` через
 *     `t('trainer.header.level', { level })`.
 *   - Прогресс-бар получает `value=progressToNext` и выставляет
 *     корректный `aria-valuenow` (0..100).
 *   - Количество решённых задач рендерится как `Решено: N` через
 *     `t('trainer.header.solved', { count: solved })`.
 *
 * Validates Requirement 24.2:
 *   - Все строки берутся из словаря `ru.ts`, хардкода в TSX нет —
 *     тесты сравнивают рендер с результатом `t(...)`, а не с литералом.
 */

afterEach(() => cleanup())

describe('<TrainerProgressHeader />', () => {
  it('рендерит бейдж с текущим уровнем через t()', () => {
    const { getByTestId } = render(
      <TrainerProgressHeader level={3} solved={12} progressToNext={0.4} />,
    )
    const badge = getByTestId('trainer-progress-header-level')
    expect(badge.textContent).toBe(t('trainer.header.level', { level: 3 }))
  })

  it('рендерит счётчик решённых через t() с подстановкой count', () => {
    const { getByTestId } = render(
      <TrainerProgressHeader level={1} solved={0} progressToNext={0} />,
    )
    const solved = getByTestId('trainer-progress-header-solved')
    expect(solved.textContent).toBe(t('trainer.header.solved', { count: 0 }))
  })

  it('прокидывает progressToNext в ProgressBar как aria-valuenow (целые проценты)', () => {
    const { getByRole } = render(
      <TrainerProgressHeader level={5} solved={42} progressToNext={0.75} />,
    )
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('75')
  })

  it('связывает ProgressBar с локализованным label уровня (aria-labelledby)', () => {
    const { getByRole, getAllByText } = render(
      <TrainerProgressHeader level={7} solved={1} progressToNext={0.5} />,
    )
    const bar = getByRole('progressbar')
    const labelledBy = bar.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()

    const expectedLabel = t('trainer.header.level', { level: 7 })
    // Label уровня встречается как в бейдже, так и в скрытом лейбле
    // ProgressBar; проверяем, что labelled-by указывает на элемент
    // с совпадающим текстом.
    const labelNode = document.getElementById(labelledBy!)
    expect(labelNode).not.toBeNull()
    expect(labelNode!.textContent).toBe(expectedLabel)

    // Сами строки присутствуют в DOM хотя бы один раз.
    expect(getAllByText(expectedLabel).length).toBeGreaterThanOrEqual(1)
  })

  it('мягко обрабатывает progressToNext вне [0..1] (clamp через ProgressBar)', () => {
    const { getByRole, rerender } = render(
      <TrainerProgressHeader level={2} solved={3} progressToNext={-0.2} />,
    )
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')

    rerender(
      <TrainerProgressHeader level={2} solved={3} progressToNext={1.7} />,
    )
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it('применяет класс `.glass` контейнера и прокидывает пользовательский className', () => {
    const { container } = render(
      <TrainerProgressHeader
        level={4}
        solved={8}
        progressToNext={0.25}
        className="custom-wrapper"
      />,
    )
    const root = container.querySelector(
      '[data-ds="trainer-progress-header"]',
    )
    expect(root).not.toBeNull()
    expect(root!.className).toContain('glass')
    expect(root!.className).toContain('trainer-progress-header')
    expect(root!.className).toContain('custom-wrapper')
  })
})
