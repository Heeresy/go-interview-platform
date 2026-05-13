/**
 * Lighthouse CI configuration (Task 24.2, UI Redesign 2026).
 *
 * Requirements: 12.1, 12.4, 12.5, 12.8, 12.9
 *
 * - Mobile viewport 375×812 (Viewport_Mobile) with Slow 4G throttling
 * - LCP ≤ 2500ms assertion for Public_Landing and Dashboard
 * - Desktop LCP collected as informational signal only (no PR-gate assertion)
 */

/** @type {import('@lhci/utils/src/lighthouserc').default} */
module.exports = {
  ci: {
    collect: {
      // URLs to audit — adjust baseUrl via LHCI_BASE_URL env var or override in CI
      url: [
        'http://localhost:3000/',        // Public_Landing
        'http://localhost:3000/login',   // Public_Landing (login)
        'http://localhost:3000/tasks',   // Dashboard (authenticated)
      ],
      numberOfRuns: 3,
      settings: {
        // ── Mobile viewport (375×812) — Viewport_Mobile ──
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 812,
          deviceScaleFactor: 3,
          disabled: false,
        },
        // ── Slow 4G throttling profile ──
        throttlingMethod: 'devtools',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 150,
          downloadThroughputKbps: 1638,
          uploadThroughputKbps: 675,
        },
        // Only performance category for speed
        onlyCategories: ['performance'],
      },
    },
    assert: {
      assertions: {
        // LCP ≤ 2500ms — PR-gate for Mobile (Slow 4G)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
    upload: {
      // Use temporary public storage for CI; switch to LHCI server if available
      target: 'temporary-public-storage',
    },
  },
};

/**
 * Desktop configuration — informational only, no assertions.
 * Run separately with: lhci autorun --config=lighthouserc.desktop.js
 * This is NOT part of the PR-gate.
 */
module.exports.desktop = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/tasks',
      ],
      numberOfRuns: 1,
      settings: {
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: 'provided',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 10240,
          uploadThroughputKbps: 10240,
        },
        onlyCategories: ['performance'],
      },
    },
    // No assertions — informational signal only
    assert: {
      assertions: {},
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
