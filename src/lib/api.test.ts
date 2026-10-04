import { describe, expect, it, vi } from "vitest";
import { call } from "@/lib/api";
import { isAuthError } from "@/lib/network";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: vi.fn() } } }));

const getSession = vi.mocked(supabase.auth.getSession);

describe("call (OFF-08)", () => {
  it("does not send a write without session, and fails like a refused session", async () => {
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    const request = Promise.resolve({ data: null, error: null });
    const send = vi.spyOn(request, "then");
    const error = await call(request).catch((e: unknown) => e);
    expect(send).not.toHaveBeenCalled();
    expect(isAuthError(error)).toBe(true);
  });

  it("never sends another account's write under the signed-in session (CPT-07)", async () => {
    getSession.mockResolvedValueOnce({
      data: { session: { user: { id: "bob" } } },
      error: null,
    } as never);
    const request = Promise.resolve({ data: null, error: null });
    const send = vi.spyOn(request, "then");
    const error = await call(request, "alice").catch((e: unknown) => e);
    expect(send).not.toHaveBeenCalled();
    expect(error).toMatchObject({ code: "ACCOUNT_CHANGED" });
    expect(isAuthError(error)).toBe(false);
  });

  it("returns the data, or throws the server error", async () => {
    getSession.mockResolvedValue({ data: { session: {} }, error: null } as never);
    await expect(call(Promise.resolve({ data: 1, error: null }))).resolves.toBe(1);
    await expect(
      call(Promise.resolve({ data: null, error: { message: "non_membre" } })),
    ).rejects.toEqual({
      message: "non_membre",
    });
  });
});
