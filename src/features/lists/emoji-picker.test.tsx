import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmojiPicker } from "@/features/lists/emoji-picker";
import { DEFAULT_LIST_EMOJI, LIST_EMOJIS } from "@/features/lists/schemas";
import { i18n } from "@/lib/i18n";

describe("EmojiPicker (LST-01)", () => {
  it("offers the fixed grid with the given emoji selected", () => {
    render(<EmojiPicker defaultValue="🏠" />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(LIST_EMOJIS.length);
    expect(
      screen.getByRole("radio", { name: i18n.t("lists:defaultEmoji", { emoji: "🏠" }) }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", {
        name: i18n.t("lists:defaultEmoji", { emoji: DEFAULT_LIST_EMOJI }),
      }),
    ).not.toBeChecked();
  });
});
