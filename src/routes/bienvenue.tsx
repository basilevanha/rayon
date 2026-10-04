import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { profileQueryOptions, useSetDisplayName } from "@/features/auth/profile";
import { displayNameSchema } from "@/features/auth/schemas";
import { getAuthState } from "@/features/auth/session";
import { listJoinCodeSchema } from "@/features/lists/schemas";

export const Route = createFileRoute("/bienvenue")({
  // INV-02 : code d'une liste à rejoindre une fois le nom choisi.
  validateSearch: z.object({ rejoindre: listJoinCodeSchema.optional().catch(undefined) }),
  beforeLoad: async () => {
    const auth = await getAuthState();
    if (!auth) throw redirect({ to: "/connexion" });
    return { auth };
  },
  component: WelcomePage,
});

// CPT-04 : choix du nom affiché à la première connexion.
function WelcomePage() {
  const { auth } = Route.useRouteContext();
  const { rejoindre } = Route.useSearch();
  const { t } = useTranslation(["auth", "common"]);
  const { data: profile } = useQuery(profileQueryOptions(auth.userId));
  const setDisplayName = useSetDisplayName();
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = displayNameSchema.safeParse(
      new FormData(event.currentTarget).get("displayName"),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setDisplayName.mutate({ userId: auth.userId, displayName: parsed.data });
  }

  // Mise à jour optimiste : le nom est dans le cache dès la validation.
  if (profile?.display_name) {
    return rejoindre ? (
      <Navigate to="/rejoindre/$code" params={{ code: rejoindre }} replace />
    ) : (
      <Navigate to="/" />
    );
  }

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("welcome.title")}</h1>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="displayName">{t("welcome.displayNameLabel")}</FieldLabel>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            maxLength={30}
            required
            className="h-11"
            aria-invalid={error ? true : undefined}
          />
          <FieldDescription>{t("welcome.displayNameHelp")}</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={!profile}>
          {t("common:actions.continue")}
        </Button>
      </form>
    </main>
  );
}
