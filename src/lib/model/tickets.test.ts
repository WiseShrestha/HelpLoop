import { describe, it, expect } from "vitest";
import { sessionTickets, weeklyTickets, weekStartKST, type CompletedSession } from "./tickets.ts";

// Week of Mon 16 Nov 2026 (KST). Times written in UTC; KST = UTC+9.
const at = (iso: string) => new Date(iso);
let n = 0;
const s = (helperId: string, askerId: string, minutes: number, rating: 1 | 2 | 3 | 4 | 5, iso: string): CompletedSession => ({
  id: `s${String(++n).padStart(3, "0")}`,
  helperId,
  askerId,
  minutes,
  rating,
  completedAt: at(iso),
});

describe("weekStartKST", () => {
  it("returns Monday 00:00 KST", () => {
    expect(weekStartKST(at("2026-11-18T05:00:00Z")).toISOString()).toBe("2026-11-15T15:00:00.000Z");
  });
  it("treats Sunday 23:59 KST as the same week and Monday 00:00 KST as the next", () => {
    expect(weekStartKST(at("2026-11-22T14:59:00Z")).toISOString()).toBe("2026-11-15T15:00:00.000Z");
    expect(weekStartKST(at("2026-11-22T15:00:00Z")).toISOString()).toBe("2026-11-22T15:00:00.000Z");
  });
});

describe("sessionTickets", () => {
  it("applies the new-pair bonus, same-week decay and rating factor", () => {
    const history = [
      s("A", "B", 30, 5, "2026-11-17T03:00:00Z"), // first ever pair: 1 × 1.5
      s("B", "A", 60, 4, "2026-11-18T03:00:00Z"), // same pair, reversed roles, 2nd this week: 2 × 1
      s("A", "B", 30, 5, "2026-11-19T03:00:00Z"), // 3rd this week: 1 × 0.5
      s("A", "B", 60, 5, "2026-11-20T03:00:00Z"), // 4th this week: 0
      s("A", "B", 30, 5, "2026-11-24T03:00:00Z"), // next week, not a new pair: 1
      s("A", "C", 60, 3, "2026-11-17T04:00:00Z"), // new pair, rating 3: 2 × 1.5 × 0.75
      s("A", "D", 30, 1, "2026-11-17T05:00:00Z"), // rating 1 earns nothing
    ];
    const byId = Object.fromEntries(sessionTickets(history).map((b) => [b.sessionId, b.tickets]));
    expect(history.map((h) => byId[h.id])).toEqual([1.5, 2, 0.5, 0, 1, 2.25, 0]);
  });
});

describe("weeklyTickets", () => {
  it("sums per helper within the week and caps at 10", () => {
    const history = [
      s("A", "B", 30, 5, "2026-11-17T03:00:00Z"),
      s("B", "A", 60, 4, "2026-11-18T03:00:00Z"),
      ...["P", "Q", "R", "S"].map((x, i) => s("H", x, 120, 5, `2026-11-1${7 + i}T03:00:00Z`)), // 4 × 6 = 24
      s("A", "B", 30, 5, "2026-11-24T03:00:00Z"), // next week, excluded
    ];
    const totals = weeklyTickets(history, at("2026-11-19T00:00:00Z"));
    expect(totals.get("A")).toBe(1.5);
    expect(totals.get("B")).toBe(2);
    expect(totals.get("H")).toBe(10);
  });
});
