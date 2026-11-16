import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ create: vi.fn(), exchange: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  mocks.create.mockResolvedValue({ auth: { exchangeCodeForSession: mocks.exchange } });
  mocks.exchange.mockResolvedValue({ error: null });
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

describe("OAuth callback", () => {
  it("exchanges the code and ignores external redirect destinations", async () => {
    const response = await GET(new NextRequest("https://preview.example/auth/callback?code=valid&next=https://evil.example"));
    expect(mocks.exchange).toHaveBeenCalledWith("valid");
    expect(response.headers.get("location")).toBe("https://preview.example/");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("returns a retryable sign-in error when the exchange fails", async () => {
    mocks.exchange.mockResolvedValue({ error: { message: "invalid code" } });
    const response = await GET(new NextRequest("https://preview.example/auth/callback?code=expired"));
    expect(response.headers.get("location")).toBe("https://preview.example/?auth_error=1");
  });
  it("does not initialize Supabase without a code or configuration", async () => {
    await GET(new NextRequest("https://preview.example/auth/callback?error=access_denied"));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await GET(new NextRequest("https://preview.example/auth/callback?code=valid"));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("auth_error=1");
  });
});
