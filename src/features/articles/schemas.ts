import { z } from "zod";
import { i18n } from "@/lib/i18n";

export const articleStatusSchema = z.enum(["catalogue", "a_acheter", "caddie"]);

// RAY-01 : liste fixe, lue de la base.
export const rayonSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    reference_order: z.number(),
    deletable: z.boolean(),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    referenceOrder: row.reference_order,
    // ADM-03 : seul « Autre » n'est pas supprimable.
    isOther: !row.deletable,
  }));

export type Rayon = z.output<typeof rayonSchema>;

const articleRowSchema = z.object({
  id: z.uuid(),
  list_id: z.uuid(),
  name: z.string(),
  normalized_name: z.string(),
  rayon_id: z.uuid(),
  status: articleStatusSchema,
  status_by: z.uuid().nullable(),
  quantity: z.number().int().min(1).nullable(),
  updated_by: z.uuid().nullable(),
  updated_at: z.string(),
});

const toArticle = (row: z.infer<typeof articleRowSchema>) => ({
  id: row.id,
  listId: row.list_id,
  name: row.name,
  normalizedName: row.normalized_name,
  rayonId: row.rayon_id,
  status: row.status,
  statusBy: row.status_by,
  quantity: row.quantity,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
});

// ART-01. Seuls les articles non supprimés sont chargés (ART-08).
export const articleSchema = articleRowSchema.transform(toArticle);

// COL-01 : article diffusé en temps réel, y compris supprimé.
export const remoteArticleSchema = articleRowSchema
  .extend({ deleted_at: z.string().nullable() })
  .transform((row) => ({ ...toArticle(row), deletedAt: row.deleted_at }));

export type Article = z.output<typeof articleSchema>;

export const ARTICLE_COLUMNS =
  "id, list_id, name, normalized_name, rayon_id, status, status_by, quantity, updated_by, updated_at";

export const articleNameSchema = z
  .string()
  .trim()
  .min(1, { error: () => i18n.t("articles:validation.nameRequired") })
  .max(80, { error: () => i18n.t("articles:validation.nameTooLong") });

// ART-01 : entier d'au moins 1, vide par défaut.
export const articleQuantitySchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .pipe(
    z
      .number({ error: () => i18n.t("articles:validation.quantity") })
      .int({ error: () => i18n.t("articles:validation.quantity") })
      .min(1, { error: () => i18n.t("articles:validation.quantity") })
      .nullable(),
  );
