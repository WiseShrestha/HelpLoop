# 공부품앗이: build and pilot plan

All times KST. Presentation: Mon 23 Nov, 16:00, E2-2 Room 1501, 5 minutes.

## 1. Where we start
Already built and tested before day 1:
- Reward logic: tickets, credits, provably fair lottery, feed ranking and helper suggestions (`src/lib/model`, 13 tests passing, strict type-check clean).
- Database: full schema, access rules and credit-moving functions (`supabase/migrations/0001_init.sql`), verified end to end on Postgres 16 by `supabase/tests/run_local.sh`. It confirms that users can't mint credit, make themselves admin, take their own request, confirm someone else's session, double-confirm, overdraw past −30 or exceed perk capacity.

What's left: the app around it (screens, sign-in, server glue, admin, simulator) and the pilot.

## 2. Roles
| Who | Role |
|---|---|
| Shresth | Product owner and the only merger. Accounts and setup (H0). Runs the draw. |
| Suvasish | Tester and recruiter. Tests every preview on a phone, recruits helpers and perk hosts, owns the survey and deck. |
| Codex | T0 scaffold and T1 wiring first (so building starts now), then lane B: every user-facing screen. |
| Claude Code | Lane A: server glue for rewards, queries, admin, economy simulator, analysis script. Reviews Codex's T0 and T1. |

## 3. How the two agents avoid collisions
1. The schema and model code are fixed (see AGENTS.md). Both lanes build on them.
2. Separate folders per lane. Lane B calls lane A only through the functions in SPEC §8; until lane A merges them, lane B uses the stubs created in T1.
3. Separate git worktrees so both run at once on one laptop: `git worktree add ../gp-codex main` and `git worktree add ../gp-claude main`.
4. Every PR is reviewed by the other agent (Codex `/review`; ask Claude Code to review a branch). A human merges one PR at a time; both agents pull `main` before their next ticket.

## 4. Schedule
| When | What | Done when |
|---|---|---|
| **Mon 16, by 18:00** | Send the application email. | Sent |
| Mon 16, evening | H0 (humans, about 1 h). T0 then T1 (Codex; T0 can start before H0 is finished). | Blank app live on Vercel with Google sign-in; migration applied on Supabase; stubs merged |
| Tue 17 | Lane A: A1–A3. Lane B: B1–B6. Evening: 4–6 friends test on phones, file bugs. Suvasish recruits 5+ seniors as helpers and 3 perk hosts. | Ask → accept → meet → confirm → credits and tickets show in wallet, on a phone |
| Wed 18, by 12:00 | Fix list (T2), B7–B8, A4. Admin creates this week's draw and publishes the commit hash. | Draw page shows the hash |
| Wed 18, 12:00 | **Launch** to your freshman course group chats and the recruited seniors. | 20+ sign-ups by Wed night |
| Thu 19 – Sun 22 | Pilot. Bug fixes only on `main`. Post a "requests waiting" nudge at lunch and dinner. Check `/admin` nightly. | 15+ completed sessions |
| Sat 21 | Deck draft with interim numbers (Suvasish). A5 analysis script. | Draft deck |
| **Sun 22, 21:00** | **Live draw** in the group chat: reveal the seed, show winners, invite anyone to verify. Survey link goes out. | Winners announced |
| Sun 22, 23:00 | Freeze data, run A5, final numbers into the deck, rehearse twice with a timer. | 5:00 or less |
| Mon 23 | Morning rehearsal; collect prize receipts and a few quotes; present at 16:00. | — |

If you fall behind, cut in this order: suggested helpers on the request page, `/leaderboard` (keep profile stats), perks claiming in the app (run perks by hand), `/model` sliders (keep a static chart).

## 5. Tickets

**H0. Accounts and setup** · Owner: humans · about 1 hour
- GitHub repo `gongbu-pumasi` with these files; both humans as admins.
- Supabase project in the Seoul region. Enable the `pg_cron` extension. Run `0001_init.sql` in the SQL editor. Run `supabase/seed.sql` after editing the course list.
- Google sign-in: create an OAuth client in Google Cloud (Web application; redirect URI = the callback URL shown in Supabase Auth → Providers → Google), paste the client ID and secret into Supabase. Add the Vercel URL to Supabase's redirect allow-list.
- Vercel project linked to the repo with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- After you first sign in: `update profiles set is_admin = true where id = '<your user id>';` in the SQL editor.

**T0. Scaffold** · Owner: Codex (reviewed by Claude Code)
- Next.js + TS strict + Tailwind + Vitest + ESLint, pnpm scripts `lint`, `typecheck`, `test`, `build`. Keep the existing `src/lib/model` files and tests; they must pass under Vitest.
- `tsconfig`: `allowImportingTsExtensions: true`, `noEmit: true`.
- Supabase browser and server clients (`@supabase/ssr`), Google sign-in button, auth callback route, middleware sending signed-in users without a profile to `/onboarding`.
- GitHub Action: the four checks plus `supabase/tests/run_local.sh` against a `postgres:16` service container.
- Accept: Vercel preview signs in with Google; CI green.

**T1. Contract wiring** · Owner: Codex · human approves
- Generate `src/lib/db/types.ts` from the live project. Add `src/server/{rewards,queries,draws}.ts` with the SPEC §8 signatures returning fixed sample data.
- Accept: both lanes can import the stubs; types compile.

