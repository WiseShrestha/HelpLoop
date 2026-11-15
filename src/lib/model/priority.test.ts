import { describe, it, expect } from "vitest";
import { rankRequestsForHelper, suggestHelpers, type OpenRequest, type Helper } from "./priority.ts";

const now = new Date("2026-11-18T03:00:00Z");
const h = (hours: number) => new Date(now.getTime() + hours * 3600_000);
const req = (id: string, askerId: string, courseCode: string, postedHoursAgo: number, dueInHours: number): OpenRequest => ({
  id,
  askerId,
  courseCode,
  minutes: 30,
  createdAt: h(-postedHoursAgo),
  deadline: h(dueInHours),
});

describe("rankRequestsForHelper", () => {
  const helper = { id: "me", courses: ["calc1", "phys1"] };
  const requests = [
    req("r1", "met", "calc1", 0, 24), // urgency 0.5, waiting 0, newPair 0 → 0.5
    req("r2", "new", "calc1", 12, 24), // 0.5 + 0.25 + 0.5 → 1.25
    req("r3", "new2", "phys1", 0, 0.5), // ≈0.98 + 0 + 0.5 → ≈1.48
    req("r4", "new3", "chem1", 0, 1), // not my course
    req("r5", "me", "calc1", 0, 1), // my own
    req("r6", "new4", "calc1", 30, -1), // past deadline
  ];

  it("filters and orders by urgency + waiting + new-pair bonus", () => {
    const ranked = rankRequestsForHelper(helper, requests, new Set(["met"]), now);
    expect(ranked.map((r) => r.request.id)).toEqual(["r3", "r2", "r1"]);
    expect(ranked[1].score).toBeCloseTo(1.25, 6);
    expect(ranked[2].score).toBeCloseTo(0.5, 6);
  });
});

describe("suggestHelpers", () => {
  const helpers: Helper[] = [
    { id: "h1", courses: ["calc1"], avgRating: 5, sessionsThisWeek: 0 }, // 0.5 + 0.5 = 1.0
    { id: "h2", courses: ["calc1"], avgRating: 5, sessionsThisWeek: 6 }, // 0.5 + 0.5 − 0.6 = 0.4
    { id: "h3", courses: ["calc1"], avgRating: null, sessionsThisWeek: 0 }, // already met → 0
    { id: "h4", courses: ["phys1"], avgRating: 5, sessionsThisWeek: 0 }, // wrong course
    { id: "asker", courses: ["calc1"], avgRating: 5, sessionsThisWeek: 0 }, // is the asker
  ];

  it("prefers new, well-rated, less-loaded helpers", () => {
    const out = suggestHelpers({ askerId: "asker", courseCode: "calc1" }, helpers, new Set(["h3"]));
    expect(out.map((o) => o.helper.id)).toEqual(["h1", "h2", "h3"]);
    expect(out[1].score).toBeCloseTo(0.4, 6);
  });
});
