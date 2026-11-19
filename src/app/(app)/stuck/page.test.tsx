import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/env", () => ({ getSupabaseEnv: () => ({ url: "u", key: "k" }) }));
const { default: StuckPage } = await import("./page");
const { stuckWeeks } = await import("./weeks");

function fakeDb(tables: Record<string, unknown[]>) {
  const from = (table: string) => {
    const result = Promise.resolve({ data: tables[table] ?? [], error: null });
    const chain: Record<string, unknown> = { then: result.then.bind(result) };
    for (const m of ["select", "eq", "order"]) chain[m] = () => chain;
    return chain;
  };
  mocks.client.mockResolvedValue({ from }); // no sign-in needed
}
const html = async () => renderToString(await StuckPage()).replace(/<!-- -->/g, "");
afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });

describe("/stuck", () => {
  it("uses KST Monday weeks", () => {
    expect(stuckWeeks(new Date("2026-11-22T14:59:00Z"))).toEqual({ current: "2026-11-16", previous: "2026-11-09" });
    expect(stuckWeeks(new Date("2026-11-22T15:00:00Z"))).toEqual({ current: "2026-11-23", previous: "2026-11-16" });
  });

  it("shows this week's topics for the first course with data, busiest first, with last week beside them", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }).setSystemTime(new Date("2026-11-19T03:00:00Z"));
    fakeDb({
      courses: [{ code: "bio1", name_ko: "일반생물학", name_en: "General Biology" }, { code: "calc1", name_ko: "미적분학 I", name_en: "Calculus I" }],
      course_topics: [{ course_code: "calc1", tag: "limits", label_ko: "극한", label_en: "Limits and continuity" },
        { course_code: "calc1", tag: "taylor-series", label_ko: "테일러 급수", label_en: "Taylor series" }],
      stuck_map: [
        { course_code: "calc1", topic_tag: "limits", week_start: "2026-11-16", requests: 3 },
        { course_code: "calc1", topic_tag: "taylor-series", week_start: "2026-11-16", requests: 9 },
        { course_code: "calc1", topic_tag: "taylor-series", week_start: "2026-11-09", requests: 5 },
        { course_code: "calc1", topic_tag: "limits", week_start: "2026-10-12", requests: 4 }, // too old to show
      ],
    });
    const page = await html();
    expect(page).toContain('<option value="calc1" selected="">Calculus I</option>');
    expect(page.indexOf("Taylor series")).toBeLessThan(page.indexOf("Limits and continuity"));
    expect(page).toContain("<strong>9</strong> this week · 5 last week");
    expect(page).toContain("<strong>3</strong> this week · 0 last week");
  });

  it("explains the suppression rule and shows an empty state", async () => {
    fakeDb({ courses: [{ code: "calc1", name_ko: "미적분학 I", name_en: "Calculus I" }] });
    const page = await html();
    expect(page).toContain("No topic in this course has enough requests to show yet.");
    expect(page).toContain("at least 3 requests from at least 3 different students");
  });
});
