import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import * as React from 'react'

import { LandingFooter } from './LandingFooter'
import { t } from '@/lib/i18n'

describe('<LandingFooter />', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders a semantic contentinfo footer', () => {
    render(<LandingFooter />)
    const footer = screen.getByRole('contentinfo')
    expect(footer.tagName).toBe('FOOTER')
  })

  it('renders the copyright with the current year injected via i18n', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-07-04T12:00:00Z'))
    render(<LandingFooter />)
    const expected = t('landing.footer.copyright', { year: 2030 })
    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(expected).toContain('2030')
  })

  it('renders default external links (GitHub, Docs) with target=_blank and rel=noopener', () => {
    render(<LandingFooter />)
    const github = screen.getByRole('link', {
      name: t('landing.footer.githubAriaLabel'),
    })
    const docs = screen.getByRole('link', {
      name: t('landing.footer.docsAriaLabel'),
    })
    for (const link of [github, docs]) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })

  it('hides the links list when an empty links array is provided', () => {
    render(<LandingFooter links={[]} />)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('renders custom link list when provided', () => {
    render(
      <LandingFooter
        links={[
          {
            id: 'docs',
            href: 'https://example.com/docs',
            labelKey: 'landing.footer.docs',
            ariaLabelKey: 'landing.footer.docsAriaLabel',
          },
        ]}
      />,
    )
    const link = screen.getByRole('link', {
      name: t('landing.footer.docsAriaLabel'),
    })
    expect(link.getAttribute('href')).toBe('https://example.com/docs')
    expect(
      screen.queryByRole('link', { name: t('landing.footer.githubAriaLabel') }),
    ).toBeNull()
  })
})
