import { describe, it, expect } from "vitest";
import { balance, canAsk, moneySupply, settleSession, CREDIT_RULES, type LedgerEntry } from "./ledger.ts";

describe("ledger", () => {
  const starter = (userId: string): LedgerEntry => ({ userId, delta: CREDIT_RULES.starterMinutes, reason: "starter" });

  it("moves minutes from asker to helper and never changes the money supply", () => {
    const entries = [starter("A"), starter("B"), starter("C")];
    entries.push(...settleSession({ id: "s1", helperId: "A", askerId: "B", minutes: 45 }));
    entries.push(...settleSession({ id: "s2", helperId: "C", askerId: "A", minutes: 30 }));
    expect(balance("A", entries)).toBe(75);
    expect(balance("B", entries)).toBe(15);
    expect(balance("C", entries)).toBe(90);
    expect(moneySupply(entries)).toBe(180);
  });

  it("rejects self-help and bad minutes", () => {
    expect(() => settleSession({ id: "x", helperId: "A", askerId: "A", minutes: 30 })).toThrow();
    expect(() => settleSession({ id: "x", helperId: "A", askerId: "B", minutes: 0 })).toThrow();
  });

  it("allows asking down to −30 including open requests", () => {
    expect(canAsk(60, 0, 90)).toBe(true); // ends at −30
    expect(canAsk(60, 0, 120)).toBe(false); // would be −60
    expect(canAsk(60, 60, 30)).toBe(true); // 60 − 60 − 30 = −30
    expect(canAsk(60, 60, 45)).toBe(false);
  });
});
