# Codex start guide

Codex builds the app skeleton (T0), wires it to the database (T1), then builds every screen (B1–B8). Paste the prompts below one at a time. Wait for each pull request to be reviewed and merged before pasting the next.

## 0. Before you start (5 minutes)
1. Clone the repo and open it:
   ```bash
   git clone https://github.com/WiseShrestha/gongbu-pumasi.git
   cd gongbu-pumasi
   ```
2. Make sure you have Node 20 or later and pnpm (`npm i -g pnpm`).
3. Start Codex in this folder. Codex reads `AGENTS.md` automatically.
   - **Codex CLI:** run `codex` in the repo folder.
   - **Codex in ChatGPT (cloud):** connect the GitHub repo and set the environment's setup command to `pnpm install`. It needs internet access during setup to download packages.
4. T0 doesn't need Supabase keys, so you can start it while the accounts (PLAN step H0) are still being set up. T1 and later need `.env.local` filled in from `.env.example`.

## 1. T0: app skeleton
> Read AGENTS.md, docs/SPEC.md and docs/PLAN.md. Do ticket T0 from docs/PLAN.md on a branch named `b/T0-scaffold` and open a pull request.
> - Create a Next.js App Router project with TypeScript strict, Tailwind CSS, ESLint and Vitest, using pnpm. Use current stable versions and pin them exactly in package.json.
> - Scripts: `lint`, `typecheck` (tsc --noEmit), `test` (vitest run), `build`.
> - tsconfig must have `"allowImportingTsExtensions": true` and `"noEmit": true`, because `src/lib/model` imports with `.ts` extensions.
> - Keep everything in `src/lib/model` and `supabase/` exactly as it is. Its 13 existing tests must pass under Vitest.
> - Add Supabase browser and server clients with `@supabase/ssr` in `src/lib/supabase/`, a "Sign in with Google" button, an auth callback route at `src/app/auth/callback/route.ts`, and `src/middleware.ts` that refreshes the session and sends a signed-in user with no `profiles` row to `/onboarding`.
> - Add `.github/workflows/ci.yml` that runs lint, typecheck, test and build, plus `supabase/tests/run_local.sh` against a `postgres:16` service container (PGHOST=localhost, PGUSER=postgres, POSTGRES_HOST_AUTH_METHOD=trust).
> - Placeholder pages are fine for now: `/` with the sign-in button and `/onboarding` saying "coming soon".
> - Run all four checks locally before opening the PR. In the PR description, list what you ran and anything a human must set up.

**Then:** ask Claude Code to review the branch (prompt in section 4), fix what it finds, merge, and connect the repo to Vercel so every PR gets a preview link.

## 2. T1: database wiring (after H0 is done and T0 is merged)
> Pull main. Do ticket T1 from docs/PLAN.md on branch `b/T1-contract` and open a pull request.
> - Generate `src/lib/db/types.ts` from the live Supabase project (`npx supabase gen types typescript --project-id <id>`). If you can't log in to the Supabase CLI, write the types by hand from `supabase/migrations/0001_init.sql`, including the views and the RPC functions.
> - Create `src/server/rewards.ts`, `src/server/queries.ts` and `src/server/draws.ts` with exactly the function signatures in docs/SPEC.md section 8. They return fixed sample data for now and each has a `// STUB: lane A replaces this` comment. Use the types from `src/lib/model`.
> - Don't change `supabase/` or `src/lib/model`.
> - All four checks must pass.

The project ID is in Supabase under Project Settings → General.

## 3. Screens, one prompt each (after T1 is merged)
Paste this template, swapping the ticket ID, once per ticket in this order: **B1, B2, B3, B4, B5, B6**, then **B7, B8**.

> Pull main. Do ticket `<B1>` from docs/PLAN.md on branch `b/<B1>-<short-name>` and open a pull request.
> - Follow its acceptance criteria exactly and the screen description in docs/SPEC.md section 6.
> - Only edit `src/app/(app)/**` and `src/components/**`. If you need anything elsewhere, describe it in the PR instead.
> - Never change credits or tickets from screen code: use the RPC functions (`accept_request`, `confirm_session`, `cancel_session`, `claim_perk`, `my_balance`) and the functions in `src/server/`.
> - Korean first with English underneath on key text. Design for a 375 px phone; check it at 320 px.
> - Run lint, typecheck, test and build. Put phone-sized screenshots in the PR.

Notes for specific tickets:
- **B1:** show the house rule "explain, don't do graded work for someone else" and the consent box. The student number must be 8 digits; show a clear Korean error if it's already used.
- **B3:** use `getHelpFeed()` and show each score part as a chip ("마감 3시간 / Due in 3 h", "새 친구 / New person").
- **B5:** after `confirm_session` returns `'completed'`, call `completeSessionRewards(sessionId)`.
- **B6:** show the per-session ticket breakdown ("New person ×1.5", "3rd time this week ×0.5").

## 4. Reviews between the two agents
**Claude Code reviewing a Codex branch:**
> Review branch `<branch>` against its ticket in docs/PLAN.md and the rules in AGENTS.md. Run lint, typecheck, test and build. List findings by severity: bugs, access-rule or privacy holes, credit or ticket logic in screen code, missing tests. Don't fix anything; just report.

**Codex reviewing a Claude Code branch:** use `/review` on the branch with the same instructions.

Paste the findings back to the agent that wrote the branch, let it fix them, then one human opens the Vercel preview on a phone and merges. Only one person merges, one PR at a time.

## 5. If Codex gets stuck
- **It wants to change the schema:** stop. Schema changes need a new migration file and a human's approval (AGENTS.md).
- **Tests in `src/lib/model` fail after T0:** it's almost always the tsconfig `allowImportingTsExtensions` setting or Vitest config, not the model code.
- **Google sign-in fails on the preview link:** add the Vercel preview URL to Supabase → Authentication → URL Configuration → Redirect URLs.
