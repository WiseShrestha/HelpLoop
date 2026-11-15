# 공부품앗이 (Gongbu Pumasi): product spec

Version 1 · 16 Nov 2026 · team Khela Hobe · ISE Freshmen Idea League, Mon 23 Nov 2026

## 1. The idea in one paragraph
KAIST students study hard but mostly alone, and freshmen choose a major at the end of first year with few contacts in any department. 공부품앗이 is a help exchange: you explain what you know, you get help with what you don't. Every minute you help earns a minute of help back (a time bank). Helping also earns weekly lottery tickets, with a bonus for helping someone new, so the best way to win is to meet many people. Credits also buy access to people freshmen want to meet: seniors, PhD students and alumni.

품앗이 is the Korean tradition of neighbours trading labour. One-line pitch: **"Help one, get helped by one, and meet someone new each time."**

## 2. How it works
1. **Ask.** Post a request: course, topic, minutes (15–120), deadline, a public place.
2. **Help.** Helpers see requests in their courses, ranked with reasons ("Due in 3 h", "New person"). One tap to take it, with a time and place.
3. **Meet.** In a public place: library, lounge, or online.
4. **Confirm.** Helper writes one line on what was covered. Asker rates 1–5. When both confirm, credits move and the helper gets lottery tickets.
5. **Connect.** Both profiles now show each other as study partners.

House rule shown at sign-up and on every request: **explain, don't do graded work for someone else.** Requests about graded assignments must be about understanding, not answers.

## 3. Rewards
| Layer | What you get | When |
|---|---|---|
| Credits | 1 minute of help received per minute given. Starter: 60. You may go to −30. | Every session |
| Lottery tickets | 1 per 30 minutes helped, with bonuses and limits (§5.1) | Every session; draw every Sunday 21:00 |
| Perks | Spend credits on a coffee chat with a senior, lunch with a PhD student, a talk with an alumni founder | Any time, while slots last |
| Recognition | Public helper profile and leaderboard ranked by **people helped**, not hours | Always visible |

Why no small cash per session: small payments can turn a favour into a cheap job and reduce helping (Gneezy and Rustichini, "Pay enough or don't pay at all", 2000). Rewards are either occasional and attractive (lottery) or not money (access, recognition).

Pilot prizes (team-funded, about ₩60,000): one ₩30,000 voucher and two ₩15,000 vouchers, drawn live on Sun 22 Nov at 21:00 KST. Winners collect in person with their student ID.

## 4. Sign-in and identity
- Google sign-in through Supabase Auth: persistent across devices and free to send.
- Onboarding (public): display name, entry year, department (or "undeclared"), courses I can help with, one-line bio.
- Onboarding (private, owner and admins only): real name, 8-digit student number (unique), KAIST email. Not verified at sign-up; checked against the student ID when a prize or perk is collected. One student number = one account, which blocks fake accounts from winning.
- Consent box: anonymised data may be used in the competition presentation.

## 5. The models (lane A owns the code; all implemented and tested in `src/lib/model`)

### 5.1 Lottery tickets (`tickets.ts`)
For each completed session, the helper earns:

`tickets = (minutes / 30) × newPair × pairFactor × ratingFactor`

- `newPair` = 1.5 if these two people have never completed a session together (either role), else 1.
- `pairFactor` by earlier sessions between the same two people in the same week (Mon 00:00 KST start): 1, 1, 0.5, then 0.
- `ratingFactor` by the asker's rating: 5→1, 4→1, 3→0.75, 2→0.25, 1→0.
- Weekly cap: 10 tickets per helper.

Design intent: farming with a friend stops paying after two sessions a week; meeting a new person pays 50% more; low-quality help earns little. Tickets are deterministic from session history, so they can be recomputed at any time (`ticket_awards` is a cache).

Test values (in `tickets.test.ts`): new pair 30 min rating 5 → 1.5; same pair 2nd → 2 (60 min); 3rd → 0.5; 4th → 0; next week → 1; new pair 60 min rating 3 → 2.25; rating 1 → 0; cap → 10.

### 5.2 Credits (`ledger.ts` and the database)
- Time bank: a completed session moves `minutes` from asker to helper. Sessions never change total credit.
- Starter grant 60 on sign-up (database trigger). Perks remove credit.
- Posting is allowed while `balance − minutes in my open/matched requests − new minutes ≥ −30`. Enforced by RLS on `requests`.
- Invariant (tested): total credit = 60 × users + admin grants − perks spent.

### 5.3 The weekly draw (`lottery.ts`)
Commit–reveal, so nobody can say the team rigged it:
1. Monday: an admin chooses a secret seed phrase (kept off the app) and publishes `sha256(seed)` on the draw page.
2. Sunday 21:00: the admin reveals the seed. The app checks the hash, then draws winners weighted by this week's capped tickets, without replacement.
3. The draw page shows the seed, the ticket table and the winners; anyone can recompute.

### 5.4 Ranking and suggestions (`priority.ts`)
- Helper feed: requests in my courses, not mine, not past deadline. `score = urgency + waiting + newPair` with `urgency = 1/(1 + hours left/24)`, `waiting = 0.5 × min(hours waiting/24, 1)`, `newPair = 0.5` if we've never met. Show each part as a chip.
- Suggested helpers for my request: must teach the course. `score = 0.5 (never met) + (avg rating − 3)/4 − 0.1 × sessions this week`. The load penalty spreads work so a few helpers don't burn out. The asker can copy a link to send to a suggested helper.

