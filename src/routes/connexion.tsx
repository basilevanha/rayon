import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["auth", "common"]);

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
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
  const { t } = useTranslation(["auth", "common"]);
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
        <FieldLabel htmlFor="email">{t("login.emailLabel")}</FieldLabel>
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
        {invitation && (
          <FieldDescription>{t("login.invitation", { code: invitation })}</FieldDescription>
        )}
        <FieldError>{fieldError}</FieldError>
      </Field>
      <div aria-live="polite">
        {sendError && (
          <p className="text-sm text-destructive">
            {t(sendError.messageKey)}
            {sendError.requestAccess && (
              // ISC-02 : la page de demande d'accès arrive avec ISC-07.
              <>
                {" · "}
                <span className="underline">{t("login.requestAccess")}</span>
              </>
            )}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11 w-full" disabled={send.isPending}>
        {t("login.sendLink")}
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
  const { t } = useTranslation(["auth", "common"]);
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

  const error =
    fieldError ?? (verify.error ? t(authErrorMessage(verify.error).messageKey) : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("login.emailSent", { email })}</p>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="code">{t("login.codeLabel")}</FieldLabel>
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
        {t("login.submitCode")}
      </Button>
      <Button type="button" variant="ghost" className="h-11 w-full" onClick={onBack}>
        {t("login.changeEmail")}
      </Button>
    </form>
  );
}
