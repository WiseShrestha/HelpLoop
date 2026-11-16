# Codex build guide: HelpLoop

**For Codex.** You are now the only builder of this repo. Read this file, `AGENTS.md`, `docs/SPEC.md` and `docs/PLAN.md`, then work through the tickets below **one at a time, in this order**. Each ticket = one branch = one pull request. After opening each PR, stop and wait: a human merges it after Claude Code reviews it. Then pull main and start the next ticket.

**Active extension:** Read [CODEX_FEATURES.md](CODEX_FEATURES.md) with this guide. Its §2 replaces the ticket order and adds features to the affected tickets.

**Deadline:** real students start using the app on **Wed 18 Nov, 12:00 KST**. Tickets 1–8 must be merged by then. Reliability beats features.

## What changed from AGENTS.md
- **You own every folder now**, including `src/server/**`, `src/lib/model/**`, `src/app/admin/**`, `src/app/model/**` and `scripts/**`. Ignore the lane A / lane B split.
- **Still frozen:** `supabase/migrations/**` and the rules in `src/lib/model/*.ts`. A schema change is a new numbered migration in its own PR labelled `contract-change`, with `supabase/tests/flow_test.sql` extended to cover it. Don't change the reward rules; their tests encode docs/SPEC.md §5.
- **Name:** the product is **HelpLoop** (Korean subtitle 공부품앗이). Docs may still say 공부품앗이 or Gongbu Pumasi; use HelpLoop in code and UI.

## Where things stand (Tue 17 Nov, 02:50 KST)
- Merged: app skeleton, Google sign-in, middleware, CI, migration 0002 (privileged RPCs blocked for signed-out callers), the bilingual homepage with example data in `src/components/home/`.
- Passing: 13 reward-logic tests in `src/lib/model`, all database tests in `supabase/tests/run_local.sh`.
- Missing: database types, `src/server/`, and every real screen. Onboarding is a placeholder.

## Rules for every ticket
- Before opening a PR, run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. If you touched SQL, also `supabase/tests/run_local.sh`.
- **Credits and tickets never change from client code.** Use the RPC functions (`accept_request`, `confirm_session`, `cancel_session`, `claim_perk`, `my_balance`) and the functions in `src/server/`. The service-role key is used only in `src/server/**` and `src/lib/supabase/admin.ts`.
- Reuse the homepage's look (`src/components/home/`): its colours, type, icons and English/Korean language switch. New screens follow the selected language.
- Mobile first: design at 375 px, check at 320 px. Put phone-sized screenshots in UI PRs.
- Keep PRs under about 400 changed lines (lockfile excluded). Say in the PR what you ran and anything a human must do.

## The tickets, in order

### 1. T1: database wiring · branch `b/T1-contract`
- Generate `src/lib/db/types.ts` from the live project (`npx supabase gen types typescript --project-id <id>`); if the CLI can't log in, write them by hand from both migration files, including the views `helper_stats` and `week_tickets` and the RPC functions.
- Add `src/lib/supabase/admin.ts`: a server-only client using `SUPABASE_SERVICE_ROLE_KEY`, impossible to import from client components.
- Create `src/server/rewards.ts`, `src/server/queries.ts`, `src/server/draws.ts` with exactly the signatures in docs/SPEC.md §8, returning sample data, each marked `// STUB`.
- Cleanup: package name `helploop`; root metadata title "HelpLoop | 공부품앗이".
- If `pnpm build` warns that `middleware.ts` is deprecated in favour of `proxy.ts`, rename it in this PR and keep its tests passing.

### 2. B1: onboarding · branch `b/B1-onboarding`
docs/SPEC.md §4 and §6. Public fields: display name, entry year, department (or undeclared), courses I can help with (from `courses`), one-line bio. Private fields (`private_profiles`): real name, 8-digit student number, KAIST email. House rule and consent checkbox. A student number already in use shows a clear error in the selected language. A new account reaches the home tabs after one screen.

### 3. A1: tickets on completion · branch `b/A1-rewards`
Replace the stubs in `src/server/rewards.ts` using `sessionTickets` / `weeklyTickets` from `src/lib/model/tickets.ts`.
- `completeSessionRewards(sessionId)`: caller must be the helper or asker, and the session must be `completed`. Load every completed session between that pair (either role, any date), compute this session's breakdown, upsert `ticket_awards` with the admin client. Calling it twice changes nothing.
- `recomputeWeekTickets(weekStart)`: admin only; recompute every completed session in that KST week. Idempotent.
- Tests: an integration test on local Postgres (reuse `supabase/tests/supabase_stub.sql` and the migrations) reproducing the docs/SPEC.md §5.1 values; a non-participant is refused.

