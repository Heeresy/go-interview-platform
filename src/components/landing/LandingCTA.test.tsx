import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import * as React from 'react'

import { LandingCTA } from './LandingCTA'
import { t } from '@/lib/i18n'

describe('<LandingCTA />', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the heading from landing.ctaSection.title (task 13.3)', () => {
    render(<LandingCTA />)
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: t('landing.ctaSection.title'),
      }),
    ).toBeInTheDocument()
  })

  it('associates the section with its heading via aria-labelledby', () => {
    render(<LandingCTA />)
    const heading = screen.getByRole('heading', {
      level: 2,
      name: t('landing.ctaSection.title'),
    })
    expect(heading.id).toBe('landing-cta-title')
    const section = heading.closest('section')
    expect(section?.getAttribute('aria-labelledby')).toBe('landing-cta-title')
  })

  it('renders at least 2 CTA buttons linking to /login (Req 4.3)', () => {
    render(<LandingCTA />)
    const links = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/login')
    expect(links.length).toBeGreaterThanOrEqual(2)
    for (const link of links) {
      // Inside each link must live a DS Button.
      const btn = link.querySelector('button.ds-btn')
      expect(btn).not.toBeNull()
    }
  })

  it('exposes both primary and secondary CTA variants', () => {
    render(<LandingCTA />)
    expect(screen.getByText(t('landing.cta.primary'))).toBeInTheDocument()
    expect(screen.getByText(t('landing.cta.secondary'))).toBeInTheDocument()
  })

  it('honours custom href override', () => {
    render(<LandingCTA href="/signup" />)
    const links = screen.getAllByRole('link')
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/signup')
    }
  })
})
