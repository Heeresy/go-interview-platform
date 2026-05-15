# 🚀 Pre-Deployment Checklist - Vercel Deployment

**Date**: 2026-04-19  
**Project**: GO Interview Platform  
**Status**: 75% Ready → Target 95%+ Ready for Production

---

## 📋 PRIORITY MATRIX

```
CRITICAL (Must Do Before Deploy):
├─ [ ] Performance: Bundle optimization (<300KB gzip)
├─ [ ] Security: Environment variables validation
├─ [ ] Testing: E2E tests for critical flows
└─ [ ] SEO: Meta tags & Open Graph

HIGH (Should Do):
├─ [ ] Monitoring: Error tracking (Sentry)
├─ [ ] Analytics: Performance monitoring (Vercel Analytics)
├─ [ ] Database: RLS policies & query optimization
└─ [ ] Accessibility: WCAG AA compliance check

MEDIUM (Nice to Have):
├─ [ ] CI/CD: GitHub Actions workflow
├─ [ ] Responsive: Cross-device testing
├─ [ ] Animation: Reduced motion support
└─ [ ] Documentation: Deployment runbook
```

---

## 🎯 SECTION 1: PERFORMANCE OPTIMIZATION (CRITICAL)

### 1.1 Bundle Size Analysis
**Time**: 1–2 hours

```bash
# Analyze current bundle size
npm run analyze

# Check results in .next/analyze/
# Target: <300KB gzipped (currently: 635KB)
# Critical: Remove unused dependencies

# Current dependencies to review:
- ogl (1.0.11) - WebGL library for FaultyTerminal ✅ USED
- gsap (3.15.0) - Animation for CardSwap ✅ USED
- @monaco-editor/react (4.7.0) - LAZY LOADED ✅ OPTIMIZED
- framer-motion (12.38.0) - Page animations ✅ USED
- lucide-react (1.8.0) - Icons ✅ USED
```

**Action Items**:
- [ ] Run `npm run analyze` and review bundle breakdown
- [ ] Identify any unused chunks
- [ ] Check if all large libs are lazy-loaded
- [ ] Target: Reduce to <350KB (from 635KB = 45% reduction)

**Commands**:
```bash
# Check dependencies
npm audit

# Remove unused
npm prune

# Analyze bundle
npm run analyze > bundle-report.txt
```

---

### 1.2 Code Splitting & Lazy Loading
**Time**: 2–3 hours

**Current Status** ✅:
- FaultyTerminal: Already dynamic imported (SSR disabled)
- CardSwap: Already dynamic imported
- Monaco Editor: Already lazy loaded

**Action Items**:
- [ ] Verify `/app/api/*` routes are optimized
- [ ] Check `/app/questions/*`, `/app/tasks/*`, `/app/trainer/*` for dynamic imports
- [ ] Implement route-level code splitting:

**Implementation**:
```typescriptreact
// In /app/questions/page.tsx - VERIFY THIS
import dynamic from 'next/dynamic'

const QuestionsContent = dynamic(() => import('./components/QuestionsContent'), {
  loading: () => <QuestionsSkeleton />,
  ssr: true, // Can be server-rendered
})

export default function QuestionsPage() {
  return <QuestionsContent />
}
```

---

### 1.3 Image Optimization
**Time**: 1 hour

**Current Status** ✅:
- next.config.ts already configured with AVIF/WebP
- unoptimized: false ✅

**Action Items**:
- [ ] Audit all images in `/public`
- [ ] Ensure all images have `width` & `height` props
- [ ] Use Next.js Image component for CLS prevention:

```typescriptreact
// ❌ WRONG
<img src="/icon.svg" />

// ✅ CORRECT
import Image from 'next/image'
<Image 
  src="/icon.svg" 
  alt="Icon" 
  width={32} 
  height={32}
  loading="lazy"
/>
```

---

### 1.4 Core Web Vitals Optimization
**Time**: 2–3 hours

**Metrics to Track**:
```
LCP (Largest Contentful Paint): Target <2.5s
FID (First Input Delay): Target <100ms
CLS (Cumulative Layout Shift): Target <0.1
```

**Action Items**:
- [ ] Run Lighthouse audit on all pages:
```bash
# Manual: Open DevTools → Lighthouse → Analyze page load
```

