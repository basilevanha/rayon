import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Adresse email invalide" }));

export const otpSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, { error: "Le code contient 6 chiffres" }));

// CPT-04
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Le nom affiché est obligatoire" })
  .max(30, { error: "30 caractères au maximum" });

export const invitationCodeSchema = z.string().trim().toUpperCase().min(1);
