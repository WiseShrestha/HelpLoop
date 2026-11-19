import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/env", () => ({ getSupabaseEnv: () => ({ url: "u", key: "k" }) }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));
const { default: DrawPage } = await import("./page");

function fakeDb(tables: Record<string, unknown[]>, user: string | null = "me") {
  const calls: string[][] = [];
  const from = (table: string) => {
    const result = Promise.resolve({ data: tables[table] ?? [], error: null });
    const chain: Record<string, unknown> = { then: result.then.bind(result) };
    for (const m of ["select", "order", "limit", "in"]) chain[m] = (...args: unknown[]) => { calls.push([table, m, String(args[0])]); return chain; };
    return chain;
  };
  mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: user && { id: user } } }) }, from });
  return calls;
}
const html = async () => renderToString(await DrawPage()).replace(/<!-- -->/g, "");
afterEach(() => vi.resetAllMocks());

describe("/draw", () => {
  it("sends signed-out visitors home", async () => {
    fakeDb({}, null);
    await expect(DrawPage()).rejects.toThrow("REDIRECT:/");
  });

  it("shows only the commitment before the reveal, then the seed, winners and ticket table", async () => {
    const calls = fakeDb({
      draws: [
        { week_start: "2026-11-23", commit_hash: "next-hash", prizes: [{ label: "Lunch" }], seed: "unrevealed-zq81", winners: null, drawn_at: null },
        { week_start: "2026-11-16", commit_hash: "old-hash", prizes: [{ label: "Voucher" }], seed: "revealed-seed",
          winners: [{ user_id: "a", display_name: "Ana", prize: "Voucher" }], drawn_at: "2026-11-23T00:10:00Z" },
      ],
      week_tickets: [{ week_start: "2026-11-16", display_name: "Ana", tickets: 10 }, { week_start: "2026-11-16", display_name: "Ben", tickets: 2.5 }],
    });
    const page = await html();
    expect(page).toContain("next-hash");
    expect(page).not.toContain("unrevealed-zq81"); // an unrevealed seed never reaches the browser
    expect(page).toContain("revealed-seed");
    expect(page).toContain("Voucher</span><strong>Ana");
    expect(page).toContain("Ben</span><span>2.5 tickets");
    expect(calls).toContainEqual(["week_tickets", "in", "week_start"]); // tickets only for drawn weeks
  });
});
