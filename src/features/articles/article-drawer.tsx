import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useDeleteArticle,
  useRestoreArticle,
  useSetArticleStatus,
  useUpdateArticle,
} from "@/features/articles/mutations";
import {
  articleNameSchema,
  articleQuantitySchema,
  type Article,
  type Rayon,
} from "@/features/articles/schemas";
import { UNDO_MS } from "@/features/articles/article-list";
import { UndoTimer } from "@/features/articles/undo-timer";
import { normalizeName } from "@/lib/normalize";

type ArticleDrawerProps = {
  userId: string;
  listId: string;
  /** null : tiroir fermé, ou article supprimé entre-temps. */
  article: Article | null;
  articles: readonly Article[];
  rayons: readonly Rayon[];
  onClose: () => void;
  /** PRE-06, UI-12 : même effet que le glissement, avec la bande d'annulation. */
  onNotNeeded: (article: Article) => void;
};

// ART-06, UI-03 : tiroir d'édition, en mode préparation.
export function ArticleDrawer(props: ArticleDrawerProps) {
  const { article, onClose } = props;
  return (
    <Drawer
      open={article !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {/* key : le formulaire repart des valeurs de l'article ouvert. */}
      {article && <ArticleForm key={article.id} {...props} article={article} />}
    </Drawer>
  );
}

function ArticleForm(props: ArticleDrawerProps & { article: Article }) {
  const { userId, listId, article, articles, rayons, onClose, onNotNeeded } = props;
  const { t } = useTranslation("articles");
  const updateArticle = useUpdateArticle();
  const setStatus = useSetArticleStatus();
  const deleteArticle = useDeleteArticle();
  const restoreArticle = useRestoreArticle();
  const [errors, setErrors] = useState<{ name?: string; quantity?: string }>({});
  // ART-02 : la quantité ne se saisit que pour un article à acheter ou dans le caddie.
  const wanted = article.status !== "catalogue";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = articleNameSchema.safeParse(form.get("name"));
    const quantity = wanted
      ? articleQuantitySchema.safeParse(form.get("quantity") ?? "")
      : ({ success: true, data: null } as const);
    // ART-06, TEC-01 : un nom déjà présent dans la liste est refusé.
    const duplicate =
      name.success &&
      articles.some((a) => a.id !== article.id && a.normalizedName === normalizeName(name.data));
    const next = {
      name: name.success
        ? duplicate
          ? t("errors.duplicateName")
          : undefined
        : name.error.issues[0]?.message,
      quantity: quantity.success ? undefined : quantity.error.issues[0]?.message,
    };
    setErrors(next);
    if (!name.success || !quantity.success || duplicate) return;

    // ART-07 : en vue « Défaut », le rayon de l'article.
    const rayonId = String(form.get("rayon") ?? article.rayonId);
    // Sans changement, rien n'est envoyé : la liste ne remonte pas (NAV-06).
    if (
      name.data !== article.name ||
      rayonId !== article.rayonId ||
      quantity.data !== article.quantity
    )
      updateArticle.mutate({
        userId,
        listId,
        articleId: article.id,
        name: name.data,
        rayonId,
        quantity: quantity.data,
      });
    onClose();
  }

  // ART-06 : un article du catalogue passe à acheter, comme depuis la recherche (REC-06).
  function addToList() {
    setStatus.mutate({
      userId,
      listId,
      articleId: article.id,
      status: "a_acheter",
      seenStatus: article.status,
    });
    onClose();
  }

  // ART-06, UI-12 : équivalent accessible du glissement « Plus besoin » (PRE-06).
  function notNeeded() {
    onNotNeeded(article);
    onClose();
  }

  // ART-08, UI-11 : suppression douce, « Annuler » pendant 6 secondes.
  function remove() {
    const variables = { userId, listId, article };
    deleteArticle.mutate(variables);
    onClose();
    toast(t("drawer.deleted", { name: article.name }), {
      duration: UNDO_MS,
      description: <UndoTimer />,
      action: { label: t("drawer.undo"), onClick: () => restoreArticle.mutate(variables) },
    });
  }

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{t("drawer.title")}</DrawerTitle>
      </DrawerHeader>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 overflow-y-auto p-4">
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="article-name">{t("drawer.nameLabel")}</FieldLabel>
          <Input
            id="article-name"
            name="name"
            defaultValue={article.name}
            maxLength={80}
            required
            autoComplete="off"
            className="h-11 text-base"
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        {wanted && (
          <Field data-invalid={errors.quantity ? true : undefined}>
            <FieldLabel htmlFor="article-quantity">{t("drawer.quantityLabel")}</FieldLabel>
            <Input
              id="article-quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              defaultValue={article.quantity ?? ""}
              className="h-11 w-28 text-base"
              aria-invalid={errors.quantity ? true : undefined}
            />
            <FieldDescription>{t("drawer.quantityHelp")}</FieldDescription>
            <FieldError>{errors.quantity}</FieldError>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="article-rayon">{t("drawer.rayonLabel")}</FieldLabel>
          <select
            id="article-rayon"
            name="rayon"
            defaultValue={article.rayonId}
            className="h-11 rounded-lg border border-input bg-background px-3 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {rayons.map((rayon) => (
              <option key={rayon.id} value={rayon.id}>
                {rayon.name}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" className="h-11">
          {t("drawer.save")}
        </Button>
        {article.status === "catalogue" && (
          <Button type="button" variant="outline" className="h-11" onClick={addToList}>
            {t("drawer.addToList")}
          </Button>
        )}
        {article.status === "a_acheter" && (
          <Button type="button" variant="outline" className="h-11" onClick={notNeeded}>
            {t("drawer.notNeeded")}
          </Button>
        )}
        <Button type="button" variant="destructive" className="h-11" onClick={remove}>
          {t("drawer.delete")}
        </Button>
      </form>
    </DrawerContent>
  );
}