### 4. B2: ask · branch `b/B2-ask`
Course, topic, details, minutes (15/30/45/60/90/120), deadline, public place. Shows balance from `my_balance()` and explains when the −30 overdraft rule blocks posting. A 60-credit user can post 60 then 30 minutes, but not a third request. House rule visible.

### 5. B3: help feed · branch `b/B3-feed`
Replace the homepage's example requests with real ones for signed-in users: `getHelpFeed()` (stub data is fine until ticket 8), cards with reason chips ("Due in 3 h", "New connection"), live refresh on `requests`. Signed-out visitors keep the example homepage.

### 6. B4: request page `/r/[id]` · branch `b/B4-request`
Helper: "I'll help" with time and place via `accept_request`. Two people tapping at once: one succeeds, the other sees "already taken". Asker: status, suggested helpers with a copy-link button, cancel.

### 7. B5: session page `/s/[id]` · branch `b/B5-session`
Both names, time, place. Confirm via `confirm_session`: the helper writes what was covered, the asker rates 1–5. On `'completed'`, call `completeSessionRewards`. Cancel, and report a problem. After both confirm, both sides see the update without reloading.

### 8. A2: real queries · branch `b/A2-queries`
Replace the stubs in `src/server/queries.ts`:
- `getHelpFeed()`: open requests, the user's help courses and past partners, ranked by `rankRequestsForHelper`.
- `getSuggestedHelpers(requestId)`: asker only; ranked by `suggestHelpers`, using `helper_stats` ratings and this week's session counts.
- `getWallet()`: balance, ledger history, this week's tickets with per-session breakdown, current draw.
At most two database round trips per function; unit tests with fixtures.

**→ Launch happens here (Wed 12:00).**

### 9. B6: wallet `/wallet` · branch `b/B6-wallet`
Balance and history, this week's tickets with reasons ("New connection ×1.5", "3rd time this week ×0.5"), the draw's published code, perks with `claim_perk`.

### 10. A3: admin `/admin` · branch `b/A3-admin` (must be merged before Sun 22 Nov)
Admins only (others get a 404).
- Create this week's draw: commit hash and prizes.
- Run the draw: enter seed → `verifyCommit` → `recomputeWeekTickets` → `drawWinners` on `week_tickets` → save winners with display names, and save the seed. Show a clear error if the seed doesn't match.
- Manage perks and courses, list and resolve reports.
- Metrics tiles from docs/SPEC.md §9, and a "Copy CSV" button.
- Test: a full draw on seeded data matches `drawWinners` run directly.

### 11. B7, B8: profile, leaderboard, draw page · branch `b/B7-B8`
`/u/[id]` and `/leaderboard` from `helper_stats`, ranked by people helped, ties by rating. `/draw`: prizes, commit hash, and after the draw the seed, ticket table and winners, with a short "how to verify" note.

### 12. A4, A5: simulator and scripts · branch `b/A4-A5`
`src/lib/model/economy.ts` and a public `/model` page (docs/SPEC.md §5.5), deterministic for a seed. `scripts/seed.ts` (40 fake users, 2 weeks of sessions; refuses production without `--prod`) and `scripts/analyze.ts`, which prints every number in docs/SPEC.md §9 for the presentation.

## If you get stuck
- **You want to change the schema:** stop and describe it in the PR. A human must approve a new migration.
- **Model tests fail:** almost always tsconfig `allowImportingTsExtensions` or the Vitest config, not the model code.
- **Google sign-in fails on a preview link:** the human must add that URL in Supabase → Authentication → URL Configuration.
- **Something in a ticket is ambiguous:** pick the simplest reading, say which you chose in the PR, and keep going.

---

## For the human: reviewing with Claude Code
After each Codex PR, paste this into Claude Code, then send the findings back to Codex:

> Review branch `<branch>` against its ticket in docs/CODEX_BUILD.md and the rules in AGENTS.md. Run lint, typecheck, test and build. List findings by severity: bugs, access-rule or privacy holes, credit or ticket logic in client code, missing tests. Don't fix anything; just report.

Review most carefully: tickets 1, 3, 7, 8 and 10 (credits, tickets, permissions, the draw).
