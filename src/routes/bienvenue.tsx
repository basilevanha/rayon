import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { profileQueryOptions, useSetDisplayName } from "@/features/auth/profile";
import { displayNameSchema } from "@/features/auth/schemas";
import { getAuthState } from "@/features/auth/session";

export const Route = createFileRoute("/bienvenue")({
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
  if (profile?.display_name) return <Navigate to="/" />;

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Bienvenue</h1>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="displayName">Choisissez votre nom affiché</FieldLabel>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            maxLength={30}
            required
            className="h-11"
            aria-invalid={error ? true : undefined}
          />
          <FieldDescription>Visible des membres de vos listes partagées.</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={!profile}>
          Continuer
        </Button>
      </form>
    </main>
  );
}
