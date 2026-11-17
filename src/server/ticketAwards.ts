import "server-only";

import type { Database, Json } from "@/lib/db/types";
import { sessionTickets, weekStartKST, type CompletedSession, type TicketBreakdown } from "@/lib/model/tickets";

// Not a "use server" module: nothing here is reachable from the browser. src/server/rewards.ts
// authenticates the caller and passes their id in.

export type SessionRow = Pick<
  Database["public"]["Tables"]["sessions"]["Row"],
  "id" | "helper_id" | "asker_id" | "minutes" | "rating" | "status" | "completed_at"
>;
export type AwardRow = Database["public"]["Tables"]["ticket_awards"]["Insert"];

/** Data access with service-role rights. Production: rewardsStore.ts; tests: an in-memory or pg store. */
export interface RewardsStore {
  session(id: string): Promise<SessionRow | null>;
  /** Completed sessions between two people, either role, any date. */
  completedBetween(a: string, b: string): Promise<SessionRow[]>;
  /** Every completed session that finished before `end`. */
  completedBefore(end: Date): Promise<SessionRow[]>;
  isAdmin(userId: string): Promise<boolean>;
  upsertAwards(rows: AwardRow[]): Promise<void>;
  weekAwardIds(weekStart: string): Promise<string[]>;
  deleteAwards(sessionIds: string[]): Promise<void>;
}

export class RewardsError extends Error {}

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;

/** The KST calendar date of `d` as YYYY-MM-DD. weekStartKST() is Sunday 15:00 UTC, so never slice toISOString(). */
export function kstDate(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function isRating(r: number | null): r is CompletedSession["rating"] {
  return r === 1 || r === 2 || r === 3 || r === 4 || r === 5;
}

function toCompleted(row: SessionRow): CompletedSession {
  if (row.status !== "completed" || !row.completed_at || !isRating(row.rating)) {
    throw new RewardsError(`Session ${row.id} is not a rated, completed session`);
  }
  return {
    id: row.id, helperId: row.helper_id, askerId: row.asker_id, minutes: row.minutes,
    rating: row.rating, completedAt: new Date(row.completed_at),
  };
}

function toAward(b: TicketBreakdown, s: CompletedSession): AwardRow {
  return {
    session_id: b.sessionId, helper_id: b.helperId, week_start: kstDate(weekStartKST(s.completedAt)),
    tickets: b.tickets, breakdown: { ...b } satisfies { [key: string]: Json },
  };
}

/** Tickets for one completed session. Only its helper or asker may ask. Idempotent. */
export async function awardSession(store: RewardsStore, callerId: string, sessionId: string): Promise<{ tickets: number }> {
  const row = await store.session(sessionId);
  // Same message for "missing" and "not yours", so ids can't be probed.
  if (!row || (callerId !== row.helper_id && callerId !== row.asker_id)) throw new RewardsError("You are not in this session");
  if (row.status !== "completed") throw new RewardsError("This session is not completed yet");

  const history = (await store.completedBetween(row.helper_id, row.asker_id)).map(toCompleted);
  const session = history.find((s) => s.id === row.id);
  const breakdown = sessionTickets(history).find((b) => b.sessionId === row.id);
  if (!session || !breakdown) throw new RewardsError("This session is missing from its pair history");

  await store.upsertAwards([toAward(breakdown, session)]);
  return { tickets: breakdown.tickets };
}

/** Rebuilds every award in the KST week containing `weekStart`. Admins only. Idempotent. Returns sessions awarded. */
export async function recomputeWeek(store: RewardsStore, callerId: string, weekStart: Date): Promise<number> {
  if (!(weekStart instanceof Date) || Number.isNaN(weekStart.getTime())) throw new RewardsError("Pick a valid week");
  if (!(await store.isAdmin(callerId))) throw new RewardsError("Admins only");

  const start = weekStartKST(weekStart);
  // Capture cleanup candidates before reading completions. Later awards belong to their writers.
  const existingAwardIds = await store.weekAwardIds(kstDate(start));
  const history = (await store.completedBefore(new Date(start.getTime() + 7 * DAY_MS))).map(toCompleted);
  const byId = new Map(history.map((s) => [s.id, s]));
  const rows = sessionTickets(history)
    .filter((b) => weekStartKST(byId.get(b.sessionId)!.completedAt).getTime() === start.getTime())
    .map((b) => toAward(b, byId.get(b.sessionId)!));

  await store.upsertAwards(rows);
  // ticket_awards is a cache: drop awards for sessions no longer completed (e.g. disputed).
  const keep = new Set(rows.map((r) => r.session_id));
  const stale = existingAwardIds.filter((id) => !keep.has(id));
  if (stale.length) await store.deleteAwards(stale);
  return rows.length;
}
