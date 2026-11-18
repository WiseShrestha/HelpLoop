import { describe, it, expect } from "vitest";
import { loopsClosedBy, loopAwards, loopKey, type Edge } from "./loops.ts";

let n = 0;
const e = (helperId: string, askerId: string, iso: string, rating: 1 | 2 | 3 | 4 | 5 = 5): Edge => ({
  sessionId: `s${++n}`,
  helperId,
  askerId,
  rating,
  completedAt: new Date(iso),
});

describe("loopsClosedBy", () => {
  it("finds a 3-person loop closed by the last session", () => {
    const ab = e("A", "B", "2026-11-18T03:00:00Z");
    const bc = e("B", "C", "2026-11-19T03:00:00Z");
    const ca = e("C", "A", "2026-11-20T03:00:00Z");
    const loops = loopsClosedBy(ca, [ab, bc]);
    expect(loops.length).toBe(1);
    expect(loops[0].members).toEqual(["C", "A", "B"]);
    expect(loops[0].key).toBe("A|B|C");
    expect(loops[0].sessionIds).toEqual([ca.sessionId, ab.sessionId, bc.sessionId]);
  });

  it("finds a 4-person loop but not a 6-person one", () => {
    const four = [e("A", "B", "2026-11-18T01:00:00Z"), e("B", "C", "2026-11-18T02:00:00Z"), e("C", "D", "2026-11-18T03:00:00Z")];
    expect(loopsClosedBy(e("D", "A", "2026-11-18T04:00:00Z"), four).map((l) => l.key)).toEqual(["A|B|C|D"]);
    const six = ["A", "B", "C", "D", "E", "F"];
    const chain = six.slice(0, 5).map((h, i) => e(h, six[i + 1], `2026-11-18T0${i + 1}:00:00Z`));
    expect(loopsClosedBy(e("F", "A", "2026-11-18T09:00:00Z"), chain)).toEqual([]);
  });

  it("ignores 2-person swaps, low ratings and edges older than 14 days", () => {
    expect(loopsClosedBy(e("B", "A", "2026-11-18T05:00:00Z"), [e("A", "B", "2026-11-18T04:00:00Z")])).toEqual([]);
    const lowRated = [e("A", "B", "2026-11-18T01:00:00Z", 3), e("B", "C", "2026-11-18T02:00:00Z")];
    expect(loopsClosedBy(e("C", "A", "2026-11-18T03:00:00Z"), lowRated)).toEqual([]);
    const old = [e("A", "B", "2026-11-01T01:00:00Z"), e("B", "C", "2026-11-18T02:00:00Z")];
    expect(loopsClosedBy(e("C", "A", "2026-11-18T03:00:00Z"), old)).toEqual([]);
    const closingLow = [e("A", "B", "2026-11-18T01:00:00Z"), e("B", "C", "2026-11-18T02:00:00Z")];
    expect(loopsClosedBy(e("C", "A", "2026-11-18T03:00:00Z", 2), closingLow)).toEqual([]);
  });

  it("ignores sessions completed after the closing one", () => {
    const later = [e("A", "B", "2026-11-18T01:00:00Z"), e("B", "C", "2026-11-19T02:00:00Z")];
    expect(loopsClosedBy(e("C", "A", "2026-11-18T03:00:00Z"), later)).toEqual([]);
  });
});

describe("loopAwards", () => {
  const loop = { key: loopKey(["A", "B", "C"]), members: ["C", "A", "B"], sessionIds: ["s1", "s2", "s3"] };

  it("gives each member 1 ticket", () => {
    expect(loopAwards([loop], new Set(), new Map())).toEqual([
      { key: "A|B|C", userId: "A", tickets: 1 },
      { key: "A|B|C", userId: "B", tickets: 1 },
      { key: "A|B|C", userId: "C", tickets: 1 },
    ]);
  });

  it("never rewards the same set of people twice", () => {
    expect(loopAwards([loop], new Set(["A|B|C"]), new Map())).toEqual([]);
  });

  it("caps loop bonuses at 2 per person per week", () => {
    const out = loopAwards([loop], new Set(), new Map([["B", 2]]));
    expect(out.map((a) => a.userId)).toEqual(["A", "C"]);
  });
});
