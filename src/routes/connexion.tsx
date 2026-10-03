import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authErrorMessage } from "@/features/auth/errors";
import { emailSchema, invitationCodeSchema, otpSchema } from "@/features/auth/schemas";
import { getAuthState } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";

const searchSchema = z.object({ invitation: invitationCodeSchema.optional().catch(undefined) });

export const Route = createFileRoute("/connexion")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    if (await getAuthState()) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

// CPT-01 : connexion sans mot de passe, par lien ou par code à 6 chiffres.
function LoginPage() {
  const { invitation } = Route.useSearch();
  const [email, setEmail] = useState<string | null>(null);

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Connexion à Rayon</h1>
      {email === null ? (
        <EmailStep invitation={invitation} onSent={setEmail} />
      ) : (
        <CodeStep email={email} invitation={invitation} onBack={() => setEmail(null)} />
      )}
    </main>
  );
}

function EmailStep({
  invitation,
  onSent,
}: {
  invitation: string | undefined;
  onSent: (email: string) => void;
}) {
  const [fieldError, setFieldError] = useState<string>();
  const send = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: invitation ? { invitation_code: invitation } : undefined,
          // Après connexion, la page d'invitation détecte un compte existant (ISC-05).
          emailRedirectTo: invitation
            ? `${window.location.origin}/invitation/${encodeURIComponent(invitation)}`
            : window.location.origin,
        },
      });
      if (error) throw error;
      return email;
    },
    onSuccess: onSent,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(new FormData(event.currentTarget).get("email"));
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    send.mutate(parsed.data);
  }

  const sendError = send.error ? authErrorMessage(send.error) : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field data-invalid={fieldError ? true : undefined}>
        <FieldLabel htmlFor="email">Adresse email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="h-11"
          aria-invalid={fieldError ? true : undefined}
        />
        {invitation && <FieldDescription>Invitation {invitation}</FieldDescription>}
        <FieldError>{fieldError}</FieldError>
      </Field>
      <div aria-live="polite">
        {sendError && (
          <p className="text-sm text-destructive">
            {sendError.message}
            {sendError.requestAccess && (
              // ISC-02 : la page de demande d'accès arrive avec ISC-07.
              <>
                {" · "}
                <span className="underline">Demander un accès</span>
              </>
            )}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11 w-full" disabled={send.isPending}>
        Recevoir le lien de connexion
      </Button>
    </form>
  );
}

function CodeStep({
  email,
  invitation,
  onBack,
}: {
  email: string;
  invitation: string | undefined;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [fieldError, setFieldError] = useState<string>();
  const verify = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
    },
    onSuccess: () =>
      invitation
        ? navigate({ to: "/invitation/$code", params: { code: invitation } })
        : navigate({ to: "/" }),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = otpSchema.safeParse(new FormData(event.currentTarget).get("code"));
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    verify.mutate(parsed.data);
  }

  const error = fieldError ?? (verify.error ? authErrorMessage(verify.error).message : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Un email a été envoyé à {email}. Touchez le lien qu'il contient, ou saisissez le code reçu.
      </p>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="code">Code reçu par email</FieldLabel>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
          className="h-11 text-center text-lg tracking-[0.4em]"
          aria-invalid={error ? true : undefined}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <Button type="submit" className="h-11 w-full" disabled={verify.isPending}>
        Se connecter
      </Button>
      <Button type="button" variant="ghost" className="h-11 w-full" onClick={onBack}>
        Changer d'adresse email
      </Button>
    </form>
  );
}
