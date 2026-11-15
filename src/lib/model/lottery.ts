// Weekly lottery, provably fair by commit–reveal:
//  1. Monday: the admin picks a secret seed and publishes commitHash(seed) in the app.
//  2. Sunday: the admin reveals the seed. Anyone can check verifyCommit(seed, hash)
//     and rerun drawWinners(seed, entries, n) to get the same winners.
// Server-only (uses node:crypto).

import { createHash } from "node:crypto";

export type LotteryEntry = { userId: string; tickets: number };

export function commitHash(seed: string): string {
  return createHash("sha256").update(seed, "utf8").digest("hex");
}

export function verifyCommit(seed: string, hash: string): boolean {
  return commitHash(seed) === hash.toLowerCase();
}

/** Deterministic random integer in [0, n) for draw round `round`. */
function roll(seed: string, round: number, n: number): number {
  const h = createHash("sha256").update(`${seed}:${round}`, "utf8").digest();
  // 48 random bits; modulo bias is below 1e-9 for any realistic ticket total.
  return h.readUIntBE(0, 6) % n;
}

/**
 * Pick up to `prizeCount` distinct winners, each round weighted by tickets
 * (in hundredths, so 1.5 tickets = 150 units). A winner leaves the pool.
 */
export function drawWinners(seed: string, entries: LotteryEntry[], prizeCount: number): string[] {
  const pool = entries
    .map((e) => ({ userId: e.userId, units: Math.round(e.tickets * 100) }))
    .filter((e) => e.units > 0)
    .sort((a, b) => a.userId.localeCompare(b.userId));
  const winners: string[] = [];

  for (let round = 0; round < prizeCount && pool.length > 0; round++) {
    const total = pool.reduce((s, e) => s + e.units, 0);
    let r = roll(seed, round, total);
    let i = 0;
    while (r >= pool[i].units) {
      r -= pool[i].units;
      i++;
    }
    winners.push(pool[i].userId);
    pool.splice(i, 1);
  }
  return winners;
}
