// OFF-02 : toutes les écritures sont rejouées une à une, dans l'ordre où elles ont été
// faites (ex. créer une liste hors ligne, puis y ajouter un article). L'id « lists » est
// conservé pour les mutations déjà mises en file avant les articles.
export const SYNC_SCOPE = { id: "lists" };
