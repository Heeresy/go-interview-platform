# AI Setup

The application currently uses Google Gemini through `@google/generative-ai`.

## Required Variable

Add this server-side environment variable in local development and in Vercel:

```bash
GOOGLE_AI_API_KEY=<your-google-ai-api-key>
```

Do not expose this key with a `NEXT_PUBLIC_` prefix.

## Local Setup

1. Create or update `.env.local`.
2. Add `GOOGLE_AI_API_KEY`.
3. Restart `npm run dev`.
4. Open `/status` and confirm `Google Gemini AI` is configured.
5. Test `/api/test-ai` or send a message through the AI assistant.

## Vercel Setup

1. Open the Vercel project.
2. Go to `Settings -> Environment Variables`.
3. Add `GOOGLE_AI_API_KEY` for Production, Preview, and Development.
4. Redeploy the latest deployment.
5. Verify `/status` after the deployment finishes.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `GOOGLE_AI_API_KEY is not set` | Add the variable in `.env.local` or Vercel and restart/redeploy. |
| AI assistant says it is not configured | Check that the key is server-side and does not use `NEXT_PUBLIC_`. |
| Gemini request fails | Check the key, quota, and selected model in `src/lib/ai.ts`. |
| `/status` shows an outage | Confirm the deployment has the same environment variables as local. |

## Current Model

The default model is configured in `src/lib/ai.ts` as:

```ts
const MODEL_NAME = 'gemini-3.1-flash-lite-preview'
```

If that preview model becomes unavailable, replace it with a currently enabled Gemini model and run `npm run type-check` plus `npm run test:run`.
