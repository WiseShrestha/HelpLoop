// Integration test on plain Postgres with the real migrations, grants and constraints.
// Runs when PGHOST is set (CI starts a Postgres service); skipped otherwise.
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { RewardsStore, SessionRow } from "./ticketAwards";

vi.mock("server-only", () => ({}));
const { awardSession, recomputeWeek } = await import("./ticketAwards");

const DB = "gp_rewards_test";
const supabaseDir = new URL("../../supabase/", import.meta.url);
const file = (path: string) => readFileSync(new URL(path, supabaseDir), "utf8");
const uid = (n: number) => `00000000-0000-0000-0000-0000000000${n.toString(16).padStart(2, "0")}`;
const sid = (n: number) => `aaaaaaaa-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [A, B, C, D, OUTSIDER, ADMIN] = [1, 2, 3, 4, 5, 6].map(uid);

// The SPEC §5.1 scenario from src/lib/model/tickets.test.ts.
const HISTORY: [helper: string, asker: string, minutes: number, rating: number, completedAt: string][] = [
  [A, B, 30, 5, "2026-11-17T03:00:00Z"], // new pair: 1.5
  [B, A, 60, 4, "2026-11-18T03:00:00Z"], // same pair, roles reversed, 2nd this week: 2
  [A, B, 30, 5, "2026-11-19T03:00:00Z"], // 3rd this week: 0.5
  [A, B, 60, 5, "2026-11-20T03:00:00Z"], // 4th this week: 0
  [A, B, 30, 5, "2026-11-24T03:00:00Z"], // next week: 1
  [A, C, 60, 3, "2026-11-17T04:00:00Z"], // new pair, rating 3: 2.25
  [A, D, 30, 1, "2026-11-17T05:00:00Z"], // rating 1: 0
];
const EXPECTED = [1.5, 2, 0.5, 0, 1, 2.25, 0];
const WEEKS = ["2026-11-16", "2026-11-16", "2026-11-16", "2026-11-16", "2026-11-23", "2026-11-16", "2026-11-16"];
const SCHEDULED = sid(8);

let owner: pg.Client;
let service: pg.Client;
let store: RewardsStore;

// Mirrors rewardsStore.ts, run as service_role like the admin client.
function pgStore(db: pg.Client): RewardsStore {
  const cols = "id, helper_id, asker_id, minutes, rating, status, completed_at";
  const rows = async (text: string, values: unknown[]) =>
    (await db.query(text, values)).rows.map((r) => ({ ...r, completed_at: r.completed_at?.toISOString() ?? null }) as SessionRow);
  return {
    session: async (id) => (await rows(`select ${cols} from sessions where id = $1`, [id]))[0] ?? null,
    completedBetween: (a, b) => rows(`select ${cols} from sessions where status = 'completed'
      and ((helper_id = $1 and asker_id = $2) or (helper_id = $2 and asker_id = $1))`, [a, b]),
    completedBefore: (end) => rows(`select ${cols} from sessions where status = 'completed' and completed_at < $1`, [end]),
    isAdmin: async (id) => (await db.query("select is_admin from profiles where id = $1", [id])).rows[0]?.is_admin === true,
    async upsertAwards(awards) {
      for (const a of awards) {
        await db.query(`insert into ticket_awards (session_id, helper_id, week_start, tickets, breakdown)
          values ($1, $2, $3, $4, $5) on conflict (session_id) do update set helper_id = excluded.helper_id,
          week_start = excluded.week_start, tickets = excluded.tickets, breakdown = excluded.breakdown`,
          [a.session_id, a.helper_id, a.week_start, a.tickets, JSON.stringify(a.breakdown)]);
      }
    },
    weekAwardIds: async (week) =>
      (await db.query("select session_id from ticket_awards where week_start = $1", [week])).rows.map((r) => r.session_id),
    deleteAwards: async (ids) => void (await db.query("delete from ticket_awards where session_id = any($1::uuid[])", [ids])),
  };
}

const awards = async () => (await owner.query(
  "select session_id, tickets::float8 as tickets, week_start::text as week, created_at from ticket_awards order by session_id",
)).rows;

describe.skipIf(!process.env.PGHOST)("ticket awards on Postgres", () => {
  beforeAll(async () => {
    const root = new pg.Client({ database: "postgres" });
    await root.connect();
    await root.query(`drop database if exists ${DB}`);
    await root.query(`create database ${DB}`);
    await root.end();

    owner = new pg.Client({ database: DB });
    await owner.connect();
    await owner.query(file("tests/supabase_stub.sql"));
    for (const m of readdirSync(new URL("migrations/", supabaseDir)).filter((f) => f.endsWith(".sql")).sort()) {
      await owner.query(file(`migrations/${m}`).replace(/^create extension if not exists pg_cron;/m, ""));
    }
    await owner.query(file("seed.sql"));

    const users = [A, B, C, D, OUTSIDER, ADMIN];
    await owner.query("insert into auth.users select unnest($1::uuid[])", [users]);
    await owner.query(`insert into profiles (id, display_name, entry_year, is_admin)
      select id, 'U' || ord, 2026, id = $2 from unnest($1::uuid[]) with ordinality as u(id, ord)`, [users, ADMIN]);
    const sessions = [...HISTORY, [A, B, 30, null, null] as const];
    for (const [i, [helper, asker, minutes, rating, at]] of sessions.entries()) {
      await owner.query(`insert into requests (id, asker_id, course_code, topic, minutes, deadline, place, status)
        values ($1, $2, 'calc1', 'Fixture', $3, now() + interval '1 day', 'Library', $4)`,
        [sid(i + 1), asker, minutes, at ? "completed" : "matched"]);
      await owner.query(`insert into sessions (id, request_id, helper_id, asker_id, minutes, scheduled_at, place,
        status, rating, completed_at, helper_confirmed_at, asker_confirmed_at)
        values ($1, $1, $2, $3, $4, coalesce($6::timestamptz, now()), 'Library', $5, $7, $6, $6, $6)`,
        [sid(i + 1), helper, asker, minutes, at ? "completed" : "scheduled", at, rating]);
    }

    service = new pg.Client({ database: DB });
    await service.connect();
    await service.query("set role service_role");
    store = pgStore(service);
  }, 60_000);

  afterAll(async () => {
    await service?.end();
    await owner?.end();
  });

  it("awards the SPEC §5.1 values to the helper, dated by the KST Monday", async () => {
    // Either participant may trigger it: alternate helper and asker.
    const returned = [];
    for (const [i, [helper, asker]] of HISTORY.entries()) {
      returned.push((await awardSession(store, i % 2 ? asker : helper, sid(i + 1))).tickets);
    }
    expect(returned).toEqual(EXPECTED);
    const rows = await awards();
    expect(rows.map((r) => r.tickets)).toEqual(EXPECTED);
    expect(rows.map((r) => r.week)).toEqual(WEEKS);

    const pool = await owner.query("select user_id, tickets::float8 as t from week_tickets where week_start = '2026-11-16' order by user_id");
    expect(pool.rows).toEqual([{ user_id: A, t: 4.25 }, { user_id: B, t: 2 }]);
  });

  it("changes nothing when called again", async () => {
    const before = await awards();
    for (const [i, [helper]] of HISTORY.entries()) await awardSession(store, helper, sid(i + 1));
    expect(await awards()).toEqual(before);
  });

  it("refuses non-participants, unknown ids and unfinished sessions", async () => {
    await expect(awardSession(store, OUTSIDER, sid(1))).rejects.toThrow("You are not in this session");
    await expect(awardSession(store, A, sid(99))).rejects.toThrow("You are not in this session");
    await expect(awardSession(store, A, SCHEDULED)).rejects.toThrow("This session is not completed yet");
    expect((await awards()).some((r) => r.session_id === SCHEDULED)).toBe(false);
  });

  it("recomputes a week for admins only, restoring lost awards and dropping disputed ones", async () => {
    await expect(recomputeWeek(store, A, new Date("2026-11-18T00:00:00Z"))).rejects.toThrow("Admins only");
    await owner.query("delete from ticket_awards where session_id = $1", [sid(3)]); // a missed call
    await owner.query("update sessions set status = 'disputed' where id = $1", [sid(7)]);
    const before = await awards();

    expect(await recomputeWeek(store, ADMIN, new Date("2026-11-18T00:00:00Z"))).toBe(5);
    const after = await awards();
    expect(after.find((r) => r.session_id === sid(3))?.tickets).toBe(0.5);
    expect(after.some((r) => r.session_id === sid(7))).toBe(false);
    expect(after.find((r) => r.session_id === sid(5))).toEqual(before.find((r) => r.session_id === sid(5))); // other week untouched

    expect(await recomputeWeek(store, ADMIN, new Date("2026-11-20T00:00:00Z"))).toBe(5);
    expect(await awards()).toEqual(after);
  });
});
