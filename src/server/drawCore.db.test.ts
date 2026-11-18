// A full commit–reveal draw on Postgres with the real migrations. Runs when PGHOST is set.
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { commitHash, drawWinners } from "@/lib/model/lottery";
import type { DrawStore } from "./drawCore";
import { freshDatabase, pgDrawStore, pgRewardsStore, serviceConnection } from "./pgTestStores";
import type { RewardsStore } from "./ticketAwards";

vi.mock("server-only", () => ({}));
const { createDrawCore, runDrawCore } = await import("./drawCore");

const DB = "gp_draw_test";
const uid = (n: number) => `00000000-0000-0000-0000-0000000001${n.toString(16).padStart(2, "0")}`;
const [A, B, C, D, E, ADMIN] = [1, 2, 3, 4, 5, 6].map(uid);
const SEED = "helploop-week-47-test-seed";
const WEEK = new Date("2026-11-18T03:00:00Z"); // Wednesday, week of Mon 16 Nov (KST)
const SUNDAY_LATE = new Date("2026-11-22T12:00:00Z"); // Sun 21:00 KST, same week
const AFTER_WEEK = new Date("2026-11-22T15:00:00Z"); // Mon 23 Nov 00:00 KST
// Five helpers with different ticket totals; nobody has an award row yet (missed calls).
const SESSIONS: [helper: string, asker: string, minutes: number, completedAt: string][] = [
  [A, B, 120, "2026-11-16T05:00:00Z"], [A, C, 120, "2026-11-17T05:00:00Z"], [A, D, 120, "2026-11-18T05:00:00Z"],
  [B, C, 60, "2026-11-17T06:00:00Z"], [C, D, 30, "2026-11-19T06:00:00Z"], [D, E, 30, "2026-11-20T06:00:00Z"],
  [E, A, 60, "2026-11-25T06:00:00Z"], // next week: not in this pool
];

let owner: pg.Client;
let service: pg.Client;
let draws: DrawStore;
let rewards: RewardsStore;

describe.skipIf(!process.env.PGHOST)("weekly draw on Postgres", () => {
  beforeAll(async () => {
    owner = await freshDatabase(DB);
    const users = [A, B, C, D, E, ADMIN];
    await owner.query("insert into auth.users select unnest($1::uuid[])", [users]);
    await owner.query(`insert into profiles (id, display_name, entry_year, is_admin)
      select id, 'Student ' || ord, 2026, id = $2 from unnest($1::uuid[]) with ordinality as u(id, ord)`, [users, ADMIN]);
    for (const [i, [helper, asker, minutes, at]] of SESSIONS.entries()) {
      const id = `bbbbbbbb-0000-0000-0000-${String(i + 1).padStart(12, "0")}`;
      await owner.query(`insert into requests (id, asker_id, course_code, topic, minutes, deadline, place, status)
        values ($1, $2, 'calc1', 'Fixture', $3, now() + interval '1 day', 'Library', 'completed')`, [id, asker, minutes]);
      await owner.query(`insert into sessions (id, request_id, helper_id, asker_id, minutes, scheduled_at, place, status,
        rating, completed_at, helper_confirmed_at, asker_confirmed_at)
        values ($1, $1, $2, $3, $4, $5, 'Library', 'completed', 5, $5, $5, $5)`, [id, helper, asker, minutes, at]);
    }
    service = await serviceConnection(DB);
    draws = pgDrawStore(service);
    rewards = pgRewardsStore(service);
  }, 60_000);

  afterAll(async () => {
    await service?.end();
    await owner?.end();
  });

  it("lets only admins publish a valid commitment, once per week", async () => {
    const prizes = [{ label: "₩30,000 café voucher" }, { label: "Lunch with a senior" }];
    await expect(createDrawCore(draws, A, WEEK, commitHash(SEED), prizes)).rejects.toThrow("Admins only");
    await expect(createDrawCore(draws, ADMIN, WEEK, "not-a-hash", prizes)).rejects.toThrow("64 hex");
    await expect(createDrawCore(draws, ADMIN, WEEK, commitHash(SEED), [])).rejects.toThrow("1–10 prizes");
    await createDrawCore(draws, ADMIN, WEEK, commitHash(SEED).toUpperCase(), prizes);
    await expect(createDrawCore(draws, ADMIN, WEEK, commitHash("other"), prizes)).rejects.toThrow("already has a draw");
    const row = await draws.draw("2026-11-16");
    expect(row).toMatchObject({ week_start: "2026-11-16", commit_hash: commitHash(SEED), seed: null, drawn_at: null });
  });

  it("refuses non-admins, early runs and a seed that doesn't match", async () => {
    await expect(runDrawCore(draws, rewards, A, WEEK, SEED, AFTER_WEEK)).rejects.toThrow("Admins only");
    await expect(runDrawCore(draws, rewards, ADMIN, WEEK, SEED, SUNDAY_LATE)).rejects.toThrow("after the week ends");
    await expect(runDrawCore(draws, rewards, ADMIN, WEEK, "wrong seed", AFTER_WEEK)).rejects.toThrow("does not match");
    await expect(runDrawCore(draws, rewards, ADMIN, new Date("2026-11-30T03:00:00Z"), SEED, new Date("2026-12-08T00:00:00Z")))
      .rejects.toThrow("no draw for this week");
    expect((await draws.draw("2026-11-16"))?.drawn_at).toBeNull();
  });

  it("recomputes the week, draws the same winners as drawWinners, and saves the reveal", async () => {
    // Passing the Sunday of the week (UTC) must still mean the KST week of 16 Nov.
    const winners = await runDrawCore(draws, rewards, ADMIN, new Date("2026-11-22T10:00:00Z"), SEED, AFTER_WEEK);

    const pool = (await owner.query("select user_id, tickets::float8 as tickets from week_tickets where week_start = '2026-11-16'")).rows;
    expect(pool.map((p) => p.user_id).sort()).toEqual([A, B, C, D]); // recompute filled the missed awards; E only helps next week
    expect(pool.find((p) => p.user_id === A)?.tickets).toBe(10); // 6 + 6 + 6 capped at 10
    const expected = drawWinners(SEED, pool.map((p) => ({ userId: p.user_id, tickets: p.tickets })), 2);
    expect(winners.map((w) => w.userId)).toEqual(expected);
    expect(winners.map((w) => w.prize)).toEqual(["₩30,000 café voucher", "Lunch with a senior"]);
    expect(winners.every((w) => w.displayName.startsWith("Student "))).toBe(true);

    const row = await draws.draw("2026-11-16");
    expect(row?.seed).toBe(SEED);
    expect(row?.drawn_at).not.toBeNull();
    expect(row?.winners).toEqual(winners.map((w) => ({ user_id: w.userId, display_name: w.displayName, prize: w.prize })));
  });

  it("cannot be run twice", async () => {
    await expect(runDrawCore(draws, rewards, ADMIN, WEEK, SEED, AFTER_WEEK)).rejects.toThrow("already been run");
  });
});
