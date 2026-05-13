/**
 * Lighthouse CI — Desktop configuration (informational only).
 *
 * Task 24.2: Desktop LCP is collected as an informational signal
 * but does NOT participate in the PR-gate.
 *
 * Run: npx lhci autorun --config=lighthouserc.desktop.js
 */

/** @type {import('@lhci/utils/src/lighthouserc').default} */
module.exports = {
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
        // No throttling for desktop — use provided network conditions
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
    // No assertions — informational signal only (not a PR-gate)
    assert: {
      assertions: {},
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