### Lane B (Codex), after T1
- **B1. Sign-in and onboarding** (`/`, `/onboarding`): SPEC §4 fields with zod validation, course multi-select from `courses`, house rule, consent. Accept: a new account reaches the home tabs in one screen; an 8-digit student number already in use shows a clear Korean error.
- **B2. Ask** (`/ask`): SPEC §2 fields; shows balance from `my_balance()` and blocks with the reason when the overdraft rule fails. Accept: a 60-credit user can post 60 + 30 minutes but not a third request.
- **B3. Help feed** (home tab): `getHelpFeed()`, cards with reason chips, realtime refresh on `requests`. Accept: a request posted on phone A appears on phone B within 5 s in the right order.
- **B4. Request page** (`/r/[id]`): helper takes it via `accept_request` (time + place); asker sees status, suggested helpers with copy-link, cancel. Accept: two phones tapping "I'll help" at once: one succeeds, the other sees "already taken".
- **B5. Session page** (`/s/[id]`): both names, time, place; confirm via `confirm_session` (helper: covered; asker: 1–5 stars); on `'completed'` call `completeSessionRewards`; cancel; report. Accept: after both confirm, both wallets update without reload.
- **B6. Wallet** (`/wallet`): `getWallet()`; balance, history, this week's tickets with per-session breakdown ("New person ×1.5", "3rd time this week ×0.5"), draw commit hash, perks with claim via `claim_perk`. Accept: breakdown numbers match SPEC §5.1 for a seeded week.
- **B7. Profile and leaderboard** (`/u/[id]`, `/leaderboard`): from `helper_stats`; partners grouped by year and department. Accept: ranks by people helped, ties by rating.
- **B8. Draw page** (`/draw`): prizes, commit hash, and after the draw the seed, ticket table and winners, with a "How to verify" note. Accept: shows a past draw correctly from seeded data.

### Lane A (Claude Code), after T1
- **A1. Rewards glue** (`src/server/rewards.ts`): `completeSessionRewards` and `recomputeWeekTickets` using `sessionTickets`/`weeklyTickets` over the helper's and the pair's history; upsert `ticket_awards` with the service role; idempotent. Accept: integration test on a seeded database reproduces SPEC §5.1 values; calling twice changes nothing.
- **A2. Queries** (`src/server/queries.ts`): `getHelpFeed`, `getSuggestedHelpers`, `getWallet` feeding `priority.ts`. Accept: unit tests with fixtures; each query is a single round trip or two.
- **A3. Admin** (`/admin`, admins only): create draw (enter commit hash and prizes), run draw (enter seed → verify → recompute → `drawWinners` → save), manage perks and courses, view reports, metrics tiles (SPEC §9) and CSV copy. Accept: a full draw on seeded data matches `drawWinners` run by hand.
- **A4. Economy simulator** (`src/lib/model/economy.ts`, `/model`): SPEC §5.5, deterministic, tested; page with sliders and a chart of requests fulfilled and students blocked versus starter grant. Accept: same seed, same numbers; page works signed out.
- **A5. Seed and analysis** (`scripts/seed.ts`, `scripts/analyze.ts`): 40 fake users and 2 weeks of sessions for development (refuses to run against production without `--prod`); `analyze.ts` prints every SPEC §9 number from the real data for the deck. Accept: analysis numbers match `/admin` tiles.

### Both
- **T2. Fix list** from Tuesday's phone test, assigned by folder ownership, ordered by severity.

## 6. Kick-off prompts
**Codex:** follow `docs/CODEX_START.md`, which has every prompt in order (T0, T1, then B1–B8).

**Claude Code (after T1 is merged):**
> Read AGENTS.md, docs/SPEC.md and docs/PLAN.md. You are lane A. Do A1, then A2, each as its own branch and PR, replacing the stubs in src/server. Keep src/lib/model behaviour and supabase/ unchanged unless a ticket says otherwise. Stop after each PR is open.

**Cross-review (either tool):**
> Review branch `<branch>` against its ticket in docs/PLAN.md and the rules in AGENTS.md. Run lint, typecheck, test and build. List findings by severity: bugs, RLS or privacy holes, credit or ticket logic outside the allowed places, missing tests. Don't fix anything.

## 7. Pilot playbook
- **Supply first.** Before launch, line up 5+ seniors or strong classmates who'll answer requests in the common freshman courses, and 3 perk hosts (for example a senior in EE, an ISE PhD student, an alumni founder). Create the perks in `/admin`.
- **Launch message** (Korean and English): what it is, the house rule, the Sunday prize, the link.
- **Seed demand.** Each of you posts a real request on day 1 so helpers see activity.
- **Twice daily:** check open requests; nudge helpers in the relevant course chat.
- **Sunday 21:00:** run the draw live, screenshot it, send the survey.
- **Collect evidence for the deck:** a photo of a session (with permission), two quotes from users, the draw screenshot.

## 8. Risks
| Risk | What we do |
|---|---|
| Requests with nobody to answer | Recruit helpers before launch; suggested-helper copy-link; team members answer early requests |
| Fake sessions to farm tickets | Pair decay and weekly cap (§5.1), ratings, one account per student number, prize collected with student ID, spot-check winners on what was covered |
| Academic integrity concerns | House rule at onboarding and on the ask form; "covered" line on every session; report button |
| Judges ask "how is this different from KAIST's tutoring programme or 열품타?" | Tutoring is scheduled and one-directional; 열품타 rewards hours alone. This is on-demand, two-way, and rewards helping new people |
| Meeting strangers | Public places only, report button, admin review |
| Google sign-in setup blocks day 1 | Do H0 first; fallback is Supabase anonymous sign-in for the first day only, with student number still required |
| Team pays for prizes | About ₩60,000 total; state it openly in the pitch with the plan for sponsors |