- [ ] Check for layout shifts:
  - [ ] Hero section: FaultyTerminal animation causes CLS?
  - [ ] Features grid: Cards load properly positioned?
  - [ ] CardSwap: 3D transforms don't cause shift?

- [ ] Optimize fonts:
```css
/* In globals.css - ADD */
@font-face {
  font-family: 'Inter';
  font-display: swap; /* Prevent FOIT */
  src: url('/fonts/inter.woff2') format('woff2');
}
```

---

## 🔐 SECTION 2: SECURITY & ENVIRONMENT (CRITICAL)

### 2.1 Environment Variables
**Time**: 30 mins

**Required Variables** ✅:
```env
# .env.local (dev - never commit)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> # Server-only
OPENROUTER_API_KEY=<your-api-key> # Server-only
```

**Vercel Configuration**:
- [ ] Add to Vercel Project Settings → Environment Variables
- [ ] Use different keys for Staging vs Production
- [ ] Never commit `.env.local`

**Action Items**:
- [ ] Create `.env.example`:
```env
# .env.example (commit this)
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
```

- [ ] Validate env vars at build time:
```typescript
// src/lib/env.ts (CREATE)
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  OPENROUTER_API_KEY: z.string(),
})

export const env = envSchema.parse(process.env)
```

---

### 2.2 Security Headers
**Time**: 30 mins

**Current Status** ✅:
- next.config.ts already has security headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin

**Action Items**:
- [ ] Add additional headers in next.config.ts:

```typescript
// Add to next.config.ts headers()
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
},
{
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains"
},
{
  key: "Permissions-Policy",
  value: "geolocation=(), microphone=(), camera=()"
}
```

- [ ] Test with SecurityHeaders.com

---

## 🧪 SECTION 3: TESTING (CRITICAL)

### 3.1 Unit & Component Tests
**Time**: 3–4 hours

**Current Status** ✅:
- Vitest setup complete
- analytics.test.ts: 3/3 passing ✅
- AnswerEditor.test.tsx: Ready for testing

**Action Items**:
- [ ] Verify all tests pass:
```bash
npm run test:run
```

- [ ] Create missing tests:
  - [ ] ResultsCard.test.tsx
  - [ ] CardSwap.test.tsx
  - [ ] FaultyTerminal.test.tsx (if possible)
  - [ ] useReducedMotion.test.ts

- [ ] Aim for 50%+ code coverage:
```bash
npm run test:coverage
```

---

### 3.2 E2E Tests (NEW)
**Time**: 6–8 hours

**Installation**:
```bash
npm install -D @playwright/test @playwright/test-utils
```

**Create E2E Tests**:
```bash
mkdir -p e2e
```

**e2e/auth.spec.ts**:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/')
    expect(page).toHaveTitle(/GOPrep/)
  })

  test('should navigate to questions page', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Вопросы')
    await expect(page).toHaveURL(/\/questions/)
  })
})
```

**e2e/questions.spec.ts**:
```typescript
test('should answer question', async ({ page }) => {
  await page.goto('/questions')
  
  // Wait for question to load
  await page.waitForSelector('textarea')
  
  // Fill answer
  await page.fill('textarea', 'Test answer')
  
  // Submit
  await page.click('button:has-text("Отправить")')
  
  // Check results
  await expect(page.locator('text=Результаты')).toBeVisible()
})
```

**Action Items**:
- [ ] Create 3 E2E test files (auth, questions, tasks)
- [ ] Add to package.json:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 📊 SECTION 4: SEO & META TAGS (CRITICAL)

### 4.1 Meta Tags & Open Graph
**Time**: 1–2 hours

**Current Status** ✅:
- layout.tsx has basic meta tags
- Missing: Open Graph, Twitter Card, JSON-LD

**Action Items**:
- [ ] Update layout.tsx:

```typescriptreact
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GOPrep — Платформа подготовки к собеседованиям на Go',
  description: 'Вопросы с AI-оценкой, задачи с кодом, тренажёр и MOCK-интервью для подготовки к Go-собеседованиям.',
  keywords: ['Go', 'Golang', 'собеседование', 'интервью', 'подготовка'],
  
  // Open Graph
  openGraph: {
    title: 'GOPrep — Go Interview Prep Platform',
    description: 'Master Go interviews with AI-powered questions, code challenges, trainer, and mock interviews.',
    url: 'https://goprep.com',
    siteName: 'GOPrep',
    images: [{
      url: 'https://goprep.com/og-image.png',
      width: 1200,
      height: 630,
    }],
    type: 'website',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'GOPrep — Go Interview Prep',
    description: 'Prepare for Go developer interviews with AI-powered platform.',
    images: ['https://goprep.com/twitter-image.png'],
  },

  // Other
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}
```

- [ ] Create robots.txt:
```txt
# public/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/

