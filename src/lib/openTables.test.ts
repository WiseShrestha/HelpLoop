import { describe, expect, it } from "vitest";
import { kstInput, parseTableForm } from "./openTables";

const now = new Date("2026-11-19T03:00:00Z"); // 12:00 KST
const form = (o: Record<string, string> = {}) =>
  ({ place: " Library 2F ", course: "calc1", note: "", starts: "2026-11-19T12:00", ends: "2026-11-19T14:30", max: "6", ...o });

describe("parseTableForm", () => {
  it("reads times as KST and trims the place", () => {
    expect(parseTableForm(form(), now)).toEqual({ ok: true, value: { place: "Library 2F", course_code: "calc1", note: null,
      starts_at: "2026-11-19T03:00:00.000Z", ends_at: "2026-11-19T05:30:00.000Z", max_people: 6 } });
    expect(parseTableForm(form({ course: "" }), now)).toMatchObject({ ok: true, value: { course_code: null } });
  });

  it("refuses bad input before it reaches the database", () => {
    expect(parseTableForm(form({ place: " " }), now)).toEqual({ ok: false, error: "place" });
    expect(parseTableForm(form({ note: "x".repeat(121) }), now)).toEqual({ ok: false, error: "note" });
    expect(parseTableForm(form({ ends: "2026-11-19T11:00" }), now)).toEqual({ ok: false, error: "time" });
    expect(parseTableForm(form({ ends: "2026-11-19T18:01" }), now)).toEqual({ ok: false, error: "length" });
    expect(parseTableForm(form({ starts: "2026-11-19T09:00", ends: "2026-11-19T11:59" }), now)).toEqual({ ok: false, error: "past" });
    expect(parseTableForm(form({ max: "13" }), now)).toEqual({ ok: false, error: "max" });
    expect(parseTableForm(form({ starts: "tomorrow" }), now)).toEqual({ ok: false, error: "time" });
  });

  it("formats KST defaults for datetime-local inputs", () => {
    expect(kstInput(new Date("2026-11-19T15:30:00Z"))).toBe("2026-11-20T00:30");
  });
});
