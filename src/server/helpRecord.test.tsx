import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ viewer: vi.fn(), tables: {} as Record<string, unknown>, reads: [] as string[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.viewer() } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      let id = "";
      for (const m of ["select", "eq", "maybeSingle"]) chain[m] = (...args: unknown[]) => { if (m === "eq") id = String(args[1]); return chain; };
      chain.then = (resolve: (v: unknown) => unknown) => {
        mocks.reads.push(table);
        const rows = mocks.tables[table];
        const data = table === "profiles" ? (rows as Record<string, unknown>)[id] ?? null : rows;
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return chain;
    },
  }),
}));
const { loadHelpRecord } = await import("./helpRecord");
const { PublicProfileScreen } = await import("@/app/(app)/u/[id]/screen");

const OWNER = "11111111-1111-1111-1111-111111111111";
function setup(publicRecord: boolean, viewer: string | null, admin = false) {
  mocks.reads = [];
  mocks.viewer.mockReturnValue(viewer && { id: viewer });
  mocks.tables = {
    profiles: { ...(viewer ? { [viewer]: { is_admin: admin } } : {}),
      [OWNER]: { display_name: "Ana", entry_year: 2024, department: "EE", public_record: publicRecord, is_admin: viewer === OWNER && admin } },
    helper_stats: { sessions_helped: 3, people_helped: 2, minutes_helped: 90, avg_rating: 4.67 },
    helper_course_stats: [
      { course_code: "phys1", sessions: 1, people_helped: 1, minutes: 30, avg_rating: 4, first_at: "2026-11-17T03:00:00Z", last_at: "2026-11-17T03:00:00Z" },
      { course_code: "calc1", sessions: 2, people_helped: 2, minutes: 60, avg_rating: 5, first_at: "2026-11-16T03:00:00Z", last_at: "2026-11-19T03:00:00Z" },
    ],
    courses: [{ code: "calc1", name_en: "Calculus I", name_ko: "미적분학 I" }, { code: "phys1", name_en: "General Physics I", name_ko: "일반물리학 I" }],
  };
}
afterEach(() => vi.resetAllMocks());

describe("help record access (F7)", () => {
  it("is private to other students and signed-out visitors while the record is off, without reading any stats", async () => {
    setup(false, "22222222-2222-2222-2222-222222222222");
    expect(await loadHelpRecord(OWNER)).toEqual({ status: "private", own: false });
    setup(false, null);
    expect(await loadHelpRecord(OWNER)).toEqual({ status: "private", own: false });
    expect(mocks.reads).not.toContain("helper_course_stats");
    expect(mocks.reads).not.toContain("helper_stats");
  });

  it("is always visible to its owner and to admins", async () => {
    setup(false, OWNER);
    expect(await loadHelpRecord(OWNER)).toMatchObject({ status: "visible", own: true, public: false });
    setup(false, "33333333-3333-3333-3333-333333333333", true);
    expect(await loadHelpRecord(OWNER)).toMatchObject({ status: "visible", own: false });
  });

  it("is shareable signed out once turned on, with per-course rows and first and last dates", async () => {
    setup(true, null);
    const record = await loadHelpRecord(OWNER);
    expect(record).toMatchObject({ status: "visible", own: false, name: "Ana", totals: { sessions: 3, people: 2, minutes: 90, rating: 4.67 },
      first: "2026-11-16T03:00:00Z", last: "2026-11-19T03:00:00Z" });
    expect(record.status === "visible" && record.courses.map((c) => c.en)).toEqual(["Calculus I", "General Physics I"]);
  });

  it("reports a missing student", async () => {
    setup(true, null);
    expect(await loadHelpRecord("99999999-9999-9999-9999-999999999999")).toEqual({ status: "missing" });
  });
});

describe("public profile screen", () => {
  const profile = { id: OWNER, name: "Ana", year: 2024, department: "EE", bio: null, publicRecord: false, own: false,
    courses: [{ code: "calc1", en: "Calculus I", ko: "미적분학 I" }], stats: { sessions: 3, people: 2, minutes: 90, rating: 4.67 },
    partners: [{ year: 2026, department: "undeclared", people: 2 }], tablePeople: 4,
    loops: [{ key: "k", week: "2026-11-16", members: ["Ana", "Ben", "Cho"] }] };

  it("shows stats and partner counts to others, but not loops, the record toggle or a private record link", () => {
    const html = renderToString(<PublicProfileScreen profile={profile} />).replace(/<!-- -->/g, "");
    expect(html).toContain("2026 · Undeclared <strong>×2</strong>");
    expect(html).toContain("Studied with 4 people at Open Tables");
    expect(html).not.toContain("My loops");
    expect(html).not.toContain("Make my help record public");
    expect(html).not.toContain("/record");
  });

  it("shows the owner their loop diagrams and the record toggle", () => {
    const html = renderToString(<PublicProfileScreen profile={{ ...profile, own: true }} />).replace(/<!-- -->/g, "");
    expect(html).toContain("My loops");
    expect(html).toContain('aria-label="Ana → Ben → Cho → Ana"');
    expect(html).toContain("Make my help record public");
    expect(html).toContain(`/u/${OWNER}/record`);
  });
});
