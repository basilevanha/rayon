import { expect, test } from "@playwright/test";
import { createAppInvitation, signUp, t, uniqueEmail } from "./support";

// LST-01, LST-07, INV-01, INV-02, NAV-01, NAV-02, NAV-03, NAV-05 (QUA-04 : inviter).
test("créer une liste, inviter un membre qui s'inscrit avec le lien, transmettre le rôle", async ({
  browser,
}) => {
  const alice = await browser.newPage();
  await alice.goto(`/connexion?invitation=${createAppInvitation()}`);
  await signUp(alice, uniqueEmail("alice"), "Alice");

  // NAV-01, NAV-06 : sans dernière liste, « Mes listes ».
  await alice.getByRole("button", { name: t("lists:actions.add") }).click();
  await alice.getByRole("button", { name: t("lists:actions.create") }).click();
  await alice.getByLabel(t("lists:create.nameLabel")).fill("Maison");
  await alice.getByRole("button", { name: t("lists:create.submit") }).click();
  // NAV-03 : une seule liste, ni flèche ni tiroir.
  await expect(alice.getByRole("heading", { name: "Maison", exact: true })).toBeVisible();
  const switchTo = (name: string) =>
    alice.getByRole("button", { name: t("lists:header.switchList", { name }) });
  await expect(switchTo("Maison")).toHaveCount(0);

  // NAV-02, NAV-06 : la flèche ramène à « Mes listes », où l'on crée une seconde liste.
  await alice.getByRole("link", { name: t("lists:header.back") }).click();
  await expect(alice.getByRole("heading", { name: t("lists:myLists.title") })).toBeVisible();
  await alice.getByRole("button", { name: t("lists:actions.add") }).click();
  await alice.getByRole("button", { name: t("lists:actions.create") }).click();
  await alice.getByLabel(t("lists:create.nameLabel")).fill("Bureau");
  await alice.getByRole("button", { name: t("lists:create.submit") }).click();

  // NAV-03, NAV-05 : le tiroir des listes se ferme au retour arrière, et change de liste.
  await switchTo("Bureau").click();
  const drawer = alice.getByRole("dialog", { name: t("lists:drawer.title") });
  await expect(drawer).toBeVisible();
  await alice.goBack();
  await expect(alice.getByRole("dialog")).toHaveCount(0);
  await switchTo("Bureau").click();
  await drawer.getByRole("link", { name: "Maison" }).click();
  await expect(switchTo("Maison")).toBeVisible();

  // INV-01
  await alice.getByRole("link", { name: t("lists:header.settings") }).click();
  await alice.getByRole("button", { name: t("lists:settings.invite") }).click();
  const code = (await alice.locator("p.font-mono").first().innerText()).trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  // INV-02 : Bob n'a pas de compte ; il arrive dans la liste après inscription.
  const bob = await (await browser.newContext()).newPage();
  await bob.goto(`/rejoindre/${code}`);
  await signUp(bob, uniqueEmail("bob"), "Bob");
  await expect(bob.getByRole("heading", { name: "Maison", exact: true })).toBeVisible();
  await expect(bob.getByText(t("lists:header.members", { names: "Alice, Bob" }))).toBeVisible();

  // LST-06 : Bob n'est pas créateur.
  await bob.getByRole("link", { name: t("lists:header.settings") }).click();
  await expect(bob.getByRole("button", { name: t("lists:settings.delete") })).toHaveCount(0);

  // LST-07 : Alice quitte, le rôle passe à Bob.
  await alice.goto("/");
  await alice.getByRole("link", { name: t("lists:header.settings") }).click();
  await alice.getByRole("button", { name: t("lists:settings.leave") }).click();
  // UI-03, NAV-05 : la confirmation est un tiroir, fermé par le retour arrière.
  const confirmation = alice.getByRole("dialog", {
    name: t("lists:settings.leaveTitle", { name: "Maison" }),
  });
  await expect(confirmation).toBeVisible();
  await alice.goBack();
  await expect(confirmation).toHaveCount(0);
  await alice.getByRole("button", { name: t("lists:settings.leave") }).click();
  await confirmation.getByRole("button", { name: t("lists:settings.leave") }).click();
  await expect(alice.getByRole("button", { name: t("lists:actions.add") })).toBeVisible();

  await bob.reload();
  await expect(bob.getByRole("button", { name: t("lists:settings.delete") })).toBeVisible();
});
