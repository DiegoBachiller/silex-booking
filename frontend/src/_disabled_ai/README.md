# AI features — temporarily disabled

This folder contains all AI-related code (voice agents, function-calling tools,
API keys for Vapi/ElevenLabs/n8n, and the "Agente IA" settings page) that was
removed from the active codebase on request.

The code is **kept intact and unchanged** so it can be plugged back in later
when AI agents are reintroduced.

## What's in here

| Original path                                              | Current location                                  |
|------------------------------------------------------------|---------------------------------------------------|
| `src/routes/ai-config.tsx`                                 | `routes/ai-config.tsx`                            |
| `src/routes/api/public/ai-tools/*.ts`                      | `routes/api/public/ai-tools/*.ts`                 |
| `src/routes/api/public/admin/api-keys.ts`                  | `routes/api/public/admin/api-keys.ts`             |
| `src/server/ai-tools.server.ts`                            | `server/ai-tools.server.ts`                       |
| `src/lib/api-key.ts`                                       | `lib/api-key.ts`                                  |

The Supabase tables `ai_profile` and `api_keys` (with their RLS policies) are
**not** dropped — they still exist in the database, ready to be re-used.

## How to restore (1 minute)

```bash
cd src
mv _disabled_ai/routes/ai-config.tsx routes/ai-config.tsx
mkdir -p routes/api/public/{ai-tools,admin}
mv _disabled_ai/routes/api/public/ai-tools/*.ts routes/api/public/ai-tools/
mv _disabled_ai/routes/api/public/admin/api-keys.ts routes/api/public/admin/api-keys.ts
mv _disabled_ai/server/ai-tools.server.ts server/ai-tools.server.ts
mv _disabled_ai/lib/api-key.ts lib/api-key.ts
```

Then in `src/components/AppShell.tsx`, uncomment the `Agente IA` entry in the
`NAV` array (look for the `// AI:` markers).

In `src/hooks/useSilexData.ts`, uncomment the `useAiProfile()` hook and the
`AiProfile` / `ApiKey` types (also marked with `// AI:`).

Run `yarn dev` — TanStack Router will regenerate `routeTree.gen.ts`
automatically and the `/ai-config` page will be back online.
