import { z } from "zod";

// F4 Open Tables: form parsing shared by the server action and its tests.
// Times come from <input type="datetime-local">; students are in Korea, so they are read as KST.

const HOUR_MS = 3_600_000;
const kst = (value: string) => new Date(`${value}:00+09:00`);
const localTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

const schema = z.object({
  place: z.string().trim().min(1).max(60),
  course: z.string().trim().max(80).transform((v) => v || null),
  note: z.string().trim().max(120).transform((v) => v || null),
  starts: localTime,
  ends: localTime,
  max: z.coerce.number().int().min(2).max(12),
});

export type TableForm = { place: string; course_code: string | null; note: string | null; starts_at: string; ends_at: string; max_people: number };
export type TableFormError = "place" | "note" | "time" | "length" | "past" | "max";

export function parseTableForm(form: Record<string, unknown>, now = new Date()): { ok: true; value: TableForm } | { ok: false; error: TableFormError } {
  const parsed = schema.safeParse(form);
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0];
    return { ok: false, error: field === "place" ? "place" : field === "note" ? "note" : field === "max" ? "max" : "time" };
  }
  const v = parsed.data;
  const starts = kst(v.starts);
  const ends = kst(v.ends);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) return { ok: false, error: "time" };
  if (ends.getTime() - starts.getTime() > 6 * HOUR_MS) return { ok: false, error: "length" };
  if (ends <= now) return { ok: false, error: "past" };
  return { ok: true, value: { place: v.place, course_code: v.course, note: v.note, starts_at: starts.toISOString(), ends_at: ends.toISOString(), max_people: v.max } };
}

/** "YYYY-MM-DDTHH:mm" in KST, for datetime-local defaults. */
export function kstInput(d: Date): string {
  return new Date(d.getTime() + 9 * HOUR_MS).toISOString().slice(0, 16);
}
