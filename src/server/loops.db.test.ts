// Close the Loop through completeSessionRewards' core, on Postgres with the real migrations.
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { freshDatabase, pgRewardsStore, serviceConnection } from "./pgTestStores";
import type { RewardsStore } from "./ticketAwards";

vi.mock("server-only", () => ({}));
const { awardSession, recomputeWeek } = await import("./ticketAwards");

const DB = "gp_loops_test";
const uid = (n: number) => `00000000-0000-0000-0000-0000000002${n.toString(16).padStart(2, "0")}`;
const sid = (n: number) => `cccccccc-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [A, B, C, D, ADMIN] = [1, 2, 3, 4, 5].map(uid);
const WEEK = "2026-11-16";

let owner: pg.Client;
let service: pg.Client;
let store: RewardsStore;

async function session(n: number, helper: string, asker: string, at: string, rating = 5) {
  await owner.query(`insert into requests (id, asker_id, course_code, topic, minutes, deadline, place, status)
    values ($1, $2, 'calc1', 'Fixture', 30, now() + interval '1 day', 'Library', 'completed')`, [sid(n), asker]);
  await owner.query(`insert into sessions (id, request_id, helper_id, asker_id, minutes, scheduled_at, place, status,
    rating, completed_at, helper_confirmed_at, asker_confirmed_at)
    values ($1, $1, $2, $3, 30, $4, 'Library', 'completed', $5, $4, $4, $4)`, [sid(n), helper, asker, at, rating]);
}
const bonuses = async () => (await owner.query(
  "select loop_key, user_id, week_start::text as week, tickets::float8 as tickets, members, session_ids from loop_bonuses order by user_id")).rows;
const pool = async (user: string) => (await owner.query(
  "select tickets::float8 as t from week_tickets where user_id = $1 and week_start = $2", [user, WEEK])).rows[0]?.t ?? 0;

describe.skipIf(!process.env.PGHOST)("Close the Loop on Postgres", () => {
  beforeAll(async () => {
    owner = await freshDatabase(DB);
    const users = [A, B, C, D, ADMIN];
    await owner.query("insert into auth.users select unnest($1::uuid[])", [users]);
    await owner.query(`insert into profiles (id, display_name, entry_year, is_admin)
      select id, 'Student ' || ord, 2026, id = $2 from unnest($1::uuid[]) with ordinality as u(id, ord)`, [users, ADMIN]);
    service = await serviceConnection(DB);
    store = pgRewardsStore(service);
  }, 60_000);

  afterAll(async () => {
    await service?.end();
    await owner?.end();
  });

  it("rewards each member of a 3-person loop once, when the closing session is confirmed", async () => {
    await session(1, A, B, "2026-11-17T03:00:00Z");
    await awardSession(store, B, sid(1));
    await session(2, B, C, "2026-11-18T03:00:00Z");
    await awardSession(store, C, sid(2));
    expect(await bonuses()).toEqual([]);

    await session(3, C, A, "2026-11-19T03:00:00Z"); // C helps A: A → B → C → A
    await awardSession(store, A, sid(3));
    const rows = await bonuses();
    expect(rows.map((r) => r.user_id)).toEqual([A, B, C]);
    for (const r of rows) {
      expect(r).toMatchObject({ loop_key: [A, B, C].sort().join("|"), week: WEEK, tickets: 1, members: [C, A, B] });
      expect(r.session_ids).toEqual([sid(3), sid(1), sid(2)]);
    }
    // Each 30-minute new-pair session rated 5 is 1.5 base tickets, plus the loop bonus.
    expect(await pool(A)).toBe(2.5);
    expect(await pool(B)).toBe(2.5);
    expect(await pool(C)).toBe(2.5);
  });

  it("changes nothing when any participant calls again", async () => {
    const before = await bonuses();
    await awardSession(store, C, sid(3));
    await awardSession(store, A, sid(1));
    expect(await bonuses()).toEqual(before);
  });

  it("ignores 2-person swaps and loops with a low rating", async () => {
    await session(4, D, A, "2026-11-19T05:00:00Z");
    await session(5, A, D, "2026-11-19T06:00:00Z"); // a swap, not a loop
    await awardSession(store, A, sid(4));
    await awardSession(store, A, sid(5));
    await session(6, B, D, "2026-11-19T07:00:00Z", 3); // D → A → B would close via B → D, but it's rated 3
    await awardSession(store, D, sid(6));
    expect((await bonuses()).every((r) => r.loop_key === [A, B, C].sort().join("|"))).toBe(true);
  });

  it("recovers missed loops in the week recompute and drops loops built on a disputed session", async () => {
    await owner.query("delete from loop_bonuses");
    await recomputeWeek(store, ADMIN, new Date(`${WEEK}T12:00:00+09:00`));
    expect((await bonuses()).map((r) => r.user_id)).toEqual([A, B, C]);

    await owner.query("update sessions set status = 'disputed' where id = $1", [sid(2)]);
    await recomputeWeek(store, ADMIN, new Date(`${WEEK}T12:00:00+09:00`));
    expect(await bonuses()).toEqual([]);
    expect(await pool(C)).toBe(1.5); // C keeps the base tickets for helping A; B → C no longer counts
  });
});
