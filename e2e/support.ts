import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import { resources } from "../src/lib/i18n/resources";

const DB_URL = process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:55324";

type Tree = { readonly [key: string]: string | Tree };

// Même source que l'interface : les tests ne dupliquent aucun texte.
export function t(key: string, values: Record<string, string> = {}): string {
  const [namespace, path] = key.split(":");
  const text = path
    .split(".")
    .reduce<string | Tree | undefined>(
      (node, part) => (typeof node === "object" ? node[part] : undefined),
      (resources.fr as unknown as Tree)[namespace],
    );
  if (typeof text !== "string") throw new Error(`Texte introuvable : ${key}`);
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? "");
}

// Base locale uniquement (OPS-05).
function sql(query: string): string {
  return execFileSync("psql", [DB_URL, "-Atc", query], { encoding: "utf8" }).trim();
}

export function createAppInvitation(): string {
  const code = `E2E${Date.now().toString(36).toUpperCase()}`;
  sql(`insert into public.app_invitations (code) values ('${code}')`);
  return code;
}

export function uniqueEmail(name: string): string {
  return `${name}-${Date.now()}@e2e.test`;
}

async function searchMessages(email: string): Promise<{ Snippet: string }[]> {
  const response = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  const body = (await response.json()) as { messages: { Snippet: string }[] };
  return body.messages;
}

// Nombre d'emails déjà reçus : readOtp attend ensuite le suivant (reconnexion).
export async function countEmails(email: string): Promise<number> {
  return (await searchMessages(email)).length;
}

// Code du plus récent email, une fois que plus de `after` emails sont arrivés.
export async function readOtp(email: string, after = 0): Promise<string> {
  let otp: string | undefined;
  await expect
    .poll(async () => {
      const messages = await searchMessages(email);
      otp = messages.length > after ? messages[0]?.Snippet.match(/\b\d{6}\b/)?.[0] : undefined;
      return otp;
    })
    .toBeDefined();
  return otp!;
}

// CPT-01 puis CPT-04 : connexion par code, puis choix du nom affiché.
export async function signUp(page: Page, email: string, displayName: string) {
  await page.getByLabel(t("auth:login.emailLabel")).fill(email);
  await page.getByRole("button", { name: t("auth:login.sendLink") }).click();
  await page.getByLabel(t("auth:login.codeLabel")).fill(await readOtp(email));
  await page.getByRole("button", { name: t("auth:login.submitCode") }).click();
  await page.getByLabel(t("auth:welcome.displayNameLabel")).fill(displayName);
  await page.getByRole("button", { name: t("common:actions.continue") }).click();
}
