import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/react'

import { AiEvaluationPanel, scoreBadgeVariant } from './AiEvaluationPanel'
import { t } from '@/lib/i18n'

/**
 * AiEvaluationPanel — task 17.5.
 *
 * Покрытие:
 *   - Req 20.1: loading-state показывает Skeleton + label `t("state.loading")`.
 *   - Req 20.3: error-state показывает inline ErrorState с
 *     `messageKey="state.error.unknown"`.
 *   - Empty-state (`evaluation === null`) показывает EmptyState
 *     с сообщением `t("questions.detail.evaluation.empty")`.
 *   - Success-state рендерит:
 *       * GlassPanel-контейнер с framer-motion-обёрткой,
 *       * Badge с вариантом по score-бакету,
 *       * feedback,
 *       * strengths (✓) / improvements (→) — только когда поле непустое,
 *   - i18n: все строки берутся через `t()`, новые ключи присутствуют
 *     в словаре.
 *   - score → variant маппинг (postановка задачи).
 */

afterEach(() => cleanup())

describe('AiEvaluationPanel', () => {
  it('renders loading state with skeletons and a t("state.loading") label (Req 20.1)', () => {
    render(<AiEvaluationPanel evaluation={null} isLoading />)

    const panel = screen.getByTestId('ai-evaluation-panel')
    expect(panel.dataset.state).toBe('loading')

    expect(
      screen.getByTestId('ai-evaluation-loading-label'),
    ).toHaveTextContent(t('state.loading'))

    // Хотя бы один Skeleton должен присутствовать.
    const skeletons = panel.querySelectorAll('[data-ds="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders inline ErrorState when error is provided (Req 20.3)', () => {
    render(
      <AiEvaluationPanel
        evaluation={null}
        error={new Error('Network down')}
      />,
    )

    const panel = screen.getByTestId('ai-evaluation-panel')
    expect(panel.dataset.state).toBe('error')

    const errorState = within(panel).getByRole('alert')
    expect(errorState).toHaveTextContent(t('state.error.unknown'))
  })

  it('renders empty state with the prompt to submit an answer when evaluation is null', () => {
    render(<AiEvaluationPanel evaluation={null} />)

    const panel = screen.getByTestId('ai-evaluation-panel')
    expect(panel.dataset.state).toBe('empty')

    expect(
      screen.getByText(t('questions.detail.evaluation.empty')),
    ).toBeInTheDocument()
  })

  it('renders success state with score badge and feedback (Req 14.1, 14.7)', () => {
    render(
      <AiEvaluationPanel
        evaluation={{
          score: 92,
          feedback: 'Отличный развёрнутый ответ.',
        }}
      />,
    )

    const panel = screen.getByTestId('ai-evaluation-panel')
    expect(panel.dataset.state).toBe('success')

    const badge = screen.getByTestId('ai-evaluation-score-badge')
    expect(badge).toHaveAttribute('data-variant', 'success')
    expect(badge.textContent).toContain('92')

    expect(screen.getByTestId('ai-evaluation-feedback')).toHaveTextContent(
      'Отличный развёрнутый ответ.',
    )
  })

  it('does not render strengths/improvements sections when arrays are missing or empty', () => {
    render(
      <AiEvaluationPanel
        evaluation={{
          score: 50,
          feedback: 'Частично верно.',
        }}
      />,
    )

    expect(screen.queryByTestId('ai-evaluation-strengths')).toBeNull()
    expect(screen.queryByTestId('ai-evaluation-improvements')).toBeNull()
  })

  it('renders strengths (✓) and improvements (→) lists when provided', () => {
    render(
      <AiEvaluationPanel
        evaluation={{
          score: 75,
          feedback: 'Хороший ответ.',
          strengths: ['Чёткая структура', 'Правильная терминология'],
          improvements: ['Добавить пример из практики'],
        }}
      />,
    )

    const strengths = screen.getByTestId('ai-evaluation-strengths')
    expect(strengths).toHaveTextContent(t('questions.detail.evaluation.strengths'))
    expect(strengths).toHaveTextContent('Чёткая структура')
    expect(strengths).toHaveTextContent('Правильная терминология')
    expect(strengths.textContent).toContain('✓')

    const improvements = screen.getByTestId('ai-evaluation-improvements')
    expect(improvements).toHaveTextContent(
      t('questions.detail.evaluation.improvements'),
    )
    expect(improvements).toHaveTextContent('Добавить пример из практики')
    expect(improvements.textContent).toContain('→')
  })

  it('prioritises loading > error > empty > success', () => {
    const { rerender } = render(
      <AiEvaluationPanel
        evaluation={{ score: 50, feedback: 'x' }}
        isLoading
        error={new Error('boom')}
      />,
    )
    expect(screen.getByTestId('ai-evaluation-panel').dataset.state).toBe(
      'loading',
    )

    rerender(
      <AiEvaluationPanel
        evaluation={{ score: 50, feedback: 'x' }}
        error={new Error('boom')}
      />,
    )
    expect(screen.getByTestId('ai-evaluation-panel').dataset.state).toBe(
      'error',
    )

    rerender(<AiEvaluationPanel evaluation={null} />)
    expect(screen.getByTestId('ai-evaluation-panel').dataset.state).toBe(
      'empty',
    )

    rerender(<AiEvaluationPanel evaluation={{ score: 50, feedback: 'x' }} />)
    expect(screen.getByTestId('ai-evaluation-panel').dataset.state).toBe(
      'success',
    )
  })
})

describe('scoreBadgeVariant', () => {
  // Бакеты по 10-балльной семантике через score/10:
  //   0..3 → danger, 4..6 → warning, 7..8 → info, 9..10 → success.
  it('maps 0..39 → danger', () => {
    expect(scoreBadgeVariant(0)).toBe('danger')
    expect(scoreBadgeVariant(15)).toBe('danger')
    expect(scoreBadgeVariant(39)).toBe('danger')
  })

  it('maps 40..69 → warning', () => {
    expect(scoreBadgeVariant(40)).toBe('warning')
    expect(scoreBadgeVariant(55)).toBe('warning')
    expect(scoreBadgeVariant(69)).toBe('warning')
  })

  it('maps 70..89 → info', () => {
    expect(scoreBadgeVariant(70)).toBe('info')
    expect(scoreBadgeVariant(85)).toBe('info')
    expect(scoreBadgeVariant(89)).toBe('info')
  })

  it('maps 90..100 → success', () => {
    expect(scoreBadgeVariant(90)).toBe('success')
    expect(scoreBadgeVariant(95)).toBe('success')
    expect(scoreBadgeVariant(100)).toBe('success')
  })

  it('clamps out-of-range and non-finite scores defensively', () => {
    expect(scoreBadgeVariant(-10)).toBe('danger')
    expect(scoreBadgeVariant(150)).toBe('success')
    expect(scoreBadgeVariant(Number.NaN)).toBe('neutral')
    expect(scoreBadgeVariant(Number.POSITIVE_INFINITY)).toBe('neutral')
  })
})
