import { beforeEach, expect, it, vi } from "vitest";
import { postRequest } from "./actions";

const mocks = vi.hoisted(() => ({ user: vi.fn(), insert: vi.fn(), result: vi.fn(), refresh: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.user },
    from: (table: string) => table === "courses"
      ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { code: "calc1" } }) }) }) }) }
      : { insert: (data: unknown) => { mocks.insert(data); return { select: () => ({ single: mocks.result }) }; } },
  }),
}));

function draft(overrides: Record<string, string> = {}) {
  const form = new FormData();
  Object.entries({ course_code: "calc1", topic_tag: "", topic: "Limits", details: "", minutes: "30",
    deadline: "2099-03-02T08:15", place: "Library, 2F", ...overrides }).forEach(([key, value]) => form.set(key, value));
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: "student" } } });
  mocks.result.mockResolvedValue({ data: { id: "posted" } });
});

it("uses session identity, strips privileged fields, and interprets the deadline in KST", async () => {
  const state = await postRequest({}, draft({ asker_id: "someone-else", status: "matched", is_anonymous: "on" }));
  expect(state.postedId).toBe("posted");
  expect(mocks.insert).toHaveBeenCalledWith({
    asker_id: "student", course_code: "calc1", topic_tag: null, topic: "Limits", details: null, minutes: 30,
    deadline: "2099-03-01T23:15:00.000Z", place: "Library, 2F", is_anonymous: true,
  });
  expect(mocks.refresh).toHaveBeenCalledWith("/ask");
});

it.each(["2020-01-01T12:00", "2099-02-30T12:00"])("refuses an invalid or past deadline (%s)", async (deadline) => {
  expect(await postRequest({}, draft({ deadline }))).toMatchObject({ error: "invalid", field: "deadline" });
  expect(mocks.insert).not.toHaveBeenCalled();
});

it("refuses posting after sign-in expires", async () => {
  mocks.user.mockResolvedValue({ data: { user: null } });
  expect(await postRequest({}, draft())).toMatchObject({ error: "session" });
  expect(mocks.insert).not.toHaveBeenCalled();
});

it("refreshes available credit when the database rejects a stale submission", async () => {
  mocks.result.mockResolvedValue({ error: { code: "23514", message: "Not enough available credit for this request" } });
  expect(await postRequest({ postedId: "previous" }, draft())).toMatchObject({ error: "credit", postedId: "previous" });
  expect(mocks.refresh).toHaveBeenCalledWith("/ask");
});
