import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import * as React from 'react'

import { SocialProof } from './SocialProof'
import { t } from '@/lib/i18n'

describe('<SocialProof />', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the section heading from i18n', () => {
    render(<SocialProof />)
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: t('landing.socialProof.title'),
      }),
    ).toBeInTheDocument()
  })

  it('renders 3–5 placeholder logo blocks (task 13.3)', () => {
    render(<SocialProof />)
    // role="img" + aria-label on each placeholder div
    const placeholders = screen.getAllByRole('img')
    expect(placeholders.length).toBeGreaterThanOrEqual(3)
    expect(placeholders.length).toBeLessThanOrEqual(5)
  })

  it('gives each placeholder an aria-label with the localized company name', () => {
    render(<SocialProof />)
    // Each company label is present in the accessible name of a placeholder.
    for (const key of [
      'landing.socialProof.company.acme',
      'landing.socialProof.company.nova',
      'landing.socialProof.company.pulse',
      'landing.socialProof.company.orbit',
      'landing.socialProof.company.lumen',
    ] as const) {
      expect(
        screen.getByRole('img', { name: t(key) }),
      ).toBeInTheDocument()
    }
  })

  it('associates the section with its heading via aria-labelledby', () => {
    render(<SocialProof />)
    const heading = screen.getByRole('heading', {
      level: 2,
      name: t('landing.socialProof.title'),
    })
    expect(heading.id).toBe('landing-social-proof-title')
    const section = heading.closest('section')
    expect(section?.getAttribute('aria-labelledby')).toBe(
      'landing-social-proof-title',
    )
  })
})
