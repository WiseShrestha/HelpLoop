import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/env", () => ({ getSupabaseEnv: () => ({ url: "u", key: "k" }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
const { adminWeek, loadAdminData, requireAdmin } = await import("./adminData");

// A thenable query builder that ignores filters and returns the table's rows.
function fakeDb(tables: Record<string, unknown>, user: string | null = "admin") {
  const from = (table: string) => {
    const result = Promise.resolve({ data: tables[table] ?? null, error: null });
    const chain: Record<string, unknown> = { then: result.then.bind(result) };
    for (const m of ["select", "eq", "is", "order", "range", "maybeSingle"]) chain[m] = () => chain;
    return chain;
  };
  return { auth: { getUser: async () => ({ data: { user: user && { id: user } } }) }, from };
}
afterEach(() => vi.resetAllMocks());

describe("admin access", () => {
  it("is a 404 for signed-out students and non-admins", async () => {
    mocks.client.mockResolvedValue(fakeDb({ profiles: { is_admin: false } }));
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
    mocks.client.mockResolvedValue(fakeDb({}, null));
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
    mocks.client.mockResolvedValue(fakeDb({ profiles: { is_admin: true } }));
    await expect(requireAdmin()).resolves.toMatchObject({ userId: "admin" });
  });

  it("reads any day as its KST week and falls back to this week", () => {
    expect(adminWeek("2026-11-22").key).toBe("2026-11-16"); // Sunday → that Monday
    expect(adminWeek("2026-11-23").key).toBe("2026-11-23");
    expect(adminWeek("nonsense", new Date("2026-11-18T03:00:00Z")).key).toBe("2026-11-16");
  });
});

describe("loadAdminData", () => {
  const at = (iso: string) => ({ scheduled_at: iso, created_at: "2026-11-17T00:00:00Z", completed_at: iso });
  const tables = {
    draws: { week_start: "2026-11-16", commit_hash: "h", prizes: [{ label: "Voucher" }], seed: "s", drawn_at: "2026-11-23T00:00:00Z",
      winners: [{ user_id: "a", display_name: "Ana", prize: "Voucher" }] },
    week_tickets: [{ user_id: "a", display_name: "Ana", tickets: 4.5 }],
    profiles: [
      { id: "a", display_name: "Ana", entry_year: 2024, department: "EE", created_at: "2026-11-01T00:00:00Z" },
      { id: "b", display_name: "Ben", entry_year: 2026, department: "CS", created_at: "2026-11-17T00:00:00Z" },
      { id: "c", display_name: "Cho", entry_year: 2026, department: "CS", created_at: "2026-11-17T00:10:00Z" },
    ],
    private_profiles: [{ user_id: "a", real_name: "Ana Kim", student_no: "20240001" }, { user_id: "b", real_name: "Ben Lee", student_no: "20260002" }],
    sessions: [
      { id: "s1", helper_id: "a", asker_id: "b", status: "completed", minutes: 60, rating: 5, covered: "limits", ...at("2026-11-18T05:00:00Z") },
      { id: "s2", helper_id: "b", asker_id: "c", status: "completed", minutes: 30, rating: 5, covered: "x", ...at("2026-11-19T05:00:00Z") },
      { id: "s3", helper_id: "a", asker_id: "c", status: "completed", minutes: 30, rating: 4, covered: "y", ...at("2026-11-26T05:00:00Z") },
    ],
    ticket_awards: [{ session_id: "s1", tickets: 3, breakdown: { base: 2, newPair: true, pairFactor: 1, ratingFactor: 1 } }],
    ledger: [{ user_id: "a", delta: 60 }],
    requests: [],
    reports: [{ id: "r1", session_id: "s2", reporter_id: "c", reason: "Didn't show up", created_at: "2026-11-19T06:00:00Z" }],
  };

  it("assembles the week: pool, flags, winner checks, reports and metrics", async () => {
    const data = await loadAdminData(fakeDb(tables) as never, adminWeek("2026-11-16"));
    expect(data.draw?.prizes).toEqual(["Voucher"]);
    expect(data.pool).toEqual([{ name: "Ana", tickets: 4.5 }]);
    expect(data.weekSessions).toBe(2); // s3 is next week
    expect(data.flagged.map((s) => [s.id, s.flags])).toEqual([["s2", ["new_accounts"]]]); // Ben and Cho joined 10 min apart
    expect(data.verification).toEqual([{ user_id: "a", display_name: "Ana", prize: "Voucher", realName: "Ana Kim", studentNo: "20240001",
      partners: [{ name: "Ben", realName: "Ben Lee" }] }]); // only this week's partners
    expect(data.reports).toEqual([expect.objectContaining({ reporter: "Cho", session: "Ben → Cho · 30 min · completed" })]);
    expect(data.metrics.find((m) => m.key === "sessions_completed")?.value).toBe(3);
  });
});
