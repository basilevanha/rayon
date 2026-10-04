import { z } from "zod";
import { i18n } from "@/lib/i18n";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: () => i18n.t("auth:validation.invalidEmail") }));

export const otpSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, { error: () => i18n.t("auth:validation.otpFormat") }));

// CPT-04
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: () => i18n.t("auth:validation.displayNameRequired") })
  .max(30, { error: () => i18n.t("auth:validation.displayNameTooLong") });

export const invitationCodeSchema = z.string().trim().toUpperCase().min(1);
