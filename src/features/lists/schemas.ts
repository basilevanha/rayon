import { z } from "zod";
import { i18n } from "@/lib/i18n";

// LST-01 : grille fixe, 🛒 par défaut.
export const LIST_EMOJIS = [
  "🛒",
  "🏠",
  "👪",
  "🥦",
  "🍎",
  "🥖",
  "🧀",
  "🥩",
  "🐟",
  "🍷",
  "☕",
  "🍼",
  "🐶",
  "🐱",
  "🧴",
  "🧹",
  "💊",
  "🌱",
  "🎉",
  "🎂",
  "🎄",
  "🏕️",
  "🏖️",
  "🏢",
] as const;

export const DEFAULT_LIST_EMOJI = LIST_EMOJIS[0];

// Valeur lue d'un formulaire : hors de la grille, l'emoji par défaut.
export const listEmojiSchema = z.enum(LIST_EMOJIS).catch(DEFAULT_LIST_EMOJI);

export const listNameSchema = z
  .string()
  .trim()
  .min(1, { error: () => i18n.t("lists:validation.nameRequired") })
  .max(40, { error: () => i18n.t("lists:validation.nameTooLong") });

// INV-01 : 6 caractères, sans 0, O, 1 ni I.
export const listJoinCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{6}$/, { error: () => i18n.t("lists:validation.codeFormat") });

export const listSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  emoji: z.string(),
  // NAV-06 : dernière modification de la liste par un membre.
  activity_at: z.string(),
});

export type ListSummary = z.infer<typeof listSummarySchema>;

const memberRowSchema = z
  .object({
    user_id: z.uuid(),
    joined_at: z.string(),
    is_creator: z.boolean(),
    profiles: z.object({ display_name: z.string().nullable() }).nullable(),
  })
  .transform((row) => ({
    userId: row.user_id,
    joinedAt: row.joined_at,
    isCreator: row.is_creator,
    displayName: row.profiles?.display_name ?? null,
  }));

export type ListMember = z.output<typeof memberRowSchema>;

export const listDetailSchema = listSummarySchema
  .extend({ list_members: z.array(memberRowSchema) })
  .transform(({ list_members, ...list }) => ({
    ...list,
    members: list_members.toSorted((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
  }));

export type ListDetail = z.output<typeof listDetailSchema>;

export const invitationSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  expires_at: z.string(),
});

export type ListInvitation = z.infer<typeof invitationSchema>;
