import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ data: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./actions", () => ({ createDrawAction: vi.fn(), runDrawAction: vi.fn(), disputeAction: vi.fn(), resolveReportAction: vi.fn() }));
vi.mock("@/server/adminData", async () => {
  const real = await vi.importActual<typeof import("@/server/adminData")>("@/server/adminData");
  return { adminWeek: real.adminWeek, requireAdmin: async () => ({ db: {}, userId: "admin" }), loadAdminData: mocks.data };
});
const { default: AdminPage } = await import("./page");

const base = { draw: null, pool: [], weekOver: false, weekSessions: 0, flagged: [], verification: [], reports: [],
  metrics: [{ key: "signups", label: "Sign-ups", value: 3 }] };
const render = async (data: object, params: object = {}) =>
  renderToString(await AdminPage({ searchParams: Promise.resolve({ week: "2026-11-16", ...params }) })).replace(/<!-- -->/g, "");
afterEach(() => vi.resetAllMocks());

describe("admin page", () => {
  it("offers to publish a draw when the week has none", async () => {
    mocks.data.mockResolvedValue(base);
    const html = await render(base);
    expect(html).toContain("Publish draw");
    expect(html).toContain("Week of 2026-11-16");
    expect(html).toContain("Sign-ups");
  });

  it("shows winners, the seed and flagged sessions after the draw", async () => {
    mocks.data.mockResolvedValue({ ...base, weekOver: true,
      draw: { week_start: "2026-11-16", commit_hash: "abc", prizes: ["Voucher"], seed: "the-seed", winners: [], drawn_at: "2026-11-23T00:00:00Z" },
      verification: [{ user_id: "a", display_name: "Ana", prize: "Voucher", realName: "Ana Kim", studentNo: "20240001", partners: [{ name: "Ben", realName: "Ben Lee" }] }],
      flagged: [{ id: "s", helper: "Ana", asker: "Ben", minutes: 60, rating: 5, status: "completed", completedAt: "2026-11-18T05:00:00Z",
        covered: "limits", tickets: 3, flags: ["closed_pair"] }] });
    const html = await render({}, { msg: "Draw complete." });
    expect(html).toContain("the-seed");
    expect(html).toContain("Ana Kim · 20240001");
    expect(html).toContain("Ben (Ben Lee)");
    expect(html).toContain("Pair only ever studies with each other");
    expect(html).not.toContain("Dispute"); // the ticket table is final once drawn
    expect(html).toContain("Draw complete.");
  });
});