Sitemap: https://goprep.com/sitemap.xml
```

- [ ] Create sitemap.xml:
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://goprep.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://goprep.com/questions',
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://goprep.com/tasks',
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]
}
```

---

### 4.2 JSON-LD Schema
**Time**: 1 hour

**Add to layout.tsx**:
```typescriptreact
export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationEvent',
    name: 'GOPrep - Go Interview Preparation',
    description: 'Comprehensive platform for Go developer interview preparation',
    educationLevel: 'Professional Development',
    provider: {
      '@type': 'Organization',
      name: 'GOPrep',
    },
  }

  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## 💾 SECTION 5: DATABASE OPTIMIZATION (HIGH)

### 5.1 Supabase Configuration
**Time**: 2–3 hours

**Action Items**:
- [ ] Apply database migrations:
```bash
# In Supabase dashboard:
# 1. Go to SQL Editor
# 2. Run migration: supabase/migrations/20260418000000_add_performance_indexes.sql
# 3. Verify 15 indexes created
```

- [ ] Enable connection pooling:
```
Supabase Dashboard → Project → Database → Connection String
Use: "Connection pooler" mode (not "Session" mode)
Pooling mode: Transaction (for better performance)
```

- [ ] Set up RLS policies:
```sql
-- Example: Enable RLS on questions table
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read public questions
CREATE POLICY "allow_read_questions"
  ON questions
  FOR SELECT
  USING (true);

-- Allow authenticated users to see their own evaluations
CREATE POLICY "allow_read_own_evaluations"
  ON evaluations
  FOR SELECT
  USING (auth.uid() = user_id);
```

- [ ] Test query performance:
```typescript
// src/lib/supabase/test.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Time your queries
console.time('fetch-questions')
const { data } = await supabase
  .from('questions')
  .select('*')
  .eq('difficulty', 'medium')
  .limit(10)
console.timeEnd('fetch-questions')
```

---

## 📱 SECTION 6: RESPONSIVE & ACCESSIBILITY (HIGH)

### 6.1 Responsive Design Testing
**Time**: 2–3 hours

**Test on Devices**:
- [ ] Mobile (375px - iPhone SE)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1920px - Full HD)

**Breakpoints to Check**:
```css
/* In globals.css - verify these work */
@media (max-width: 480px) { }  /* Mobile */
@media (max-width: 768px) { }  /* Tablet */
@media (max-width: 1024px) { } /* Desktop */
@media (min-width: 1920px) { } /* Ultra-wide */
```

**Action Items**:
- [ ] Test in Chrome DevTools responsive mode
- [ ] Test on real iOS device
- [ ] Test on real Android device
- [ ] Verify: No horizontal scroll, touch targets >44×44px, font size >16px

---

### 6.2 Accessibility Audit (WCAG AA)
**Time**: 2–3 hours

**Action Items**:
- [ ] Run Lighthouse audit: DevTools → Lighthouse → Accessibility
- [ ] Target: 90+ score

- [ ] Check color contrast:
  - Use: https://webaim.org/resources/contrastchecker/
  - Ratio: 4.5:1 for normal text, 3:1 for large text

- [ ] Check keyboard navigation:
  - [ ] Tab through all interactive elements
  - [ ] Focus states visible
  - [ ] Enter/Space activate buttons
  - [ ] Arrow keys work for navigation

- [ ] Verify ARIA labels:
  - Icon buttons have aria-label
  - Form inputs have labels
  - Lists have proper roles

---

## 🔍 SECTION 7: MONITORING & ERROR TRACKING (HIGH)

### 7.1 Error Tracking with Sentry
**Time**: 1–2 hours

**Installation**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration** (auto-added):
```typescript
// next.config.ts (auto-updated by wizard)
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = {
  // ... existing config
}

