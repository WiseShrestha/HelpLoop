import { describe, it, expect } from "vitest";
import { commitHash, verifyCommit, drawWinners } from "./lottery.ts";

const entries = [
  { userId: "alice", tickets: 4 },
  { userId: "bob", tickets: 1.5 },
  { userId: "chan", tickets: 2.25 },
  { userId: "dana", tickets: 0 },
  { userId: "eun", tickets: 10 },
];
const seed = "kaist-ise-2026-week47";

describe("lottery", () => {
  it("commit–reveal: the published hash matches the seed", () => {
    const h = commitHash(seed);
    expect(h).toBe("b4a22593a9a5d28d9f9d3e532765d9f97885ec5fbce2409cbe7ea3c4f953b12f");
    expect(verifyCommit(seed, h)).toBe(true);
    expect(verifyCommit("other", h)).toBe(false);
  });

  it("is deterministic for a seed and never repeats a winner", () => {
    expect(drawWinners(seed, entries, 3)).toEqual(["alice", "chan", "bob"]);
    expect(drawWinners(seed, [...entries].reverse(), 3)).toEqual(["alice", "chan", "bob"]); // order of input doesn't matter
  });

  it("excludes zero tickets and stops when the pool is empty", () => {
    expect(drawWinners(seed, entries, 10)).toEqual(["alice", "chan", "bob", "eun"]);
    expect(drawWinners(seed, [], 3)).toEqual([]);
  });

  it("wins in proportion to tickets", () => {
    const wins: Record<string, number> = {};
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const w = drawWinners(`s${i}`, entries, 1)[0];
      wins[w] = (wins[w] ?? 0) + 1;
    }
    const total = 17.75;
    for (const e of entries.filter((x) => x.tickets > 0)) {
      expect(Math.abs(wins[e.userId] / N - e.tickets / total)).toBeLessThan(0.015);
    }
  });
});
