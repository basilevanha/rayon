import { describe, expect, it } from "vitest";
import {
  type ArticleState,
  mergeDuplicate,
  needsRemovalConfirmation,
  remoteChangeAlert,
  resolveConcurrent,
} from "@/lib/conflicts";

const ME = "user-me";
const OTHER = "user-other";

const base: ArticleState = {
  id: "lait",
  status: "a_acheter",
  quantity: null,
  deletedAt: null,
  statusBy: OTHER,
  updatedBy: OTHER,
  updatedAt: "2026-10-03T10:00:00.000Z",
};

const state = (patch: Partial<ArticleState>): ArticleState => ({ ...base, ...patch });

describe("resolveConcurrent (COL-02)", () => {
  it("keeps the latest server timestamp", () => {
    const older = state({ updatedAt: "2026-10-03T10:00:00.000Z", quantity: 1 });
    const newer = state({ updatedAt: "2026-10-03T10:00:01.000Z", quantity: 2 });
    expect(resolveConcurrent(older, newer)).toBe(newer);
    expect(resolveConcurrent(newer, older)).toBe(newer);
  });

  it("compares instants, not strings", () => {
    const utc = state({ updatedAt: "2026-10-03T10:00:00.000Z" });
    const later = state({ updatedAt: "2026-10-03T11:30:00+01:00" });
    expect(resolveConcurrent(utc, later)).toBe(later);
  });

  it("breaks ties by author id, whatever the argument order", () => {
    const a = state({ updatedBy: "aaa" });
    const b = state({ updatedBy: "bbb" });
    expect(resolveConcurrent(a, b)).toBe(b);
    expect(resolveConcurrent(b, a)).toBe(b);
  });
});

describe("remoteChangeAlert (COL-03)", () => {
  const session = { me: ME, inSession: true };

  it("reports an article added by another member", () => {
    expect(remoteChangeAlert(state({ status: "catalogue" }), base, session)).toEqual({
      kind: "added",
      articleId: "lait",
      by: OTHER,
    });
  });

  it("reports an article created by another member", () => {
    expect(remoteChangeAlert(null, base, session)?.kind).toBe("added");
  });

  it("reports a restored article as added", () => {
    const deleted = state({ status: "catalogue", deletedAt: "2026-10-03T09:00:00.000Z" });
    expect(remoteChangeAlert(deleted, base, session)?.kind).toBe("added");
  });

  it("reports a removal from « à acheter »", () => {
    expect(remoteChangeAlert(base, state({ status: "catalogue" }), session)?.kind).toBe("removed");
  });

  it("reports a deletion as a removal", () => {
    const deleted = state({ deletedAt: "2026-10-03T10:00:05.000Z" });
    expect(remoteChangeAlert(base, deleted, session)?.kind).toBe("removed");
  });

  it("asks to put back an article removed from the cart", () => {
    const inCart = state({ status: "caddie" });
    expect(remoteChangeAlert(inCart, state({ status: "catalogue" }), session)?.kind).toBe(
      "put_back",
    );
  });

  it("reports a quantity change", () => {
    expect(remoteChangeAlert(base, state({ quantity: 3 }), session)?.kind).toBe("quantity_changed");
  });

  it("stays silent for my own changes", () => {
    const mine = state({ status: "catalogue", updatedBy: ME });
    expect(remoteChangeAlert(base, mine, session)).toBeNull();
  });

  it("stays silent outside a shopping session", () => {
    const removed = state({ status: "catalogue" });
    expect(remoteChangeAlert(base, removed, { me: ME, inSession: false })).toBeNull();
  });

  it("stays silent for changes not covered by COL-03", () => {
    expect(remoteChangeAlert(base, state({ status: "caddie" }), session)).toBeNull();
    const catalogue = state({ status: "catalogue" });
    expect(
      remoteChangeAlert(catalogue, state({ status: "catalogue", quantity: 2 }), session),
    ).toBeNull();
  });
});

describe("needsRemovalConfirmation (COL-04)", () => {
  it("asks when another member put the article in the cart", () => {
    expect(needsRemovalConfirmation(state({ status: "caddie" }), ME)).toBe(true);
  });

  it("still asks after I changed the quantity of that article", () => {
    expect(
      needsRemovalConfirmation(state({ status: "caddie", statusBy: OTHER, updatedBy: ME }), ME),
    ).toBe(true);
  });

  it("does not ask when I put it in the cart myself", () => {
    expect(
      needsRemovalConfirmation(state({ status: "caddie", statusBy: ME, updatedBy: OTHER }), ME),
    ).toBe(false);
  });

  it("asks when the member who put it in the cart deleted their account", () => {
    expect(needsRemovalConfirmation(state({ status: "caddie", statusBy: null }), ME)).toBe(true);
  });

  it("does not ask outside the cart", () => {
    expect(needsRemovalConfirmation(base, ME)).toBe(false);
  });
});

describe("mergeDuplicate (OFF-05, ART-04)", () => {
  const incoming = state({ id: "offline", quantity: null });

  it("keeps the existing article and moves it from the catalogue to « à acheter »", () => {
    const existing = state({ id: "server", status: "catalogue" });
    expect(mergeDuplicate(existing, incoming)).toEqual({ ...existing, status: "a_acheter" });
  });

  it("leaves an article already « à acheter » there", () => {
    const existing = state({ id: "server", status: "a_acheter" });
    expect(mergeDuplicate(existing, incoming).status).toBe("a_acheter");
  });

  it("leaves an article already in the cart there", () => {
    const existing = state({ id: "server", status: "caddie" });
    expect(mergeDuplicate(existing, incoming).status).toBe("caddie");
  });

  it("takes the offline quantity when it is set", () => {
    const existing = state({ id: "server", quantity: 2 });
    expect(mergeDuplicate(existing, state({ quantity: 6 })).quantity).toBe(6);
  });

  it("keeps the existing quantity otherwise", () => {
    const existing = state({ id: "server", quantity: 2 });
    expect(mergeDuplicate(existing, incoming).quantity).toBe(2);
  });
});
