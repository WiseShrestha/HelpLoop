# Codex feature guide: seven new HelpLoop features

**For Codex.** This adds seven features to `docs/CODEX_BUILD.md`. Same rules: one ticket = one branch = one PR; stop after each PR; a human merges after Claude Code reviews. Section 2 replaces the order in CODEX_BUILD.md.

## 1. The seven features
| ID | Feature | What it is | Priority |
|---|---|---|---|
| F1 | **Close the Loop** | When help forms a circle (A helps B, B helps C, C helps A), everyone in it gets a bonus ticket, and the loop is shown on their profiles | Must |
| F2 | **Stuck Map** | A public, anonymised heat map of which topics each course is stuck on this week, for students and professors | Must |
| F3 | **Ask anonymously** | The asker's name stays hidden until a helper accepts | Must, before launch |
| F4 | **Open Table** | "Studying Calculus at Library 2F until 18:00, join me": co-studying without needing a question | Should |
| F5 | **Major Explorer** | Department pages built from the network: seniors who help, their perks, and your connections by department and year | Nice |
| F6 | **Skills and languages** | Things to teach beyond courses: Korean and English conversation, Python, LaTeX, CAD, getting into a research lab, CVs | Must, before launch |
| F7 | **Verified help record** | A shareable, opt-in page of your confirmed and rated help, per course | Should |

## 2. New order (replaces CODEX_BUILD.md's order)
Before launch (Wed 18 Nov, 12:00 KST):
1. **T1** database wiring (unchanged)
2. **C3** migration 0003 for all seven features (contract change, human approves)
3. **B1** onboarding, now with course, language and skill chips (F6)
4. **A1** tickets on completion (unchanged)
5. **B2** ask form, now with the anonymous toggle (F3), topic tag (F2) and skills and languages (F6)
6. **B3** help feed, now reading `request_board`, showing "A classmate" for anonymous asks, with Courses / Languages / Skills filters
7. **B4** request page, **B5** session page (unchanged; names appear once a helper accepts)
8. **A2** real queries

After launch, in this order:

9. **F1** Close the Loop
10. **F2** Stuck Map
11. **B6** wallet (now also shows loop bonuses)
12. **A3** admin and draw (must be merged before Sun 22 Nov; the draw uses `week_tickets`, which now includes loop bonuses)
13. **F4** Open Table
14. **F7** Verified help record
15. **F5** Major Explorer
16. **B7, B8, A4, A5** (unchanged)

If time runs short, cut from the bottom of this list. F1 and F2 matter most for the presentation.

## 3. C3: migration 0003 · branch `b/C3-features-schema` · label `contract-change`
One new file, `supabase/migrations/0003_features.sql`. Extend `supabase/tests/flow_test.sql` for every rule marked **test**. Don't edit 0001 or 0002.

**Skills and languages (F6)**
- `courses`: add `kind text not null default 'course' check (kind in ('course','language','skill'))`.
- Seed (on conflict do nothing): languages `korean` (한국어 회화 / Korean conversation) and `english` (영어 회화 / English conversation); skills `python` (Python), `latex` (LaTeX), `cad` (CAD), `research-lab` (연구실·URP 준비 / Getting into a research lab), `cv` (이력서·자기소개서 / CVs and applications), `major-advice` (전공 선택 상담 / Choosing a major).

