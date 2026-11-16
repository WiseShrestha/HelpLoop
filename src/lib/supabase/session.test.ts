import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), profile: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "student" } } });
  mocks.profile.mockResolvedValue({ data: { id: "student" }, error: null });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.profile });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.create.mockImplementation((_url, _key, { cookies }) => ({
    auth: { getUser: async () => {
      cookies.setAll([{ name: "session", value: "refreshed", options: { httpOnly: true, path: "/" } }]);
      return mocks.getUser();
    } },
    from: mocks.from,
  }));
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

describe("session routing", () => {
  it("runs without Supabase configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const response = await proxy(new NextRequest("https://preview.example/"));
    expect(response.status).toBe(200);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("lets signed-out visitors through without querying profiles", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await proxy(new NextRequest("https://preview.example/"));
    expect(response.status).toBe(200);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("preserves refreshed cookies and removes query strings on onboarding redirects", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: null });
    const request = new NextRequest("https://preview.example/?auth_error=1");
    const response = await proxy(request);
    expect(response.headers.get("location")).toBe("https://preview.example/onboarding");
    expect(response.cookies.get("session")?.value).toBe("refreshed");
    expect(response.cookies.get("session")?.httpOnly).toBe(true);
    expect(request.cookies.get("session")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.eq).toHaveBeenCalledWith("id", "student");
  });
  it("allows an existing profile and forwards refreshed cookies to server rendering", async () => {
    const response = await proxy(new NextRequest("https://preview.example/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-cookie")).toContain("session=refreshed");
  });
  it("does not loop on onboarding or interfere with the OAuth code exchange", async () => {
    await proxy(new NextRequest("https://preview.example/onboarding"));
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.create.mockClear();
    await proxy(new NextRequest("https://preview.example/auth/callback?code=test"));
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("distinguishes a database failure from a missing profile and keeps session cookies", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    const response = await proxy(new NextRequest("https://preview.example/"));
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("session")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
