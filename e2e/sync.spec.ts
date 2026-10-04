import { expect, test, type Page } from "@playwright/test";
import { countEmails, createAppInvitation, readOtp, signUp, t, uniqueEmail } from "./support";

async function createList(page: Page, name: string) {
  await page.getByRole("button", { name: t("lists:actions.add") }).click();
  await page.getByRole("button", { name: t("lists:actions.create") }).click();
  await page.getByLabel(t("lists:create.nameLabel")).fill(name);
  await page.getByRole("button", { name: t("lists:create.submit") }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

async function addArticle(page: Page, name: string) {
  await page.getByLabel(t("search:label")).fill(name);
  await page
    .getByRole("region", { name: t("search:results") })
    .getByRole("button", { name: "Autre", exact: true })
    .click();
}

const row = (page: Page, name: string) =>
  page.getByRole("main").getByRole("button", { name: t("articles:row.edit", { name }) });

// COL-01, INV-04 (QUA-04 : recevoir une modification d'un autre membre).
test("un membre voit en temps réel l'arrivée d'un autre et ses articles", async ({ browser }) => {
  const alice = await browser.newPage();
  await alice.goto(`/connexion?invitation=${createAppInvitation()}`);
  await signUp(alice, uniqueEmail("alice"), "Alice");
  await createList(alice, "Maison");
  await alice.getByRole("link", { name: t("lists:header.settings") }).click();
  await alice.getByRole("button", { name: t("lists:settings.invite") }).click();
  const code = (await alice.locator("p.font-mono").first().innerText()).trim();
  await alice.goBack();

  const bob = await (await browser.newContext()).newPage();
  await bob.goto(`/rejoindre/${code}`);
  await signUp(bob, uniqueEmail("bob"), "Bob");
  await expect(bob.getByRole("heading", { name: "Maison", exact: true })).toBeVisible();

  // INV-04
  await expect(
    alice.getByText(t("sync:memberJoined", { name: "Bob", list: "Maison" })),
  ).toBeVisible();

  // COL-01 : moins de 2 secondes.
  await addArticle(alice, "Lait");
  await expect(row(bob, "Lait")).toBeVisible({ timeout: 2000 });
  await addArticle(bob, "Pain");
  await expect(row(alice, "Pain")).toBeVisible({ timeout: 2000 });

  // Un retrait (PRE-06) et une suppression (ART-08) se propagent aussi.
  await row(bob, "Lait").click();
  await bob
    .getByRole("dialog", { name: t("articles:drawer.title") })
    .getByRole("button", { name: t("articles:drawer.delete") })
    .click();
  await expect(row(alice, "Lait")).toHaveCount(0, { timeout: 2000 });
});

// OFF-01 à OFF-03 (QUA-04 : utiliser hors ligne puis resynchroniser).
test("utiliser une liste hors ligne, puis resynchroniser", async ({ page, context }) => {
  await page.goto(`/connexion?invitation=${createAppInvitation()}`);
  await signUp(page, uniqueEmail("hors-ligne"), "Hors Ligne");
  await createList(page, "Maison");
  await addArticle(page, "Lait");
  await expect(row(page, "Lait")).toBeVisible();
  // « Lait » est enregistré par le serveur avant la coupure.
  await page.waitForLoadState("networkidle");

  await context.setOffline(true);
  const indicator = page.getByRole("status");
  await expect(indicator).toHaveText(t("sync:offline"));

  // OFF-02 : chaque action s'applique tout de suite et attend le réseau.
  await addArticle(page, "Pain");
  await addArticle(page, "Beurre");
  await expect(row(page, "Pain")).toBeVisible();
  await expect(indicator).toHaveText(t("sync:offlinePending_other", { count: "2" }));

  // OFF-02 : l'app est fermée puis rouverte en ligne. La file, enregistrée sur
  // l'appareil (100 ms au plus après chaque action), est rejouée au redémarrage.
  await page.waitForTimeout(300);
  await context.setOffline(false);
  await page.reload();
  await expect(row(page, "Pain")).toBeVisible();
  await expect(row(page, "Beurre")).toBeVisible();
});

// OFF-08 : session refusée en ligne (jeton révoqué) : la liste reste utilisable, la
// reconnexion est demandée, et la modification faite entre-temps n'est pas perdue.
test("se reconnecter après une session révoquée, sans perdre ses modifications", async ({
  page,
}) => {
  const email = uniqueEmail("revoquee");
  await page.goto(`/connexion?invitation=${createAppInvitation()}`);
  await signUp(page, email, "Révoquée");
  await createList(page, "Maison");
  await addArticle(page, "Lait");
  await page.waitForLoadState("networkidle");
  // Le cache de l'appareil est enregistré avant la révocation.
  await page.waitForTimeout(1000);

  // Jeton expiré et jeton de renouvellement refusé par le serveur.
  await page.evaluate(() => {
    const raw = localStorage.getItem("rayon-auth");
    if (!raw) throw new Error("session absente");
    localStorage.setItem(
      "rayon-auth",
      JSON.stringify({ ...JSON.parse(raw), expires_at: 1, refresh_token: "revoque" }),
    );
  });
  await page.reload();
  await expect(page.getByText(t("sync:sessionLost"))).toBeVisible();
  await expect(row(page, "Lait")).toBeVisible();

  await addArticle(page, "Pain");
  await expect(row(page, "Pain")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(t("sync:pending_one", { count: "1" }), {
    timeout: 10_000,
  });

  await page.getByRole("link", { name: t("sync:reconnect") }).click();
  const sent = await countEmails(email);
  await page.getByLabel(t("auth:login.emailLabel")).fill(email);
  await page.getByRole("button", { name: t("auth:login.sendLink") }).click();
  await page.getByLabel(t("auth:login.codeLabel")).fill(await readOtp(email, sent));
  await page.getByRole("button", { name: t("auth:login.submitCode") }).click();

  await expect(page.getByText(t("sync:sessionLost"))).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("", { timeout: 10_000 });
  await page.reload();
  await expect(row(page, "Pain")).toBeVisible();
});

// CPT-07 : après une session perdue, un autre compte se connecte sur l'appareil. Il ne voit
// rien du précédent, et la file de celui-ci n'est pas rejouée sous son nom.
test("un autre compte qui se connecte ne voit ni les données ni la file du précédent", async ({
  page,
}) => {
  await page.goto(`/connexion?invitation=${createAppInvitation()}`);
  await signUp(page, uniqueEmail("alice"), "Alice");
  await createList(page, "Secret");
  await addArticle(page, "Lait");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const raw = localStorage.getItem("rayon-auth");
    if (!raw) throw new Error("session absente");
    localStorage.setItem(
      "rayon-auth",
      JSON.stringify({ ...JSON.parse(raw), expires_at: 1, refresh_token: "revoque" }),
    );
  });
  await page.reload();
  await expect(page.getByText(t("sync:sessionLost"))).toBeVisible();
  await addArticle(page, "Pain");
  await page.waitForTimeout(500);

  await page.goto(`/connexion?invitation=${createAppInvitation()}`);
  await signUp(page, uniqueEmail("bob"), "Bob");
  await expect(page.getByText(t("lists:home.empty"))).toBeVisible();
  await expect(page.getByText("Secret")).toHaveCount(0);
  await page.waitForTimeout(3000);
  await expect(page.getByText(t("articles:errors.notMember"))).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("");
});