export default withSentryConfig(nextConfig, {
  org: 'your-org',
  project: 'your-project',
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
```

**Action Items**:
- [ ] Create Sentry account
- [ ] Get DSN and auth token
- [ ] Add to Vercel environment variables
- [ ] Test with Sentry.captureException()

---

### 7.2 Vercel Analytics
**Time**: 30 mins

**Enable in Vercel Dashboard**:
```
Project Settings → Analytics → Enable Web Analytics
```

**Add to package.json**:
```json
{
  "dependencies": {
    "@vercel/analytics": "^1.0.0"
  }
}
```

**Add to layout.tsx**:
```typescriptreact
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

---

## 📝 SECTION 8: CI/CD PIPELINE (MEDIUM)

### 8.1 GitHub Actions Workflow
**Time**: 1–2 hours

**Create `.github/workflows/deploy.yml`**:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm run test:run

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SITE_URL: https://goprep.com
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

**Action Items**:
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Add secrets to GitHub:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Other env vars

---

## ✅ FINAL DEPLOYMENT CHECKLIST

### Pre-Deployment Verification
```
PERFORMANCE:
- [ ] Bundle size analyzed and optimized (<300KB)
- [ ] Lighthouse score: 85+ on all pages
- [ ] Core Web Vitals: LCP <2.5s, CLS <0.1

SECURITY:
- [ ] All secrets in .env.local (never committed)
- [ ] Environment variables validated
- [ ] Security headers configured
- [ ] CSP policy set

TESTING:
- [ ] Unit tests: 50%+ coverage
- [ ] E2E tests: Critical flows covered
- [ ] Cross-browser testing done
- [ ] Mobile responsiveness verified

SEO:
- [ ] Meta tags on all pages
- [ ] Open Graph tags configured
- [ ] robots.txt and sitemap.xml created
- [ ] JSON-LD schema added

DATABASE:
- [ ] Migrations applied to production
- [ ] Indexes created and verified
- [ ] RLS policies enabled
- [ ] Connection pooling configured

MONITORING:
- [ ] Sentry set up and configured
- [ ] Vercel Analytics enabled
- [ ] Error tracking tested
- [ ] Performance monitoring in place

CI/CD:
- [ ] GitHub Actions workflow created
- [ ] All tests pass in CI
- [ ] Build succeeds without errors
- [ ] Preview deployments work
```

### Deployment Steps
```bash
# 1. Final build test
npm run build
npm run test:run
npm run test:e2e

# 2. Commit and push
git add .
git commit -m "chore: final pre-deployment optimizations"
git push origin main

# 3. Vercel deployment
# - Vercel auto-deploys on push
# - Check: https://vercel.com/dashboard

# 4. Verify production
# - Open https://goprep.vercel.app
# - Test critical flows
# - Check Sentry for errors
# - Monitor analytics
```

---

## 📊 SUCCESS METRICS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Bundle Size (gzip) | <300KB | 635KB | ⚠️ NEEDS WORK |
| Lighthouse Score | 85+ | TBD | ⏳ PENDING |
| LCP | <2.5s | TBD | ⏳ PENDING |
| CLS | <0.1 | TBD | ⏳ PENDING |
| Test Coverage | 50%+ | 15% | ⚠️ NEEDS WORK |
| E2E Tests | 10+ | 0 | ⚠️ NEEDS WORK |
| Accessibility | WCAG AA | TBD | ⏳ PENDING |
| Uptime | 99.9% | TBD | ⏳ PENDING |

---

## 🎯 PRIORITY ORDER

### Week 1 (Critical):
1. Bundle optimization (2h)
2. E2E tests (8h)
3. Environment setup (1h)
4. SEO meta tags (2h)

### Week 2 (Important):
5. Database optimization (3h)
6. Monitoring setup (2h)
7. Accessibility audit (3h)
8. Responsive testing (2h)

### Week 3 (Nice to Have):
9. CI/CD pipeline (2h)
10. Documentation (2h)
11. Performance monitoring (1h)
12. Final verification (2h)

---

**Total Estimated Time**: 40–50 hours  
**Timeline**: 1–2 weeks (full-time developer)  
**Risk Level**: LOW (all tasks are well-defined)

Ready to begin? Start with **Section 1: Performance Optimization**! 🚀


