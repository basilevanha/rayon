import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { initials, MemberAvatars } from "@/features/lists/member-avatars";
import type { ListMember } from "@/features/lists/schemas";
import { i18n } from "@/lib/i18n";

const member = (displayName: string | null, index: number): ListMember => ({
  userId: `00000000-0000-4000-8000-00000000000${index}`,
  joinedAt: `2026-10-0${index + 1}T10:00:00Z`,
  isCreator: index === 0,
  displayName,
});

describe("initials", () => {
  it("uses the first letter, uppercased", () => {
    expect(initials("élodie")).toBe("É");
    expect(initials(null)).toBe("?");
    expect(initials("  ")).toBe("?");
  });
});

describe("MemberAvatars (NAV-02)", () => {
  it("names every member for screen readers and shows at most three avatars", () => {
    const members = ["Alice", "Bob", "Chloé", "David"].map(member);
    render(<MemberAvatars members={members} />);

    expect(
      screen.getByText(i18n.t("lists:header.members", { names: "Alice, Bob, Chloé, David" })),
    ).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.queryByText("D")).not.toBeInTheDocument();
    expect(screen.getByText(i18n.t("lists:header.moreMembers", { count: 1 }))).toBeInTheDocument();
  });
});
