import { expect, test } from "@playwright/test";
import { createAppInvitation, readOtp, t, uniqueEmail } from "./support";

// ISC-02 : saisir le code après le refus ; CPT-06, CPT-07 : compte et déconnexion.
test("s'inscrire en saisissant son code d'invitation, puis se déconnecter", async ({ page }) => {
  const code = createAppInvitation();
  const email = uniqueEmail("carole");

  await page.goto("/connexion");
  await page.getByLabel(t("auth:login.emailLabel")).fill(email);
  await page.getByRole("button", { name: t("auth:login.sendLink") }).click();
  await expect(page.getByText(t("auth:errors.signupByInvitation"))).toBeVisible();

  await page.getByRole("button", { name: t("auth:login.haveInvitation") }).click();
  await page.getByLabel(t("auth:login.invitationCodeLabel")).fill(code.toLowerCase());
  await page.getByRole("button", { name: t("auth:login.sendLink") }).click();
  await page.getByLabel(t("auth:login.codeLabel")).fill(await readOtp(email));
  await page.getByRole("button", { name: t("auth:login.submitCode") }).click();
  await page.getByLabel(t("auth:welcome.displayNameLabel")).fill("Carole");
  await page.getByRole("button", { name: t("common:actions.continue") }).click();

  await page.getByRole("button", { name: t("auth:account.open") }).click();
  const account = page.getByRole("dialog", { name: t("auth:account.title") });
  await expect(account.getByText(email)).toBeVisible();
  await expect(account.getByLabel(t("auth:account.displayNameLabel"))).toHaveValue("Carole");

  await account.getByRole("button", { name: t("auth:account.signOut") }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
});
