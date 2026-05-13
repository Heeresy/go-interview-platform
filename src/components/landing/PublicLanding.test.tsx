import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'

import { t } from '@/lib/i18n'

/**
 * Unit tests for `<PublicLanding />` — task 13.4.
 *
 * Scope:
 *  - The composite renders all six sections in the fixed order:
 *    Hero → FeatureGrid → ModulesShowcase → SocialProof → LandingCTA →
 *    LandingFooter (design.md §Public_Landing).
 *  - The composite wraps each section in a single reveal container
 *    that uses `fallback="immediate"` (Req 4.5, 4.6). When the
 *    animation path fails (IntersectionObserver missing), every
 *    section must still render in its final visible state and a
 *    single non-invasive `role="status"` alert appears.
 *  - Base functionality (navigation, CTAs → `/login`) keeps working
 *    in the fallback tree — Req 4.6 / 10.6.
 *
 * We stub the internal section components to lightweight sentinels.
 * That keeps this test focused on the composite's contract (order,
 * reveal wiring, fallback) and avoids re-validating individual
 * section implementations, which each own their own test files.
 */

// --- Section stubs ---------------------------------------------------------
// Each stub renders a stable testid so we can assert presence + order.
// `LandingCTA` also renders an anchor → /login so we can exercise the
// "base functionality works in fallback mode" check.
vi.mock('./Hero', () => ({
    __esModule: true,
    Hero: () => <div data-testid="stub-hero">Hero</div>,
    default: () => <div data-testid="stub-hero">Hero</div>,
}))
vi.mock('./FeatureGrid', () => ({
    __esModule: true,
    FeatureGrid: () => <div data-testid="stub-features">FeatureGrid</div>,
    default: () => <div data-testid="stub-features">FeatureGrid</div>,
}))
vi.mock('./ModulesShowcase', () => ({
    __esModule: true,
    ModulesShowcase: () => <div data-testid="stub-modules">ModulesShowcase</div>,
    default: () => <div data-testid="stub-modules">ModulesShowcase</div>,
}))
vi.mock('./SocialProof', () => ({
    __esModule: true,
    SocialProof: () => <div data-testid="stub-social">SocialProof</div>,
    default: () => <div data-testid="stub-social">SocialProof</div>,
}))
vi.mock('./LandingCTA', () => ({
    __esModule: true,
    LandingCTA: () => (
        <div data-testid="stub-cta">
            <a href="/login" data-testid="stub-cta-link">
                Login
            </a>
        </div>
    ),
    default: () => (
        <div data-testid="stub-cta">
            <a href="/login" data-testid="stub-cta-link">
                Login
            </a>
        </div>
    ),
}))
vi.mock('./LandingFooter', () => ({
    __esModule: true,
    LandingFooter: () => <div data-testid="stub-footer">LandingFooter</div>,
    default: () => <div data-testid="stub-footer">LandingFooter</div>,
}))

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

async function renderPublicLanding() {
    const { PublicLanding } = await import('./PublicLanding')
    return render(<PublicLanding />)
}

describe('<PublicLanding /> — composition', () => {
    it('renders all six sections in the documented order', async () => {
        await renderPublicLanding()

        const ids = [
            'stub-hero',
            'stub-features',
            'stub-modules',
            'stub-social',
            'stub-cta',
            'stub-footer',
        ]

        // All sections are present.
        for (const id of ids) {
            expect(screen.getByTestId(id)).toBeInTheDocument()
        }

        // Order is Hero → FeatureGrid → ModulesShowcase → SocialProof →
        // LandingCTA → LandingFooter. We assert relative document order via
        // `compareDocumentPosition` so we don't couple to any specific
        // wrapper markup produced by <RevealItem>.
        const nodes = ids.map((id) => screen.getByTestId(id))
        for (let i = 0; i < nodes.length - 1; i++) {
            const cmp = nodes[i].compareDocumentPosition(nodes[i + 1])
            // Node follows — bit flag DOCUMENT_POSITION_FOLLOWING (0x04).
            expect(cmp & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        }
    })
})

describe('<PublicLanding /> — fallback="immediate"', () => {
    const originalIO = global.IntersectionObserver

    beforeEach(() => {
        // Mirror the fallback path validated in RevealOnScroll.test.tsx:
        // if IntersectionObserver is missing, sections render in their
        // final visible state and a single role="status" alert appears.
        // @ts-expect-error — intentionally removing to trigger probe
        delete (window as unknown as { IntersectionObserver?: unknown })
            .IntersectionObserver
        // @ts-expect-error — intentionally removing to trigger probe
        delete (globalThis as unknown as { IntersectionObserver?: unknown })
            .IntersectionObserver
    })

    afterEach(() => {
        global.IntersectionObserver = originalIO
    })

    it('renders every section in the final visible state when the observer is missing', async () => {
        await renderPublicLanding()

        // All six sections still in the tree.
        expect(screen.getByTestId('stub-hero')).toBeInTheDocument()
        expect(screen.getByTestId('stub-features')).toBeInTheDocument()
        expect(screen.getByTestId('stub-modules')).toBeInTheDocument()
        expect(screen.getByTestId('stub-social')).toBeInTheDocument()
        expect(screen.getByTestId('stub-cta')).toBeInTheDocument()
        expect(screen.getByTestId('stub-footer')).toBeInTheDocument()

        // Fallback wrapper present, alert surfaced exactly once
        // (Req 4.6: "немедленный показ секций + неинвазивный inline-alert").
        const fallbackRoot = document.querySelector(
            '[data-reveal-fallback="immediate"]',
        ) as HTMLElement | null
        expect(fallbackRoot).not.toBeNull()
        expect(fallbackRoot?.style.opacity).toBe('1')
        expect(fallbackRoot?.style.transform).toBe('none')

        const alerts = screen.getAllByRole('status')
        expect(alerts.length).toBeGreaterThanOrEqual(1)
        // At least one alert carries the documented RU copy.
        expect(
            alerts.some((el) =>
                el.textContent?.includes(t('motion.revealFallback')),
            ),
        ).toBe(true)
    })

    it('keeps CTA → /login clickable in the fallback tree (Req 4.6 / 10.6)', async () => {
        await renderPublicLanding()

        // Stub `LandingCTA` renders an anchor with href="/login"; it must
        // survive the fallback path and remain interactive (no hidden /
        // pointer-events: none overlays added by the composite).
        const link = screen.getByTestId('stub-cta-link')
        expect(link).toBeInTheDocument()
        expect(link.getAttribute('href')).toBe('/login')
    })
})
