import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { profileQueryOptions, useSetDisplayName } from "@/features/auth/profile";
import { displayNameSchema } from "@/features/auth/schemas";
import type { AuthState } from "@/features/auth/session";
import { signOutAndClear } from "@/features/auth/sign-out";
import { initials } from "@/features/lists/member-avatars";
import { useDrawerNavigation } from "@/hooks/use-drawer-navigation";

// CPT-06 : avatar du compte, à droite de l'en-tête.
export function AccountButton({ userId }: { userId: string }) {
  const { t } = useTranslation("auth");
  const drawers = useDrawerNavigation();
  const { data: profile } = useQuery(profileQueryOptions(userId));

  return (
    <button
      type="button"
      onClick={() => drawers.open("compte")}
      aria-label={t("account.open")}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Avatar aria-hidden>
        <AvatarFallback className="bg-primary text-primary-foreground">
          {initials(profile?.display_name ?? null)}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}

// CPT-07 : modifications en attente, mises à jour en direct.
function usePendingChanges(): number {
  return useMutationState({ filters: { status: "pending" } }).length;
}

function useSignOut() {
  const client = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await signOutAndClear(client);
    await navigate({ to: "/connexion", replace: true });
  };
}

export function AccountDrawers({ auth }: { auth: AuthState }) {
  const { t } = useTranslation("auth");
  const drawers = useDrawerNavigation();
  const pending = usePendingChanges();
  const signOut = useSignOut();

  return (
    <>
      <Drawer
        open={drawers.current === "compte"}
        onOpenChange={(open) => !open && drawers.current === "compte" && drawers.close()}
      >
        <AccountDrawerContent
          auth={auth}
          onSignOut={() =>
            pending > 0 ? drawers.open("deconnexion", { replace: true }) : void signOut()
          }
        />
      </Drawer>
      <ConfirmDrawer
        open={drawers.current === "deconnexion"}
        onClose={drawers.close}
        title={t("account.signOutTitle")}
        description={t("account.signOutPending", { count: pending })}
        confirmLabel={t("account.signOut")}
        onConfirm={() => void signOut()}
      />
    </>
  );
}

function AccountDrawerContent({ auth, onSignOut }: { auth: AuthState; onSignOut: () => void }) {
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
    setError(undefined);
    setDisplayName.mutate({ userId: auth.userId, displayName: parsed.data });
    toast.success(t("account.saved"));
  }

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{t("account.title")}</DrawerTitle>
        {auth.email && <DrawerDescription>{auth.email}</DrawerDescription>}
      </DrawerHeader>
      <div className="flex flex-col gap-6 overflow-y-auto p-4">
        {profile && (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="account-display-name">
                {t("account.displayNameLabel")}
              </FieldLabel>
              <Input
                key={profile.display_name}
                id="account-display-name"
                name="displayName"
                defaultValue={profile.display_name ?? ""}
                autoComplete="nickname"
                maxLength={30}
                required
                className="h-11"
                aria-invalid={error ? true : undefined}
              />
              <FieldDescription>{t("welcome.displayNameHelp")}</FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
            <Button type="submit" variant="outline" className="h-11 self-start">
              {t("account.saveName")}
            </Button>
          </form>
        )}
        <Button variant="ghost" className="h-11 justify-start gap-3" onClick={onSignOut}>
          <LogOut aria-hidden />
          {t("account.signOut")}
        </Button>
      </div>
    </DrawerContent>
  );
}
