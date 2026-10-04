import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimDevice, forgetOwner, getAuthState } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  AUTH_STORAGE_KEY: "rayon-auth",
  supabase: { auth: { getSession: vi.fn() } },
}));

const getSession = vi.mocked(supabase.auth.getSession);
const ALICE = "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";
const BOB = "0b9f8e7d-6c5b-4a39-8281-7f6e5d4c3b2a";
const session = (id: string) =>
  ({ data: { session: { user: { id, email: `${id}@test` } } }, error: null }) as never;

describe("getAuthState (OFF-08, CPT-07)", () => {
  beforeEach(() => {
    localStorage.clear();
    forgetOwner();
  });

  it("returns nothing on a device never signed in", async () => {
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    expect(await getAuthState()).toBeNull();
  });

  it("keeps local use when the session is refused online, and asks to reconnect", async () => {
    claimDevice({ userId: ALICE, email: `${ALICE}@test` });
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    expect(await getAuthState()).toEqual({
      userId: ALICE,
      email: `${ALICE}@test`,
      sessionLost: true,
    });
  });

  it("does not ask to reconnect after a voluntary sign-out", async () => {
    claimDevice({ userId: ALICE, email: `${ALICE}@test` });
    forgetOwner();
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    expect(await getAuthState()).toBeNull();
  });

  it("flags another account signing in on the device (CPT-07)", () => {
    expect(claimDevice({ userId: ALICE, email: null })).toBe(false);
    expect(claimDevice({ userId: ALICE, email: null })).toBe(false);
    expect(claimDevice({ userId: BOB, email: null })).toBe(true);
    expect(claimDevice({ userId: BOB, email: null })).toBe(false);
  });

  it("does not record the account when reading the session", async () => {
    getSession.mockResolvedValueOnce(session(ALICE));
    expect(await getAuthState()).toEqual({ userId: ALICE, email: `${ALICE}@test` });
    expect(claimDevice({ userId: BOB, email: null })).toBe(false);
  });
});
