import { afterEach, describe, expect, it, vi } from "vitest";

describe("Supabase browser configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reste en mode local si les variables publiques Supabase sont absentes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.resetModules();

    const { getSupabaseBrowserClient, isSupabaseConfigured } = await import(
      "@/lib/supabase/client"
    );

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabaseBrowserClient()).toBeNull();
  });
});
