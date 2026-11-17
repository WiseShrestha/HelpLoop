import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveOnboarding } from "./onboarding";

const mocks = vi.hoisted(() => ({ create: vi.fn(), user: vi.fn(), from: vi.fn(), insert: vi.fn(), update: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
let profile: { id: string; consent: boolean } | null;
let identity: { user_id: string } | null;
const failure = { code: "23505" };

function form(overrides: Record<string, string> = {}) {
  const result = new FormData();
  Object.entries({ display_name: " Mina ", entry_year: "2026", department: "", bio: "Physics!", real_name: "Mina",
    student_no: "20261234", kaist_email: "Mina@KAIST.AC.KR", integrity: "on", consent: "on", ...overrides })
    .forEach(([key, value]) => result.set(key, value));
  result.append("help_courses", "calc1");
  return result;
}
beforeEach(() => {
  vi.clearAllMocks(); profile = null; identity = null;
  mocks.user.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.insert.mockResolvedValue({ error: null }); mocks.update.mockResolvedValue({ error: null });
  mocks.read.mockImplementation((table: string) => ({ data: table === "profiles" ? profile : identity, error: null }));
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({ eq: () => table === "courses" ? Promise.resolve({ data: [{ code: "calc1" }], error: null })
      : { maybeSingle: () => mocks.read(table) } }),
    insert: (values: unknown) => mocks.insert(table, values),
    update: (values: unknown) => ({ eq: (column: string, id: string) => mocks.update(table, values, column, id) }),
  }));
  mocks.create.mockResolvedValue({ auth: { getUser: mocks.user }, from: mocks.from });
});

describe("onboarding boundaries", () => {
  it.each([ ["student_no", "123"], ["entry_year", "2031"], ["kaist_email", "a@example.org"],
    ["display_name", " "], ["consent", ""], ["integrity", ""] ])("rejects invalid %s before any writes", async (field, value) => {
    expect(await saveOnboarding({}, form({ [field]: value }))).toEqual({ error: "invalid", field });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("refuses a signed-out or expired session", async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: null });
    expect(await saveOnboarding({}, form())).toEqual({ error: "session" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects unknown or inactive offering codes", async () => {
    const data = form(); data.append("help_courses", "not-active");
    expect(await saveOnboarding({}, data)).toEqual({ error: "invalid", field: "help_courses" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("whitelists public/private fields and derives identity from the session", async () => {
    const data = form({ id: "victim", is_admin: "true", public_record: "true" }); data.append("help_courses", "calc1");
    await expect(saveOnboarding({}, data)).rejects.toThrow("REDIRECT:/");
    expect(mocks.insert).toHaveBeenNthCalledWith(1, "profiles", { id: "owner", display_name: "Mina", entry_year: 2026,
      department: "undeclared", bio: "Physics!", help_courses: ["calc1"], consent: true });
    expect(mocks.insert).toHaveBeenNthCalledWith(2, "private_profiles", { user_id: "owner", real_name: "Mina",
      student_no: "20261234", kaist_email: "mina@kaist.ac.kr" });
  });
  it("reports a duplicate number and retries the partial profile without another starter insert", async () => {
    mocks.insert.mockImplementation(async (table: string) => ({ error: table === "private_profiles" ? failure : null }));
    expect(await saveOnboarding({}, form())).toEqual({ error: "duplicate", field: "student_no" });
    profile = { id: "owner", consent: true }; mocks.insert.mockResolvedValue({ error: null });
    mocks.insert.mockClear();
    await expect(saveOnboarding({}, form({ student_no: "20265678" }))).rejects.toThrow("REDIRECT:/");
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith("profiles", expect.anything(), "id", "owner");
  });
  it("does not rewrite a completed profile on repeated submission", async () => {
    profile = { id: "owner", consent: true }; identity = { user_id: "owner" };
    await expect(saveOnboarding({}, form())).rejects.toThrow("REDIRECT:/");
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("returns a safe retry message for database failures", async () => {
    mocks.insert.mockRejectedValue(new Error("sensitive database detail"));
    expect(await saveOnboarding({}, form())).toEqual({ error: "unavailable" });
  });
});
