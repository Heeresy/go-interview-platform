import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import * as React from 'react'

import { ModulesShowcase } from './ModulesShowcase'
import { t } from '@/lib/i18n'

/**
 * Unit tests for <ModulesShowcase />.
 *
 * В текущей реализации (task 13.2) превью-ассеты `/modules/*.webp` ещё
 * не созданы, поэтому вместо `<Image>` используется solid-color
 * placeholder с `role="img"` и локализованным `aria-label`. Когда
 * ассеты добавятся (TODO в `ModulesShowcase.tsx`), тесты можно будет
 * переписать на проверку `<img>`-элементов с AVIF/WebP `src`.
 *
 * Пока же контракт «next/image + AVIF/WebP» из Req 12.7 закрывается
 * глобальной настройкой в `next.config.ts` (images.formats) —
 * контрактуемое поведение всей платформы, не конкретной плитки.
 */
describe('<ModulesShowcase />', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the section heading from i18n (Req 24.1, 24.2)', () => {
    render(<ModulesShowcase />)
    expect(
      screen.getByRole('heading', { level: 2, name: t('landing.modules.title') })
    ).toBeInTheDocument()
  })

  it('renders exactly four module cards (Req 4.2)', () => {
    render(<ModulesShowcase />)
    const cards = screen.getAllByRole('heading', { level: 3 })
    expect(cards).toHaveLength(4)
  })

  it('wires each CTA link to its route: /questions, /tasks, /trainer, /mock', () => {
    render(<ModulesShowcase />)
    const expected: ReadonlyArray<[string, string]> = [
      ['/questions', t('landing.modules.questions.title')],
      ['/tasks', t('landing.modules.tasks.title')],
      ['/trainer', t('landing.modules.trainer.title')],
      ['/mock', t('landing.modules.mock.title')],
    ]
    for (const [href, moduleTitle] of expected) {
      // CTA label is composed as "<cta>: <moduleTitle>" so we can
      // uniquely match per-card even though all CTAs share the same
      // visible label `t('landing.modules.cta')`.
      const link = screen.getByRole('link', {
        name: `${t('landing.modules.cta')}: ${moduleTitle}`,
      })
      expect(link.getAttribute('href')).toBe(href)
    }
  })

  it('shows the same CTA label from i18n on every card', () => {
    render(<ModulesShowcase />)
    const ctaLabels = screen.getAllByText(t('landing.modules.cta'))
    expect(ctaLabels).toHaveLength(4)
  })

  it('provides an accessible image role with localized alt text for every preview', () => {
    render(<ModulesShowcase />)
    for (const altKey of [
      'landing.modules.questions.alt',
      'landing.modules.tasks.alt',
      'landing.modules.trainer.alt',
      'landing.modules.mock.alt',
    ] as const) {
      expect(screen.getByRole('img', { name: t(altKey) })).toBeInTheDocument()
    }
  })

  it('wraps each card in a GlassCard (Req 3.4, 3.5)', () => {
    const { container } = render(<ModulesShowcase />)
    const glassCards = container.querySelectorAll('.glass')
    expect(glassCards.length).toBe(4)
  })

  it('associates the section with its heading via aria-labelledby (Req 11.6)', () => {
    render(<ModulesShowcase />)
    const heading = screen.getByRole('heading', {
      level: 2,
      name: t('landing.modules.title'),
    })
    expect(heading.id).toBe('landing-modules-heading')
    const section = heading.closest('section')
    expect(section).not.toBeNull()
    expect(section?.getAttribute('aria-labelledby')).toBe(
      'landing-modules-heading',
    )
  })
})
