import { describe, expect, it } from "vitest";
import {
  displayNameSchema,
  emailSchema,
  invitationCodeSchema,
  otpSchema,
} from "@/features/auth/schemas";

describe("emailSchema", () => {
  it("trims and lowercases a valid email", () => {
    expect(emailSchema.parse("  Alice@Example.COM ")).toBe("alice@example.com");
  });

  it("rejects an invalid email", () => {
    expect(emailSchema.safeParse("alice").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts 6 digits, ignoring spaces", () => {
    expect(otpSchema.parse(" 123 456 ")).toBe("123456");
  });

  it("rejects anything else", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("displayNameSchema (CPT-04)", () => {
  it("accepts 1 to 30 characters after trim", () => {
    expect(displayNameSchema.parse("  Alice ")).toBe("Alice");
    expect(displayNameSchema.safeParse("a".repeat(30)).success).toBe(true);
  });

  it("rejects empty or too long names", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
    expect(displayNameSchema.safeParse("a".repeat(31)).success).toBe(false);
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
