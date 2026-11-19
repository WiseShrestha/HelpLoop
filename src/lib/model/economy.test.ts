import { describe, expect, it } from "vitest";
import { ECONOMY_DEFAULTS, gini, random, simulate, sweep } from "./economy.ts";

const run = (starter: number, overdraft: number, seed = "helploop") => simulate({ ...ECONOMY_DEFAULTS, seed, starter, overdraft });

describe("economy simulator (SPEC §5.5)", () => {
  it("is deterministic for a seed", () => {
    expect(run(60, 30)).toEqual(run(60, 30));
    expect(random("x")()).toBe(random("x")());
    expect(run(60, 30, "another seed")).not.toEqual(run(60, 30));
  });

  it("never creates or destroys credit", () => {
    for (const r of sweep()) expect(r.totalCredit).toBe(ECONOMY_DEFAULTS.students * r.starter);
  });

  it("blocks everyone with no starter grant and no overdraft", () => {
    const r = run(0, 0);
    expect(r).toMatchObject({ requests: 0, fulfilled: 0, distinctPairs: 0, blockedShare: 1, needsMetShare: 0 });
    expect(r.attempts).toBeGreaterThan(0);
  });

  it("blocks fewer students as starting credit grows", () => {
    const rows = sweep();
    for (const overdraft of [0, 30, 60]) {
      const blocked = rows.filter((r) => r.overdraft === overdraft).map((r) => r.blockedShare);
      for (let i = 1; i < blocked.length; i++) expect(blocked[i]).toBeLessThanOrEqual(blocked[i - 1]);
    }
    expect(rows).toHaveLength(12);
  });

  it("reports sensible shares and pairs at the pilot setting", () => {
    const r = run(60, 30);
    expect(r.requests).toBeGreaterThan(0);
    expect(r.fulfilledShare).toBeGreaterThan(0);
    expect(r.fulfilledShare).toBeLessThanOrEqual(1);
    expect(r.distinctPairs).toBeLessThanOrEqual(r.fulfilled);
    expect(r.attempts).toBeGreaterThanOrEqual(r.requests);
    expect(r.needsMetShare).toBeLessThanOrEqual(r.fulfilledShare);
  });

  it("computes the Gini coefficient of balances", () => {
    expect(gini([10, 10, 10])).toBe(0);
    expect(gini([0, 0, 0, 100])).toBe(0.75);
    expect(gini([-30, -30, -30, 70])).toBe(0.75); // shifted so negatives work
  });
});
