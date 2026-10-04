import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { listJoinCodeSchema } from "@/features/lists/schemas";
import { supabase } from "@/lib/supabase";

// invitation : invitation à l'application (ISC-04) ; rejoindre : invitation à une liste (INV-02).
const searchSchema = z.object({
  invitation: invitationCodeSchema.optional().catch(undefined),
  rejoindre: listJoinCodeSchema.optional().catch(undefined),
});

// typed : code saisi après un refus (ISC-02), sans savoir s'il vient d'une liste.
type Invitation = { code: string; kind: "app" | "list" | "typed" } | undefined;

// Page où revenir après connexion : elle traite le code reçu.
function invitationReturnPath(invitation: Invitation): string {
  // Un code de liste saisi est rattrapé à la connexion (accepter_invitations_en_attente).
  if (!invitation || invitation.kind === "typed") return "/";
  const code = encodeURIComponent(invitation.code);
  return invitation.kind === "list" ? `/rejoindre/${code}` : `/invitation/${code}`;
}

export const Route = createFileRoute("/connexion")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    if (await getAuthState()) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

// CPT-01 : connexion sans mot de passe, par lien ou par code à 6 chiffres.
function LoginPage() {
  const search = Route.useSearch();
  const [typedCode, setTypedCode] = useState<string>();
  const invitation: Invitation = typedCode
    ? { code: typedCode, kind: "typed" }
    : search.rejoindre
      ? { code: search.rejoindre, kind: "list" }
      : search.invitation
        ? { code: search.invitation, kind: "app" }
        : undefined;
  const [email, setEmail] = useState<string | null>(null);
  const { t } = useTranslation(["auth", "common", "lists"]);

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
      {email === null ? (
        <EmailStep
          invitation={invitation}
          onSent={(sentEmail, code) => {
            setTypedCode(code);
            setEmail(sentEmail);
          }}
        />
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
  invitation: Invitation;
  onSent: (email: string, typedCode: string | undefined) => void;
}) {
  const { t } = useTranslation(["auth", "common", "lists"]);
  const [fieldError, setFieldError] = useState<string>();
  // ISC-02 : « Déjà une invitation ? » affiche le champ du code.
  const [askCode, setAskCode] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (askCode) codeInput.current?.focus();
  }, [askCode]);
  const send = useMutation({
    mutationFn: async ({ email, typedCode }: { email: string; typedCode?: string }) => {
      const used: Invitation = typedCode ? { code: typedCode, kind: "typed" } : invitation;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: used ? { invitation_code: used.code } : undefined,
          // Après connexion, la page d'invitation détecte un compte existant (ISC-05)
          // ou ajoute le compte à la liste (INV-02).
          emailRedirectTo: `${window.location.origin}${invitationReturnPath(used)}`,
        },
      });
      if (error) throw error;
    },
    onSuccess: (_data, { email, typedCode }) => onSent(email, typedCode),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = emailSchema.safeParse(form.get("email"));
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    const typedCode = askCode ? invitationCodeSchema.safeParse(form.get("invitationCode")) : null;
    send.mutate({ email: parsed.data, typedCode: typedCode?.success ? typedCode.data : undefined });
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
          <FieldDescription>{t("login.invitation", { code: invitation.code })}</FieldDescription>
        )}
        <FieldError>{fieldError}</FieldError>
      </Field>
      {askCode && (
        <Field>
          <FieldLabel htmlFor="invitationCode">{t("login.invitationCodeLabel")}</FieldLabel>
          <Input
            id="invitationCode"
            name="invitationCode"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            ref={codeInput}
            className="h-11 uppercase"
          />
        </Field>
      )}
      <div aria-live="polite">
        {sendError && (
          <p className="text-sm text-destructive">
            {t(sendError.messageKey)}
            {sendError.askNewLink && ` ${t("lists:errors.askNewLink")}`}
            {sendError.requestAccess && (
              // ISC-02 : la page de demande d'accès arrive avec ISC-07.
              <>
                {" · "}
                <span className="underline">{t("login.requestAccess")}</span>
              </>
            )}
          </p>
        )}
        {sendError?.requestAccess && !askCode && (
          <Button
            type="button"
            variant="link"
            className="h-11 px-0"
            onClick={() => setAskCode(true)}
          >
            {t("login.haveInvitation")}
          </Button>
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
  invitation: Invitation;
  onBack: () => void;
}) {
  const { t } = useTranslation(["auth", "common", "lists"]);
  const navigate = useNavigate();
  const [fieldError, setFieldError] = useState<string>();
  const verify = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
    },
    onSuccess: () => navigate({ to: invitationReturnPath(invitation) }),
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
