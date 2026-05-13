import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/react'
import * as React from 'react'

import { FeatureGrid } from './FeatureGrid'
import { t } from '@/lib/i18n'

describe('<FeatureGrid />', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the section heading from i18n (Req 24.1, 24.2)', () => {
    render(<FeatureGrid />)
    expect(
      screen.getByRole('heading', { level: 2, name: t('landing.features.title') })
    ).toBeInTheDocument()
  })

  it('renders exactly three feature tiles (Req 4.2)', () => {
    render(<FeatureGrid />)
    const tiles = screen.getAllByRole('heading', { level: 3 })
    expect(tiles).toHaveLength(3)
  })

  it('renders speed / AI / adaptivity titles and descriptions from i18n', () => {
    render(<FeatureGrid />)
    for (const key of [
      'landing.features.speed.title',
      'landing.features.ai.title',
      'landing.features.adaptivity.title',
      'landing.features.speed.description',
      'landing.features.ai.description',
      'landing.features.adaptivity.description',
    ] as const) {
      expect(screen.getByText(t(key))).toBeInTheDocument()
    }
  })

  it('wraps each tile in a GlassCard (Req 3.4, 3.5)', () => {
    const { container } = render(<FeatureGrid />)
    const glassCards = container.querySelectorAll('.glass')
    expect(glassCards.length).toBe(3)
  })

  it('associates the section with its heading via aria-labelledby (Req 11.6)', () => {
    render(<FeatureGrid />)
    const heading = screen.getByRole('heading', {
      level: 2,
      name: t('landing.features.title'),
    })
    // The h2 carries an id that the section's aria-labelledby references.
    expect(heading.id).toBe('landing-features-heading')
    const section = heading.closest('section')
    expect(section).not.toBeNull()
    expect(section?.getAttribute('aria-labelledby')).toBe(
      'landing-features-heading'
    )
  })

  it('renders an icon wrapper inside each tile', () => {
    const { container } = render(<FeatureGrid />)
    // Each tile has exactly one icon SVG (lucide) inside its span[aria-hidden].
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(3)
  })

  it('all textual copy (no hardcoded missing keys)', () => {
    render(<FeatureGrid />)
    // Smoke: no untranslated key-as-text should appear inside a tile.
    const tiles = screen.getAllByRole('heading', { level: 3 })
    for (const heading of tiles) {
      expect(heading.textContent?.includes('landing.features')).toBe(false)
      const card = heading.closest('div.glass')
      expect(card).not.toBeNull()
      const description = within(card as HTMLElement).getAllByText(
        /./,
        { selector: 'p' }
      )
      expect(description.length).toBeGreaterThan(0)
    }
  })
})
