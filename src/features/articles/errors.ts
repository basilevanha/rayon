import { isNetworkError } from "@/lib/network";

export type ArticleErrorKey =
  | "articles:errors.alreadyInCart"
  | "articles:errors.duplicateName"
  | "articles:errors.notFound"
  | "articles:errors.notMember"
  | "common:errors.offline"
  | "common:errors.retry";

// Messages levés par les fonctions SQL et contraintes de la migration « articles ».
const sqlErrors: Record<string, ArticleErrorKey> = {
  article_introuvable: "articles:errors.notFound",
  // OFF-04 : retrait rejoué sur un article mis au caddie par un autre membre.
  deja_au_caddie: "articles:errors.alreadyInCart",
  non_membre: "articles:errors.notMember",
};

const UNIQUE_VIOLATION = "23505";

export function articleErrorMessage(error: { message?: string; code?: string }): ArticleErrorKey {
  const message = error.message ?? "";
  if (message in sqlErrors) return sqlErrors[message];
  // TEC-01 : renommage ou annulation de suppression vers un nom déjà pris (ART-06, ART-08).
  if (error.code === UNIQUE_VIOLATION) return "articles:errors.duplicateName";
  if (isNetworkError(error)) return "common:errors.offline";
  return "common:errors.retry";
}
