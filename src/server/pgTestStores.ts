// Test-only helpers: a fresh Postgres database with the real stub and migrations, and
// pg-backed stores that mirror rewardsStore.ts and drawStore.ts. Imported only by *.db.test.ts.
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import type { DrawStore } from "./drawCore";
import type { RewardsStore, SessionRow } from "./ticketAwards";

const supabaseDir = new URL("../../supabase/", import.meta.url);
const file = (path: string) => readFileSync(new URL(path, supabaseDir), "utf8");

/** Recreates `name` with supabase_stub.sql, every migration and seed.sql; returns an owner connection. */
export async function freshDatabase(name: string): Promise<pg.Client> {
  const root = new pg.Client({ database: "postgres" });
  await root.connect();
  // Test files run in parallel. On a fresh cluster (CI) their stubs would race to create the
  // cluster-wide roles, so build one database at a time.
  await root.query("select pg_advisory_lock(727001)");
  try {
    await root.query(`drop database if exists ${name}`);
    await root.query(`create database ${name}`);
    const owner = new pg.Client({ database: name });
    await owner.connect();
    await owner.query(file("tests/supabase_stub.sql"));
    for (const m of readdirSync(new URL("migrations/", supabaseDir)).filter((f) => f.endsWith(".sql")).sort()) {
      await owner.query(file(`migrations/${m}`).replace(/^create extension if not exists pg_cron;/m, ""));
    }
    await owner.query(file("seed.sql"));
    return owner;
  } finally {
    await root.end(); // ends the session, releasing the lock
  }
}

/** A connection acting as service_role, like the admin client. */
export async function serviceConnection(name: string): Promise<pg.Client> {
  const service = new pg.Client({ database: name });
  await service.connect();
  await service.query("set role service_role");
  return service;
}

export function pgRewardsStore(db: pg.Client): RewardsStore {
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
    completedWithin: (from, to) => rows(`select ${cols} from sessions where status = 'completed'
      and completed_at >= $1 and completed_at <= $2`, [from, to]),
    rewardedLoopKeys: async (keys) =>
      (await db.query("select distinct loop_key from loop_bonuses where loop_key = any($1)", [keys])).rows.map((r) => r.loop_key),
    loopBonusCounts: async (week, ids) => new Map((await db.query(
      "select user_id, count(*)::int as n from loop_bonuses where week_start = $1 and user_id = any($2::uuid[]) group by user_id",
      [week, ids])).rows.map((r) => [r.user_id, r.n])),
    async insertLoopBonuses(loops) {
      for (const l of loops) {
        await db.query(`insert into loop_bonuses (loop_key, user_id, week_start, tickets, members, session_ids)
          values ($1, $2, $3, $4, $5, $6) on conflict (loop_key, user_id) do nothing`,
          [l.loop_key, l.user_id, l.week_start, l.tickets, l.members, l.session_ids]);
      }
    },
    weekLoopBonuses: async (week) =>
      (await db.query("select loop_key, session_ids from loop_bonuses where week_start = $1", [week])).rows,
    deleteLoops: async (keys) => void (await db.query("delete from loop_bonuses where loop_key = any($1)", [keys])),
  };
}

export function pgDrawStore(db: pg.Client): DrawStore {
  const cols = "id, week_start::text, commit_hash, prizes, seed, winners, drawn_at::text";
  return {
    isAdmin: async (id) => (await db.query("select is_admin from profiles where id = $1", [id])).rows[0]?.is_admin === true,
    draw: async (week) => (await db.query(`select ${cols} from draws where week_start = $1`, [week])).rows[0] ?? null,
    async insertDraw(row) {
      await db.query("insert into draws (week_start, commit_hash, prizes) values ($1, $2, $3)",
        [row.week_start, row.commit_hash, JSON.stringify(row.prizes)]);
    },
    pool: async (week) => (await db.query(
      "select user_id, display_name, tickets::float8 as tickets from week_tickets where week_start = $1 order by user_id", [week])).rows,
    saveResult: async (id, seed, winners) => ((await db.query(
      "update draws set seed = $2, winners = $3, drawn_at = now() where id = $1 and drawn_at is null",
      [id, seed, JSON.stringify(winners)])).rowCount ?? 0) > 0,
  };
}