### 5.5 Economy simulator (`economy.ts`, ticket A4, shown on `/model`)
Agent-based simulation to choose the starter grant and overdraft limit, and to show judges why they matter.
- N students (default 60), K courses (default 6). Each student is strong in 1–2 courses, asks with probability p per day (default 0.25) in a weak course, and helps with probability h (default 0.5) when a request in a strong course is in their feed.
- Daily: generate requests, match using §5.4 ranking, settle credits, award tickets. 14 days.
- Outputs per setting of starter grant (0, 30, 60, 120) and overdraft (0, 30, 60): share of requests fulfilled, share of students blocked from asking at least once, distinct pairs formed, Gini coefficient of balances.
- Must be deterministic for a given seed. Chart on `/model` with sliders.

## 6. Screens (lane B owns, except `/model` and `/admin`)
| Route | Purpose |
|---|---|
| `/` | Signed out: what it is, rules, Google sign-in. Signed in: tabs **Help others** (ranked feed), **My requests**, **My sessions** |
| `/onboarding` | §4 fields, house rule, consent |
| `/ask` | Request form; shows balance and whether you can post; place field suggests public places |
| `/r/[id]` | Request detail. Helper: "I'll help" with time and place. Asker: status, suggested helpers with copy-link, cancel |
| `/s/[id]` | Session: time, place, both names; confirm (helper: what was covered; asker: rating), cancel, report |
| `/wallet` | Balance and history; this week's tickets with per-session breakdown; current draw's commit hash; perks to claim |
| `/u/[id]` | Public helper profile: people helped, minutes, rating, courses, study partners by year and department |
| `/leaderboard` | Top helpers by people helped this semester |
| `/draw` | Current and past draws: prizes, commit hash, revealed seed, ticket table, winners |
| `/model` | Economy simulator and ticket rules explained (lane A) |
| `/admin` | Draws, perks, courses, reports, metrics (lane A) |

Language: Korean first with English underneath on key screens. Mobile first (375 px, check 320 px).

## 7. Data model
Exact SQL: `supabase/migrations/0001_init.sql`. Tested by `supabase/tests/run_local.sh`.

Tables: `profiles`, `private_profiles`, `courses`, `requests`, `sessions`, `ledger`, `ticket_awards`, `draws`, `perks`, `perk_claims`, `reports`, `events`. Views: `helper_stats`, `week_tickets`.

Writes that touch credit go only through database functions called with `supabase.rpc`:
- `accept_request(request, scheduled_at, place)` → session id (atomic; one helper wins)
- `confirm_session(session, rating, covered)` → `'scheduled'` or `'completed'`; on completion moves credit
- `cancel_session(session)` → request reopens if before its deadline
- `claim_perk(perk)` → claim id; checks balance and capacity
- `my_balance()` → int

`ticket_awards` and `draws.winners` are written only by lane A's server code with the service role.

## 8. Server interface (lane A implements; lane B calls)
```ts
// src/server/rewards.ts  ("use server")
export async function completeSessionRewards(sessionId: string): Promise<{ tickets: number }>;
export async function recomputeWeekTickets(weekStart: Date): Promise<number>; // admin; idempotent

// src/server/queries.ts
export async function getHelpFeed(): Promise<ScoredRequest[]>;                // current user
export async function getSuggestedHelpers(requestId: string): Promise<{ helper: Helper; score: number }[]>;
export async function getWallet(): Promise<{
  balance: number;
  entries: { delta: number; reason: string; createdAt: string; sessionId?: string }[];
  weekTickets: number;
  breakdown: TicketBreakdown[];
  draw: { weekStart: string; commitHash: string; prizes: { label: string }[] } | null;
}>;

// src/server/draws.ts  (admin only)
export async function createDraw(weekStart: Date, commitHash: string, prizes: { label: string }[]): Promise<void>;
export async function runDraw(weekStart: Date, seed: string): Promise<{ userId: string; displayName: string; prize: string }[]>;
```
Lane B calls `completeSessionRewards` right after `confirm_session` returns `'completed'`. `runDraw` calls `recomputeWeekTickets` first, so a missed call never loses tickets.

## 9. Pilot metrics (what we present)
- Sign-ups; sessions completed; average rating.
- New connections: pairs who completed a first session, and how many crossed years or departments.
- Reciprocity: share of active users who both gave and received help.
- Ticket rules at work: tickets withheld by the same-pair limit; share of tickets from new-pair sessions.
- Credit health: share of users blocked from asking; distribution of balances.
- Survey (Google Form, 3 questions): would you use it next semester; did you meet someone you wouldn't have otherwise; which reward mattered most.

## 10. Safety and privacy
- Meet only in public places; the place field suggests library, lounges and online.
- Report button on every session; admins review reports.
- Store only what's in §4. Private fields are visible to the owner and admins only.
- Delete-my-account button on the profile page (cascades).
- Academic integrity rule in §2, shown at onboarding and on the ask form.

## 11. Not in the pilot
In-app chat (use KakaoTalk), push notifications, cash payments, verified KAIST email, native apps, library room booking.
