import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { AccountNotFoundError, profileQueryOptions } from "@/features/auth/profile";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ supabase: { rpc: vi.fn() } }));

const USER_ID = "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";

function mockProfile(data: unknown) {
  vi.mocked(supabase.rpc).mockReturnValue({
    maybeSingle: async () => ({ data, error: null }),
  } as unknown as ReturnType<typeof supabase.rpc>);
}

describe("profileQueryOptions", () => {
  it("reads the account's own profile", async () => {
    mockProfile({ id: USER_ID, display_name: "Alice", role: "utilisateur" });
    const client = new QueryClient();
    await expect(client.fetchQuery(profileQueryOptions(USER_ID))).resolves.toMatchObject({
      display_name: "Alice",
    });
  });

  it("reports a session whose account no longer exists", async () => {
    mockProfile(null);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(client.fetchQuery(profileQueryOptions(USER_ID))).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );
  });
});
