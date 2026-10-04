import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIST_EMOJI,
  LIST_EMOJIS,
  listDetailSchema,
  listJoinCodeSchema,
  listNameSchema,
} from "@/features/lists/schemas";
import { i18n } from "@/lib/i18n";

describe("listNameSchema (LST-01)", () => {
  it("trims the name", () => {
    expect(listNameSchema.parse("  Maison  ")).toBe("Maison");
  });

  it("rejects an empty name", () => {
    const result = listNameSchema.safeParse("   ");
    expect(result.error?.issues[0]?.message).toBe(i18n.t("lists:validation.nameRequired"));
  });

  it("accepts 40 characters and rejects 41", () => {
    expect(listNameSchema.safeParse("x".repeat(40)).success).toBe(true);
    const result = listNameSchema.safeParse("x".repeat(41));
    expect(result.error?.issues[0]?.message).toBe(i18n.t("lists:validation.nameTooLong"));
  });
});

describe("LIST_EMOJIS (LST-01)", () => {
  it("starts with the default emoji and has no duplicates", () => {
    expect(LIST_EMOJIS[0]).toBe(DEFAULT_LIST_EMOJI);
    expect(new Set(LIST_EMOJIS).size).toBe(LIST_EMOJIS.length);
  });
});

describe("listJoinCodeSchema (INV-01)", () => {
  it("normalizes case and spaces", () => {
    expect(listJoinCodeSchema.parse(" ab3k9z ")).toBe("AB3K9Z");
  });

  it.each(["AB3K9", "AB3K9ZZ", "AB0K9Z", "ABIK9Z", "AB-K9Z"])("rejects %s", (code) => {
    const result = listJoinCodeSchema.safeParse(code);
    expect(result.error?.issues[0]?.message).toBe(i18n.t("lists:validation.codeFormat"));
  });
});

describe("listDetailSchema", () => {
  it("maps members and sorts them by arrival", () => {
    const detail = listDetailSchema.parse({
      id: "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d",
      name: "Maison",
      emoji: "🏠",
      activity_at: "2026-10-03T10:00:00+00:00",
      list_members: [
        {
          user_id: "0b9f8e7d-6c5b-4a39-8281-7f6e5d4c3b2a",
          joined_at: "2026-10-02T10:00:00+00:00",
          is_creator: false,
          profiles: { display_name: "Bob" },
        },
        {
          user_id: "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d",
          joined_at: "2026-10-01T10:00:00+00:00",
          is_creator: true,
          profiles: { display_name: "Alice" },
        },
      ],
    });
    expect(detail.members.map((member) => member.displayName)).toEqual(["Alice", "Bob"]);
    expect(detail.members[0]?.isCreator).toBe(true);
  });
});
