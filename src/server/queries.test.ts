import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ client: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
import { getHelpFeed, getSuggestedHelpers, getWallet } from "./queries";

type Fixture = Record<string, unknown[]>;
function fixture(rows: Fixture, user: string | null = "me") {
  const calls: unknown[][] = [];
  function query(table: string) {
    const raw = rows[table]?.shift();
    const result = { data: raw ?? null, error: null };
    const resolve = Promise.resolve(result);
    const chain: Record<string, unknown> = { then: resolve.then.bind(resolve) };
    for (const method of ["select", "eq", "neq", "or", "gt", "gte", "range", "order", "in", "contains", "single", "maybeSingle"]) {
      chain[method] = (...args: unknown[]) => { calls.push([table, method, ...args]); return chain; };
    }
    return chain;
  }
  const db = { auth: { getUser: async () => ({ data: { user: user && { id: user } } }) }, from: query, rpc: query };
  mocks.client.mockResolvedValue(db);
  mocks.admin.mockReturnValue(db);
  return calls;
}
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

describe("current student's queries", () => {
  it("uses the Korean Monday and returns the published capped total independently of raw awards", async () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-11-22T15:00:00Z"));
    const award = { sessionId: "session", helperId: "me", base: 1, newPair: true, pairFactor: 1, ratingFactor: 1, tickets: 1.5 };
    const calls = fixture({ my_balance: [90], ledger: [[{ delta: 30, reason: "session_earned", created_at: "today", session_id: "session" }]],
      week_tickets: [{ tickets: 12 }], ticket_awards: [[{ breakdown: award }]], draws: [{ week_start: "2026-11-23", commit_hash: "hash", prizes: [{ label: "Coffee" }] }] });
    const wallet = await getWallet();
    expect(wallet).toMatchObject({ balance: 90, weekTickets: 12, entries: [{ sessionId: "session" }], breakdown: [award], draw: { commitHash: "hash", prizes: [{ label: "Coffee" }] } });
    for (const table of ["week_tickets", "ticket_awards", "draws"]) expect(calls).toContainEqual([table,"eq","week_start","2026-11-23"]);
    expect(calls).toContainEqual(["ledger","eq","user_id","me"]);
    expect(calls).toContainEqual(["ticket_awards","eq","helper_id","me"]);
  });
  it("handles an empty wallet week and refuses guests", async () => {
    fixture({ my_balance: [60], ledger: [[]], ticket_awards: [[]] });
    expect(await getWallet()).toEqual({ balance: 60, entries: [], weekTickets: 0, breakdown: [], draw: null });
    fixture({}, null);
    await expect(getWallet()).rejects.toThrow(/Sign in/);
    expect(await getHelpFeed()).toBeNull();
    expect(await getSuggestedHelpers("request")).toEqual([]);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("ranks an anonymous returning partner without exposing their identity", async () => {
    const row = { id: "r", asker_id: null, course_code: "calc", minutes: 30, topic: "Limits", is_anonymous: true,
      deadline: "2099-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" };
    fixture({ profiles: [{ help_courses: ["calc"] }], request_board: [[row]], sessions: [[{ asker_id: "private-id", helper_id: "me" }]],
      courses: [[{ code: "calc", kind: "course" }]], requests: [[{ id: "r", asker_id: "private-id" }]] });
    const cards = await getHelpFeed();
    expect(cards).toMatchObject([{ id: "r", newConnection: false, name: null }]);
    expect(JSON.stringify(cards)).not.toContain("private-id");
  });
  it("checks owner access before ranking matching helpers", async () => {
    const calls = fixture({ requests: [null] });
    expect(await getSuggestedHelpers("other")).toEqual([]);
    expect(calls).toContainEqual(["requests","eq","asker_id","me"]);
    expect(mocks.admin).not.toHaveBeenCalled();
    fixture({ requests: [{ course_code: "calc" }], profiles: [[{ id: "a", display_name: "A", help_courses: ["calc"] },
      { id: "b", display_name: "B", help_courses: ["calc"] }]], helper_stats: [[]],
      sessions: [[{ asker_id: "me", helper_id: "a" }], []] });
    expect((await getSuggestedHelpers("mine")).map(person => person.name)).toEqual(["B","A"]);
  });
});
