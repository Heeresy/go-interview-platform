# GO Interview Platform

Platform for preparing for Go backend interviews: theory questions, coding tasks, a trainer flow, mock interviews, progress tracking, and AI-assisted feedback.

## Stack

- Next.js 16, React 19, TypeScript
- Supabase Auth, Postgres, and RLS
- Google Gemini for AI evaluation and assistant features
- JDoodle primary and Glot fallback for Go code execution
- Vitest and React Testing Library
- Sentry, Vercel Analytics, and Speed Insights

## Main Routes

- `/` - public landing for guests, dashboard for signed-in users
- `/questions` - interview questions and AI evaluation
- `/tasks` - coding tasks with editor and execution panel
- `/trainer` - guided practice flow
- `/mock` - mock interview sets
- `/profile` - progress and activity
- `/status` - service configuration status

## Local Development

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Required Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_AI_API_KEY=
JDOODLE_CLIENT_ID=
JDOODLE_CLIENT_SECRET=
GLOT_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

JDoodle and Glot are used by `/api/execute`. Gemini is used by `/api/evaluate`, `/api/ai-assist`, and `/api/test-ai`.

## Verification

```bash
npm run type-check
npm run test:run
npm run build
```

## Docs

- `QUICK_START.md` - short deployment path
- `DEPLOYMENT.md` - deployment and troubleshooting
- `AI_SETUP.md` - Gemini setup
- `DATABASE_INDEXES_GUIDE.md` - database performance notes
- `docs/archive/` - older implementation reports and historical notes