**Topic tags (F2)**
- New table `course_topics(course_code text references courses, tag text, label_ko text, label_en text, primary key (course_code, tag))`; readable by everyone signed in; admins write.
- `requests`: add `topic_tag text` (nullable; the ask form offers the course's tags plus "Other").

**Anonymous asks (F3)**
- `requests`: add `is_anonymous boolean not null default false`.
- Replace the policy `requests_read` so a user reads a `requests` row directly only if they are its asker, an admin, or the helper of a live session on it.
- New view `request_board` (security definer, select granted to `authenticated`) with every request column except that `asker_id` is null when `is_anonymous` is true and the viewer is not the asker. It lists `open` requests plus the viewer's own.
- **test:** a third user reading `request_board` sees `asker_id` null on an anonymous request; after the helper accepts, the helper can read the asker on the session; a third user still cannot.
- Realtime can't stream a view, so the feed refreshes every 15 seconds while visible.

**Close the Loop (F1)**
- New table `loop_bonuses(loop_key text, user_id uuid references profiles on delete cascade, week_start date not null, tickets numeric(6,2) not null, members uuid[] not null, session_ids uuid[] not null, created_at timestamptz default now(), primary key (loop_key, user_id))`. Users read their own rows, plus rows whose `members` include them; admins read all. No client writes (server only, service role).
- Replace the view `week_tickets`: per user and week, `least(sum of ticket_awards, 10) + least(sum of loop_bonuses, 2)`.
- **test:** a user cannot insert into `loop_bonuses`; `week_tickets` adds both parts and caps each.

**Stuck Map (F2)**
- New view `stuck_map` (security definer, select granted to `anon` and `authenticated`): `course_code`, `topic_tag`, `week_start` (Monday KST), `requests` (count). Only the last 8 weeks, and **only groups with 3 or more requests from at least 3 distinct students**, to suppress small cohorts. This reduces disclosure risk; it does not guarantee that re-identification is impossible.
- **test:** a group with 2 requests does not appear; a group with 3 does.

**Open Table (F4)**
- New table `open_tables(id uuid pk, host_id uuid references profiles, course_code text references courses null, note text check (char_length(note) <= 120), place text not null, starts_at timestamptz not null, ends_at timestamptz not null, max_people int not null default 6 check (max_people between 2 and 12), created_at timestamptz default now(), check (ends_at > starts_at and ends_at <= starts_at + interval '6 hours'))`.
- New table `open_table_joins(table_id uuid references open_tables on delete cascade, user_id uuid references profiles on delete cascade, joined_at timestamptz default now(), primary key (table_id, user_id))`.
- Everyone signed in reads both. A user inserts their own table and their own join; the host deletes or ends their table; a user deletes their own join. Joining is refused once the table is full or ended. Capacity includes the host, who reserves one place even without a join row; the host is not counted twice if they also join explicitly. Serialize competing joins at the database level.
- **test:** the 7th person cannot join a 6-person table; nobody can join an ended table.

**Major Explorer (F5) and help record (F7)**
- `perks`: add `department text`.
- `profiles`: add `public_record boolean not null default false`.
- New view `helper_course_stats` (security definer): `user_id`, `course_code`, `sessions`, `people_helped`, `minutes`, `avg_rating`, `first_at`, `last_at` from completed sessions. Rows are visible to the user themselves, admins, and everyone when the user's `public_record` is true.
- **test:** another user sees no rows until `public_record` is turned on.

Also update `docs/SPEC.md` (§5.1b Close the Loop rules, §7 new tables and views) in the same PR.

## 4. Feature tickets

### F1: Close the Loop · branch `b/F1-loops`
- **Referenced model files:** `src/lib/model/loops.ts` and `loops.test.ts` are described as already written with 7 passing tests, but were not included in this handoff and are not in the repository. Obtain the original files before F1, then copy them in unchanged. They define the rules: edges are completed sessions helper → asker rated 4 or 5, within 14 days; loops of 3–5 people; each set of people rewarded once ever; 1 ticket per member; at most 2 loop bonuses per person per week.
- In `completeSessionRewards`, after the session's own tickets: load completed sessions from the last 14 days, call `loopsClosedBy`, then `loopAwards` with the keys already in `loop_bonuses` and each member's loop bonuses this week, and insert the awards. Idempotent.
- UI:
  - **Session page:** after completion, a celebration if a loop closed ("You closed a loop with Minji and Jae! +1 ticket").
  - **Wallet:** loop bonuses listed with the members' names.
  - **Profile:** "My loops", a small diagram per loop: members as circles in order, arrows showing who helped whom.
- Tests: integration test of a 3-person loop through `completeSessionRewards`; calling it twice adds nothing.

### F2: Stuck Map · branch `b/F2-stuck-map`
- **Ask form:** after choosing a course, pick a topic tag from that course's tags or "Other".
- **Public page `/stuck`,** works signed out:
  - a course selector
  - for the current week, a horizontal bar per topic ("Taylor series 9 · Integration by parts 5"), sorted by count
  - last week's count beside each, as a small marker
  - a note in both languages: only topics with 3 or more requests from at least 3 distinct students are shown; small cohorts are suppressed
  - an empty state when nothing meets the threshold
- **Admin:** add and edit topic tags per course. Seed 5–8 tags each for the pilot courses (for example, Calculus I: limits, derivatives, integration techniques, Taylor series, sequences and series).
- Use the homepage's visual style; bars and labels readable at 320 px.

### F3: Ask anonymously (part of B2 and B3)
- **Ask form:** toggle "Ask anonymously: your name is shown only to the helper who accepts".
- **Feed and request page:** show "A classmate" (익명의 친구), and no year or department.
- **After a helper accepts:** both names show on the session page.
- Never send an anonymous asker's id to anyone else's browser. Do the "New connection" check in `getHelpFeed` on the server and return only a true/false flag.

### F4: Open Table · branch `b/F4-open-table`
- A new home tab "Study together" (함께 공부):
  - live tables: place, course or skill, note, time left, people joined (avatars and names)
  - "Join" and "Leave" buttons
  - "Open a table" form: place (suggest public places), optional course or skill, note, start and end
- Hide tables after they end.
- No credits or tickets for tables; they are for meeting people. Show "You've studied with 4 new people at Open Tables" on the profile.

### F5: Major Explorer · branch `b/F5-majors`
- **`/majors`:** a card per department that has at least one helper. Each card shows helpers, people helped, top courses helped, and perks hosted.
- **`/majors/[dept]`:**
  - helpers from that department with public profiles
  - that department's perks, with "Claim with credits"
  - an "Ask a senior" button that opens the ask form with the `major-advice` skill selected
- **On your own profile:** "Your network" shows your study partners grouped by department and year, as chips with counts.

### F6: Skills and languages (part of B1, B2, B3)
- **Onboarding:** "What can you help with?" has three groups of chips: Courses, Languages, Skills.
- **Ask form:** the same three groups.
- **Feed:** filter chips: All · Courses · Languages · Skills.
- **Language exchange badge:** show a "Language exchange" (언어 교환) badge when someone who helps with Korean is matched with someone who helps with English, or the reverse.

### F7: Verified help record · branch `b/F7-help-record`
- **Profile toggle:** "Make my help record public" (off by default).
- **`/u/[id]/record`:**
  - name, department and year
  - totals: people helped, sessions, minutes, average rating
  - a per-course table from `helper_course_stats`
  - first and last session dates
  - the line "Every session was confirmed by both people and rated by the person who was helped."
  - a "Copy link" button and a print-friendly layout
- **When the record is off:** the page says the record is private. Admins still see it.

## 5. For the human
- **C3 is a schema change.** Review it carefully, run `supabase/tests/run_local.sh`, then run `0003_features.sql` in the Supabase SQL editor after merging.
- **Before launch,** add topic tags for your pilot courses in the admin page or the SQL editor. Without them the Stuck Map stays empty.
- **For the presentation,** the Stuck Map needs real requests with topic tags. Encourage pilot users to pick a tag when asking.