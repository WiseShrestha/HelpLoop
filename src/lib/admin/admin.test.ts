import { describe, expect, it } from "vitest";
import { flagSessions, type FlagSession } from "./flags";
import { metricsCsv, pilotMetrics } from "./metrics";

const value = (metrics: ReturnType<typeof pilotMetrics>, key: string) => metrics.find((m) => m.key === key)?.value;
const award = (tickets: number, newPair: boolean, pairFactor: number) =>
  ({ tickets, breakdown: { base: 2, newPair, pairFactor, ratingFactor: 1 } });

describe("pilotMetrics (SPEC §9)", () => {
  const metrics = pilotMetrics({
    profiles: [
      { id: "a", entry_year: 2026, department: "EE" }, { id: "b", entry_year: 2023, department: "ee " },
      { id: "c", entry_year: 2026, department: "CS" }, { id: "d", entry_year: 2026, department: "undeclared" },
    ],
    onboarded: 3,
    sessions: [
      { helper_id: "a", asker_id: "b", status: "completed", rating: 5 },
      { helper_id: "b", asker_id: "a", status: "completed", rating: 4 }, // same pair, roles reversed
      { helper_id: "a", asker_id: "c", status: "completed", rating: 3 },
      { helper_id: "c", asker_id: "d", status: "disputed", rating: 5 },
      { helper_id: "d", asker_id: "a", status: "scheduled", rating: null },
    ],
    awards: [award(3, true, 1), award(2, false, 1), award(1, false, 0.5), award(0, false, 0)],
    ledger: [
      { user_id: "a", delta: 60 }, { user_id: "b", delta: 60 }, { user_id: "c", delta: 60 }, { user_id: "d", delta: 60 },
      { user_id: "a", delta: 60 }, { user_id: "c", delta: -60 }, { user_id: "d", delta: -90 },
    ],
    requests: [
      { asker_id: "c", status: "open", minutes: 30 }, { asker_id: "b", status: "completed", minutes: 60 },
      { asker_id: "d", status: "expired", minutes: 15 },
    ],
  });

  it("counts people, sessions and ratings", () => {
    expect(value(metrics, "signups")).toBe(4);
    expect(value(metrics, "onboarded")).toBe(3);
    expect(value(metrics, "sessions_completed")).toBe(3);
    expect(value(metrics, "sessions_disputed")).toBe(1);
    expect(value(metrics, "avg_rating")).toBe(4);
    expect(value(metrics, "requests_posted")).toBe(3);
    expect(value(metrics, "requests_expired")).toBe(1);
  });

  it("counts new connections across years and departments", () => {
    expect(value(metrics, "new_pairs")).toBe(2); // a–b (twice) and a–c
    expect(value(metrics, "cross_year_pct")).toBe(50); // a–b
    expect(value(metrics, "cross_dept_pct")).toBe(50); // a–c; "EE" and "ee " are the same department
  });

  it("measures reciprocity among active users", () => {
    expect(value(metrics, "active_users")).toBe(3);
    expect(value(metrics, "reciprocity_pct")).toBe(66.7); // a and b both gave and received; c only received
  });

  it("explains the ticket rules at work", () => {
    expect(value(metrics, "tickets_awarded")).toBe(6);
    expect(value(metrics, "new_pair_ticket_pct")).toBe(50);
    expect(value(metrics, "tickets_withheld")).toBe(3); // 2 × (1 − 0.5) + 2 × (1 − 0)
  });

  it("reports credit health", () => {
    // balances: a 120, b 60, c 0 (30 reserved), d -30
    expect(value(metrics, "blocked_pct")).toBe(50); // c and d cannot post a 15-minute request
    expect([value(metrics, "balance_min"), value(metrics, "balance_median"), value(metrics, "balance_max")]).toEqual([-30, 30, 120]);
    expect([value(metrics, "balance_negative"), value(metrics, "balance_0_59"), value(metrics, "balance_60_119"),
      value(metrics, "balance_120_plus")]).toEqual([1, 1, 1, 1]);
  });

  it("exports CSV with quoting", () => {
    expect(metricsCsv([{ key: "x", label: 'Say "hi", please', value: 3 }])).toBe('metric,value\n"Say ""hi"", please",3');
  });
});

describe("flagSessions", () => {
  const s = (id: string, helper: string, asker: string, extra: Partial<FlagSession> = {}): FlagSession => ({
    id, helper_id: helper, asker_id: asker, status: "completed", scheduled_at: "2026-11-18T05:00:00Z",
    created_at: "2026-11-18T04:00:00Z", completed_at: "2026-11-18T06:00:00Z", covered: null, ...extra,
  });
  const all = [
    s("1", "a", "b"), s("2", "b", "a", { covered: "Taylor  series" }), // a and b only meet each other
    s("3", "c", "d", { scheduled_at: "2026-11-18T01:00:00Z" }), // scheduled before acceptance
    s("4", "c", "e", { covered: "taylor series" }), s("5", "d", "e"),
  ];
  const profiles = [
    { id: "a", created_at: "2026-11-18T00:00:00Z" }, { id: "b", created_at: "2026-11-18T00:30:00Z" },
    { id: "c", created_at: "2026-11-01T00:00:00Z" }, { id: "d", created_at: "2026-11-10T00:00:00Z" },
    { id: "e", created_at: "2026-11-12T00:00:00Z" },
  ];
  const flags = flagSessions(all, all, profiles);

  it("flags closed pairs, accounts created together, backdated schedules and copied notes", () => {
    expect(flags.get("1")).toEqual(["closed_pair", "new_accounts"]);
    expect(flags.get("2")).toEqual(["closed_pair", "new_accounts", "copied_notes"]);
    expect(flags.get("3")).toEqual(["backdated"]);
    expect(flags.get("4")).toEqual(["copied_notes"]);
    expect(flags.has("5")).toBe(false);
  });
});
