import "server-only";

import type { Json } from "@/lib/db/types";
import { drawWinners, verifyCommit } from "@/lib/model/lottery";
import { weekStartKST } from "@/lib/model/tickets";
import { kstDate, recomputeWeek, RewardsError, type RewardsStore } from "./ticketAwards";

// Commit–reveal draw (SPEC §5.3). Not a "use server" module; callers pass an
// authenticated user id. src/server/draws.ts wires in the real stores.

export type DrawRow = {
  id: string; week_start: string; commit_hash: string; prizes: Json;
  seed: string | null; winners: Json | null; drawn_at: string | null;
};
export type SavedWinner = { user_id: string; display_name: string; prize: string };
export type Winner = { userId: string; displayName: string; prize: string };

export interface DrawStore {
  isAdmin(userId: string): Promise<boolean>;
  draw(weekStart: string): Promise<DrawRow | null>;
  insertDraw(row: { week_start: string; commit_hash: string; prizes: { label: string }[] }): Promise<void>;
  /** week_tickets rows for the week: capped tickets per student. */
  pool(weekStart: string): Promise<{ user_id: string; display_name: string; tickets: number }[]>;
  /** Saves seed and winners only if the draw has not run yet. Returns false if it had. */
  saveResult(id: string, seed: string, winners: SavedWinner[]): Promise<boolean>;
}

export class DrawError extends Error {}

const DAY_MS = 86_400_000;
const HASH = /^[0-9a-f]{64}$/;

function week(weekStart: Date): { start: Date; key: string } {
  if (!(weekStart instanceof Date) || Number.isNaN(weekStart.getTime())) throw new DrawError("Pick a valid week");
  const start = weekStartKST(weekStart);
  return { start, key: kstDate(start) };
}

async function requireAdmin(store: DrawStore, callerId: string) {
  if (!(await store.isAdmin(callerId))) throw new DrawError("Admins only");
}

export function prizeLabels(prizes: Json): string[] {
  if (!Array.isArray(prizes)) return [];
  return prizes.flatMap((p) => (p && typeof p === "object" && !Array.isArray(p) && typeof p.label === "string" ? [p.label] : []));
}

/** Publishes a week's commitment. The seed itself never reaches the server before the draw. */
export async function createDrawCore(store: DrawStore, callerId: string, weekStart: Date, commitHash: string,
  prizes: { label: string }[]): Promise<void> {
  const { key } = week(weekStart);
  await requireAdmin(store, callerId);
  const hash = commitHash.trim().toLowerCase();
  if (!HASH.test(hash)) throw new DrawError("The commit hash must be 64 hex characters (sha256)");
  const labels = prizes.map((p) => p.label.trim()).filter(Boolean);
  if (!labels.length || labels.length > 10 || labels.some((l) => l.length > 80)) {
    throw new DrawError("Give 1–10 prizes of up to 80 characters each");
  }
  if (await store.draw(key)) throw new DrawError("This week already has a draw");
  await store.insertDraw({ week_start: key, commit_hash: hash, prizes: labels.map((label) => ({ label })) });
}

/**
 * Reveals the seed and draws winners from the week's capped tickets.
 * Only after the KST week has ended, so the published ticket table is final and anyone can recompute it.
 */
export async function runDrawCore(store: DrawStore, rewards: RewardsStore, callerId: string, weekStart: Date,
  seed: string, now: Date = new Date()): Promise<Winner[]> {
  const { start, key } = week(weekStart);
  await requireAdmin(store, callerId);
  const draw = await store.draw(key);
  if (!draw) throw new DrawError("There is no draw for this week");
  if (draw.drawn_at) throw new DrawError("This draw has already been run");
  if (now.getTime() < start.getTime() + 7 * DAY_MS) throw new DrawError("Run the draw after the week ends (Monday 00:00 KST)");
  if (!seed || !verifyCommit(seed, draw.commit_hash)) throw new DrawError("That seed does not match the published hash");
  const prizes = prizeLabels(draw.prizes);
  if (!prizes.length) throw new DrawError("This draw has no prizes");

  try {
    await recomputeWeek(rewards, callerId, start); // a missed completeSessionRewards call never loses tickets
  } catch (e) {
    throw e instanceof RewardsError ? new DrawError(e.message) : e;
  }
  const pool = await store.pool(key);
  const ids = drawWinners(seed, pool.map((p) => ({ userId: p.user_id, tickets: Number(p.tickets) })), prizes.length);
  const saved = ids.map((id, i) => ({ user_id: id, display_name: pool.find((p) => p.user_id === id)?.display_name ?? "", prize: prizes[i] }));
  if (!(await store.saveResult(draw.id, seed, saved))) throw new DrawError("This draw has already been run");
  return saved.map((w) => ({ userId: w.user_id, displayName: w.display_name, prize: w.prize }));
}
