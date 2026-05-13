'use client'

/**
 * PublicLanding — composite component that renders the full Public_Landing
 * page: Hero → FeatureGrid → ModulesShowcase → SocialProof → LandingCTA →
 * LandingFooter, wrapped in a single staggered reveal container.
 *
 * Spec: UI Redesign 2026, task 13.4, Requirements 4.5, 4.6, 10.6.
 *
 * Behavior:
 *
 *  - All six sections are composed in a single `<RevealOnScroll>` parent
 *    with `fallback="immediate"` and `staggerChildren={0.08}`. Each
 *    section is wrapped in its own `<RevealItem>`, so as the viewport
 *    scrolls into the landing sections, siblings fade in with an 80ms
 *    stagger between them. 80ms sits in the middle of the 40–120ms
 *    window required by Req 10.6 / 4.5.
 *
 *  - `<RevealOnScroll fallback="immediate">` already owns the
 *    try/catch + error boundary + IntersectionObserver probe. If
 *    framer-motion, the observer, or any child reveal fails, it
 *    flips into fallback mode: every section renders immediately in
 *    its final visible state (`opacity: 1; transform: none`) plus a
 *    non-invasive inline alert (`role="status"`, text from
 *    `t("motion.revealFallback")`). Req 4.6 is satisfied end-to-end
 *    without any fallback logic duplicated here.
 *
 *  - The section components themselves are untouched. This composite
 *    is the only place that wires them together with reveal behavior,
 *    so individual sections can still be embedded elsewhere without
 *    bringing the reveal container along.
 *
 *  - Section order is fixed (Hero → FeatureGrid → ModulesShowcase →
 *    SocialProof → LandingCTA → LandingFooter) per the task contract
 *    and matches the section list in design.md §Public_Landing.
 *
 *  - Base page functionality remains intact in both the animated and
 *    fallback paths: navigation, CTAs → `/login`, module links, footer
 *    links keep working because they live inside the section
 *    components, which `<RevealItem>` renders as-is.
 */

import type * as React from 'react'

import { RevealItem, RevealOnScroll } from '@/components/motion'
import { stagger } from '@/lib/motion'

import { FeatureGrid } from './FeatureGrid'
import { Hero } from './Hero'
import { LandingCTA } from './LandingCTA'
import { LandingFooter } from './LandingFooter'
import { ModulesShowcase } from './ModulesShowcase'
import { SocialProof } from './SocialProof'

export interface PublicLandingProps {
    /**
     * Additional className merged onto the `<RevealOnScroll>` container.
     * Kept optional so the component can be dropped directly into
     * `app/page.tsx` without any wiring ceremony.
     */
    className?: string
}

/**
 * Full public landing page composed of six sections with a single
 * staggered reveal container. See module doc for details.
 */
export function PublicLanding({
    className,
}: PublicLandingProps): React.ReactElement {
    return (
        <RevealOnScroll
            fallback="immediate"
            // 80ms — mid-range of the 40–120ms stagger window (Req 10.6 / 4.5).
            // Pulled from the `stagger.normal` design token so the value
            // stays in sync with the motion token scale in `lib/motion.ts`.
            staggerChildren={stagger.normal}
            className={className}
            data-landing-root=""
            aria-label="Public landing"
        >
            <RevealItem data-landing-item="hero">
                <Hero />
            </RevealItem>
            <RevealItem data-landing-item="features">
                <FeatureGrid />
            </RevealItem>
            <RevealItem data-landing-item="modules">
                <ModulesShowcase />
            </RevealItem>
            <RevealItem data-landing-item="social-proof">
                <SocialProof />
            </RevealItem>
            <RevealItem data-landing-item="cta">
                <LandingCTA />
            </RevealItem>
            <RevealItem data-landing-item="footer">
                <LandingFooter />
            </RevealItem>
        </RevealOnScroll>
    )
}

export default PublicLanding
