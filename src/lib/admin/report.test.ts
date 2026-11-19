import { describe, expect, it } from "vitest";
import { markdownReport, weeklyRows } from "./report";

const s = (helper: string, asker: string, completedAt: string | null, status = "completed") =>
  ({ helper_id: helper, asker_id: asker, status, rating: 5, completed_at: completedAt });

describe("presentation report", () => {
  const sessions = [
    s("a", "b", "2026-11-16T01:00:00Z"), s("b", "a", "2026-11-17T01:00:00Z"), // same pair: one new pair
    s("a", "c", "2026-11-22T14:59:00Z"), // Sun 23:59 KST: still week of 16 Nov
    s("a", "b", "2026-11-22T15:00:00Z"), // Mon 00:00 KST: next week, not a new pair
    s("c", "d", null, "scheduled"),
  ];

  it("groups completed sessions by KST week and counts first meetings once", () => {
    expect(weeklyRows(sessions)).toEqual([
      { week: "2026-11-16", sessions: 3, newPairs: 2, helpers: 2, askers: 3 },
      { week: "2026-11-23", sessions: 1, newPairs: 0, helpers: 1, askers: 1 },
    ]);
  });

  it("renders headline metrics and the weekly table as Markdown", () => {
    const { markdown, metrics } = markdownReport({ profiles: [], onboarded: 0, sessions, awards: [], ledger: [], requests: [] },
      new Date("2026-11-22T14:00:00Z"));
    expect(metrics.find((m) => m.key === "sessions_completed")?.value).toBe(4);
    expect(markdown).toContain("| Sessions completed | 4 |");
    expect(markdown).toContain("| 2026-11-16 | 3 | 2 | 2 | 3 |");
    expect(markdown).toContain("Generated 2026-11-22T14:00:00.000Z");
  });
});
