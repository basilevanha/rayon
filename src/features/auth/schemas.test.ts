import { describe, expect, it } from "vitest";
import {
  displayNameSchema,
  emailSchema,
  invitationCodeSchema,
  otpSchema,
} from "@/features/auth/schemas";
import { i18n } from "@/lib/i18n";

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("emailSchema", () => {
  it("trims and lowercases a valid email", () => {
    expect(emailSchema.parse("  Alice@Example.COM ")).toBe("alice@example.com");
  });

  it("rejects an invalid email with a translated message", () => {
    expect(firstMessage(emailSchema.safeParse("alice"))).toBe(
      i18n.t("auth:validation.invalidEmail"),
    );
  });
});

describe("otpSchema", () => {
  it("accepts 6 digits, ignoring spaces", () => {
    expect(otpSchema.parse(" 123 456 ")).toBe("123456");
  });

  it("rejects anything else", () => {
    expect(firstMessage(otpSchema.safeParse("12345"))).toBe(i18n.t("auth:validation.otpFormat"));
    expect(otpSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("displayNameSchema (CPT-04)", () => {
  it("accepts 1 to 30 characters after trim", () => {
    expect(displayNameSchema.parse("  Alice ")).toBe("Alice");
    expect(displayNameSchema.safeParse("a".repeat(30)).success).toBe(true);
  });

  it("rejects empty or too long names", () => {
    expect(firstMessage(displayNameSchema.safeParse("   "))).toBe(
      i18n.t("auth:validation.displayNameRequired"),
    );
    expect(firstMessage(displayNameSchema.safeParse("a".repeat(31)))).toBe(
      i18n.t("auth:validation.displayNameTooLong"),
    );
  });
});

describe("invitationCodeSchema", () => {
  it("normalises to uppercase", () => {
    expect(invitationCodeSchema.parse(" bienvenue ")).toBe("BIENVENUE");
  });

  it("rejects an empty code", () => {
    expect(invitationCodeSchema.safeParse("").success).toBe(false);
  });
});
