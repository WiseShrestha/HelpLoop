# AGENTS.md: rules for every coding agent (Codex and Claude Code)

Two humans and two coding agents build this repo in parallel. Read this file, then `docs/SPEC.md` and `docs/PLAN.md`, before starting any ticket.

## What we are building
공부품앗이 (Gongbu Pumasi): a mobile web app where KAIST students trade study help. Helping earns time-bank credits and weekly lottery tickets, with a bonus for helping someone new. Credits also buy coffee chats with seniors and alumni.

Real students use it from Wed 18 Nov 2026; the presentation is Mon 23 Nov. Reliability beats features.

## Stack (don't change without a human's approval)
- Next.js (App Router) + TypeScript strict + Tailwind CSS
- Supabase: Postgres, Auth (Google provider), Realtime, Row Level Security
- Vercel hosting; pnpm; Vitest
- `tsconfig.json` must keep `"allowImportingTsExtensions": true` and `"noEmit": true`: the model files import each other with `.ts` extensions.

## Already done: don't rewrite
- `src/lib/model/{tickets,ledger,lottery,priority}.ts` with tests (13 passing). Change them only in a lane-A ticket, and update the tests and `docs/SPEC.md` §5 together.
- `supabase/migrations/0001_init.sql`, verified by `supabase/tests/run_local.sh` (all checks pass).

## Ownership: who edits what
| Folder | Owner |
|---|---|
| Root config (`package.json`, `tsconfig.json`, `next.config.*`, Tailwind, ESLint, `.github/`), `src/lib/supabase/**`, `src/middleware.ts`, `src/app/auth/**` | Codex for T0 and T1; after that, changes need a human's approval |
| `src/app/(app)/**`, `src/components/**` | Codex (lane B: screens) |
| `src/lib/model/**`, `src/server/**`, `src/app/model/**`, `src/app/admin/**`, `scripts/**` | Claude Code (lane A: rewards, data, admin) |
| `supabase/**`, `src/lib/db/types.ts` | Frozen contract: humans approve every change |
| `AGENTS.md`, `CLAUDE.md`, `docs/**` | Humans |

If you need a change in a folder you don't own, stop and describe it in your PR instead of editing.

## Hard rules
- Credits and tickets never change from client code. Use the RPC functions (`accept_request`, `confirm_session`, `cancel_session`, `claim_perk`) and lane A's server functions. Never use the service-role key outside `src/server/**`.
- Never edit an existing migration. A schema change is a new `000N_*.sql` in its own PR labelled `contract-change`, with `supabase/tests/flow_test.sql` extended to cover it.
- Times are stored as `timestamptz` (UTC) and shown in Asia/Seoul. Weeks start Monday 00:00 KST (`weekStartKST`).
- UI text: Korean first, English underneath on key screens. Mobile first: 375 px, check 320 px.
- Show the academic-integrity rule ("explain, don't do graded work for someone else") at onboarding and on the ask form.

## Working rules
- One ticket = one branch = one PR. Branch names: `a/A1-rewards`, `b/B3-help-feed`.
- Before a PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass. If you touched SQL, also run `supabase/tests/run_local.sh`.
- Keep PRs under about 400 changed lines. Describe what changed, how you tested, and attach phone screenshots for UI.
- No new dependency without a reason in the PR. Never commit secrets (`.env.example` lists the names).

## Review and done
Every PR is reviewed by the other agent, then merged by a human after clicking through the Vercel preview on a phone. Done = acceptance criteria in `docs/PLAN.md` met, checks green, reviewed, merged.
