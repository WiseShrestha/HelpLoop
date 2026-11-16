import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "./admin";

// Next enforces this boundary during compilation; unit tests exercise configuration.
vi.mock("server-only", () => ({}));
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: create }));
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

describe("server-only admin client", () => {
  it("uses the server credential without session storage or URL detection", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-key");
    const client = {};
    create.mockReturnValue(client);

    expect(createAdminClient()).toBe(client);
    expect(create).toHaveBeenCalledWith("https://example.supabase.co", "test-server-key", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });

  it("refuses to fall back to a public key when the server key is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => createAdminClient()).toThrow("Supabase admin environment variables are missing.");
    expect(create).not.toHaveBeenCalled();
  });

  it("requires the project URL and does not include credentials in the error", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-key");
    expect(() => createAdminClient()).toThrow(/^Supabase admin environment variables are missing\.$/);
    expect(create).not.toHaveBeenCalled();
  });
});
