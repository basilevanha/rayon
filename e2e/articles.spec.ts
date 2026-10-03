import { expect, test, type Page } from "@playwright/test";
import { createAppInvitation, signUp, t, uniqueEmail } from "./support";

async function createList(page: Page, name: string) {
  await page.getByRole("button", { name: t("lists:actions.add") }).click();
  await page.getByRole("button", { name: t("lists:actions.create") }).click();
  await page.getByLabel(t("lists:create.nameLabel")).fill(name);
  await page.getByRole("button", { name: t("lists:create.submit") }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

// ART-03 à ART-05, ART-08, REC-03 à REC-09, PRE-01, PRE-03, PRE-06, PRE-07, UI-10, UI-11,
// LST-02 (QUA-04 : ajouter, retirer et annuler).
test("ajouter des articles par la recherche, les retirer puis annuler", async ({ page }) => {
  await page.goto(`/connexion?invitation=${createAppInvitation()}`);
  await signUp(page, uniqueEmail("alice"), "Alice");
  await createList(page, "Maison");
  const search = page.getByLabel(t("search:label"));
  const list = page.getByRole("main");

  // PRE-07 : liste vide.
  await expect(page.getByText(t("articles:sections.empty"))).toBeVisible();

  // ART-05 : sans suggestion, une pastille choisit le rayon et crée l'article.
  await search.fill("Lait");
  await expect(
    page.getByRole("group", { name: t("search:chooseRayon", { name: "Lait" }) }),
  ).toBeVisible();
  await page.getByRole("button", { name: t("search:allRayons") }).click();
  const rayons = page.getByRole("dialog", { name: t("search:rayonsTitle", { name: "Lait" }) });
  await rayons.getByLabel(t("search:rayonsFilter")).fill("lait");
  await rayons.getByRole("button", { name: "Produits laitiers" }).click();
  await expect(rayons).toHaveCount(0);
  await expect(search).toBeFocused();
  // REC-09 : la barre se vide.
  await expect(search).toHaveValue("");

  // REC-08 : Entrée sans résultat met le focus sur les pastilles ; « Autre » crée.
  await search.fill("Piles");
  await search.press("Enter");
  await page.getByRole("button", { name: "Autre", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();

  // PRE-03 : titres de rayon ; « Autre » en dernier (ordre de référence).
  await expect(list.getByRole("heading", { level: 3 })).toHaveText(["Produits laitiers", "Autre"]);

  // REC-03, REC-05, REC-07 : une faute tolérée, badge, pas de « Créer » pour un nom identique.
  await search.fill("lsit");
  await expect(page.getByRole("button", { name: /Lait/ })).toContainText(t("search:badges.toBuy"));
  await search.fill("laits");
  await expect(page.getByRole("button", { name: /^Créer/ })).toHaveCount(0);
  await search.press("Escape");
  await expect(search).toHaveValue("");

  // PRE-06, UI-10 : glisser vers la gauche renvoie au catalogue, avec annulation sur place.
  const lait = list.getByRole("button", { name: t("articles:row.edit", { name: "Lait" }) });
  const box = (await lait.boundingBox())!;
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 80, box.y + box.height / 2, { steps: 5 });
  await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(list.getByText(t("articles:removed.label", { name: "Lait" }))).toBeVisible();
  await list.getByRole("button", { name: t("articles:removed.undo") }).click();
  await expect(lait).toBeVisible();

  // ART-06, UI-12 : le tiroir propose « Plus besoin ». Sans annulation, la bande disparaît.
  await lait.click();
  const drawer = page.getByRole("dialog", { name: t("articles:drawer.title") });
  await drawer.getByRole("button", { name: t("articles:drawer.notNeeded") }).click();
  await expect(drawer).toHaveCount(0);
  await expect(list.getByText(t("articles:removed.label", { name: "Lait" }))).toBeVisible();
  await expect(
    list.getByRole("button", { name: t("articles:sections.all", { count: "1" }) }),
  ).toBeVisible({ timeout: 10_000 });

  // REC-06 : un tap sur un résultat du catalogue le remet à acheter.
  await search.fill("lait");
  await page.getByRole("button", { name: /^Lait/ }).click();
  await expect(lait).toBeVisible();

  // ART-08, UI-11 : suppression depuis le tiroir, puis « Annuler ».
  await list.getByRole("button", { name: t("articles:row.edit", { name: "Piles" }) }).click();
  await drawer.getByRole("button", { name: t("articles:drawer.delete") }).click();
  await expect(list.getByText("Piles")).toHaveCount(0);
  await page.getByRole("button", { name: t("articles:drawer.undo") }).click();
  await expect(
    list.getByRole("button", { name: t("articles:row.edit", { name: "Piles" }) }),
  ).toBeVisible();

  // ART-04 : recréer un article existant ne le duplique pas.
  await search.fill("Piles ");
  await expect(page.getByRole("button", { name: /^Créer/ })).toHaveCount(0);
  await search.fill("");

  // LST-02 : nombre d'articles à acheter sur l'accueil.
  await page.getByRole("link", { name: t("lists:header.back") }).click();
  await expect(page.getByRole("main").getByRole("link", { name: /Maison/ })).toContainText("2");
});
