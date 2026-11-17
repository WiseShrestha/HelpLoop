import { afterEach, describe, expect, it, vi } from "vitest";
import { weekStartKST } from "@/lib/model/tickets";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));

const { completeSessionRewards, recomputeWeekTickets } = await import("./rewards");
const { kstDate } = await import("./ticketAwards");
afterEach(() => vi.resetAllMocks());

describe("reward actions are public endpoints", () => {
  it("refuse signed-out callers before touching the service-role client", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(completeSessionRewards("aaaaaaaa-0000-0000-0000-000000000001")).rejects.toThrow("Sign in first");
    await expect(recomputeWeekTickets(new Date())).rejects.toThrow("Sign in first");
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("reject a malformed session id without a database call", async () => {
    await expect(completeSessionRewards("1 or 1=1")).rejects.toThrow("You are not in this session");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});

describe("kstDate", () => {
  it("names the KST Monday, not the UTC Sunday weekStartKST() falls on", () => {
    const monday = weekStartKST(new Date("2026-11-18T05:00:00Z"));
    expect(monday.toISOString().slice(0, 10)).toBe("2026-11-15"); // the trap
    expect(kstDate(monday)).toBe("2026-11-16");
    expect(kstDate(weekStartKST(new Date("2026-11-22T14:59:00Z")))).toBe("2026-11-16"); // Sun 23:59 KST
    expect(kstDate(weekStartKST(new Date("2026-11-22T15:00:00Z")))).toBe("2026-11-23"); // Mon 00:00 KST
  });
});
