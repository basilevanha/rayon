import { useState, type FormEvent, type ReactNode } from "react";
import { useCanGoBack, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { EmojiPicker } from "@/features/lists/emoji-picker";
import { listErrorMessage } from "@/features/lists/errors";
import { useLastListStore } from "@/features/lists/last-list-store";
import { initials } from "@/features/lists/member-avatars";
import {
  useCreateInvitation,
  useDeleteList,
  useLeaveList,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateList,
} from "@/features/lists/mutations";
import { invitationsQueryOptions } from "@/features/lists/queries";
import { listEmojiSchema, listNameSchema, type ListDetail } from "@/features/lists/schemas";
import { useOnline } from "@/hooks/use-online";

// NAV-05 : chaque confirmation est une entrée d'historique, le retour arrière la ferme.
export const settingsSearchSchema = z.object({
  confirmer: z.enum(["quitter", "supprimer"]).optional().catch(undefined),
  retirer: z.uuid().optional().catch(undefined),
});

type Confirmation = {
  current: "quitter" | "supprimer" | undefined;
  removing: string | undefined;
  open: (search: { confirmer?: "quitter" | "supprimer"; retirer?: string }) => void;
  close: () => void;
};

function useConfirmation(): Confirmation {
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Non strict : le Sheet reste affiché pendant son animation de sortie, après la route.
  const search = settingsSearchSchema.parse(useSearch({ strict: false }));
  return {
    current: search.confirmer,
    removing: search.retirer,
    open: (next) => void navigate({ to: ".", search: (prev) => ({ ...prev, ...next }) }),
    close: () => {
      if (canGoBack) router.history.back();
      else
        void navigate({
          to: ".",
          search: (prev) => ({ ...prev, confirmer: undefined, retirer: undefined }),
          replace: true,
        });
    },
  };
}

// LST-05, NAV-04 : réglages de la liste, dans un panneau qui glisse depuis la droite.
// UI-07 : l'animation ne bloque rien ; UI-08 : simple fondu si moins d'animations.
export function ListSettingsSheet({
  list,
  userId,
  open,
  onClose,
}: {
  list: ListDetail;
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("lists");

  return (
    <Sheet open={open} onOpenChange={(next) => !next && open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "gap-0 duration-300 ease-out data-[side=right]:w-full data-[side=right]:sm:max-w-md",
          // Glisse depuis le bord droit ; simple fondu si moins d'animations (UI-08).
          "motion-safe:data-ending-style:translate-x-full! motion-safe:data-starting-style:translate-x-full!",
          "motion-reduce:translate-x-0!",
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("settings.back")}
            className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          <SheetTitle className="truncate text-lg font-semibold">{t("settings.title")}</SheetTitle>
        </header>
        <ListSettings list={list} userId={userId} />
      </SheetContent>
    </Sheet>
  );
}

function ListSettings({ list, userId }: { list: ListDetail; userId: string }) {
  const { t } = useTranslation("lists");
  const confirm = useConfirmation();
  const isCreator = list.members.some((m) => m.userId === userId && m.isCreator);

  return (
    <>
      <div className="flex flex-col gap-8 overflow-y-auto p-4 pb-10">
        <Section title={t("settings.listSection")}>
          <ListForm list={list} userId={userId} />
        </Section>
        <Section title={t("settings.membersSection")}>
          <Members list={list} userId={userId} isCreator={isCreator} confirm={confirm} />
        </Section>
        <Section title={t("settings.invitationsSection")}>
          <Invitations list={list} />
        </Section>
        <Section title={t("settings.dangerSection")}>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="h-11 self-start"
              onClick={() => confirm.open({ confirmer: "quitter" })}
            >
              {t("settings.leave")}
            </Button>
            {isCreator && (
              <Button
                variant="destructive"
                className="h-11 self-start"
                onClick={() => confirm.open({ confirmer: "supprimer" })}
              >
                {t("settings.delete")}
              </Button>
            )}
          </div>
        </Section>
      </div>
      <LeaveListDrawer list={list} userId={userId} confirm={confirm} />
      {isCreator && <DeleteListDrawer list={list} userId={userId} confirm={confirm} />}
      {isCreator && <RemoveMemberDrawer list={list} confirm={confirm} />}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

function ListForm({ list, userId }: { list: ListDetail; userId: string }) {
  const { t } = useTranslation("lists");
  const updateList = useUpdateList();
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = listNameSchema.safeParse(form.get("name"));
    if (!name.success) {
      setError(name.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    updateList.mutate({
      userId,
      listId: list.id,
      name: name.data,
      emoji: listEmojiSchema.parse(form.get("emoji")),
    });
    toast.success(t("settings.saved"));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="settings-name">{t("create.nameLabel")}</FieldLabel>
        <Input
          key={list.name}
          id="settings-name"
          name="name"
          defaultValue={list.name}
          maxLength={40}
          required
          autoComplete="off"
          className="h-11"
          aria-invalid={error ? true : undefined}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <EmojiPicker key={list.emoji} defaultValue={list.emoji} />
      <Button type="submit" className="h-11 self-start">
        {t("actions.save")}
      </Button>
    </form>
  );
}

function Members({
  list,
  userId,
  isCreator,
  confirm,
}: {
  list: ListDetail;
  userId: string;
  isCreator: boolean;
  confirm: Confirmation;
}) {
  const { t } = useTranslation("lists");
  return (
    <ul className="flex flex-col gap-1">
      {list.members.map((member) => (
        <li key={member.userId} className="flex min-h-11 items-center gap-3">
          <Avatar aria-hidden>
            <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">
              {member.userId === userId
                ? t("settings.you", { name: member.displayName ?? t("settings.unnamed") })
                : (member.displayName ?? t("settings.unnamed"))}
            </span>
            {member.isCreator && (
              <span className="text-xs text-muted-foreground">{t("settings.creator")}</span>
            )}
          </span>
          {isCreator && member.userId !== userId && (
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => confirm.open({ retirer: member.userId })}
            >
              {t("settings.remove")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

// LST-06 : réservé au créateur.
function RemoveMemberDrawer({ list, confirm }: { list: ListDetail; confirm: Confirmation }) {
  const { t } = useTranslation("lists");
  const removeMember = useRemoveMember();
  const member = list.members.find((m) => m.userId === confirm.removing);
  const name = member?.displayName ?? t("settings.unnamed");

  return (
    <ConfirmDrawer
      open={member !== undefined}
      onClose={confirm.close}
      title={t("settings.removeTitle", { name })}
      description={t("settings.removeDescription", { name })}
      confirmLabel={t("settings.remove")}
      onConfirm={() => {
        if (member) removeMember.mutate({ listId: list.id, memberId: member.userId });
        confirm.close();
      }}
    />
  );
}

// INV-01 : générer, partager, révoquer. OFF-07 : réseau requis.
function Invitations({ list }: { list: ListDetail }) {
  const { t, i18n } = useTranslation(["lists", "common"]);
  const online = useOnline();
  const { data: invitations } = useQuery(invitationsQueryOptions(list.id));
  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long" });

  const linkFor = (code: string) => `${window.location.origin}/rejoindre/${code}`;

  async function share(code: string) {
    const url = linkFor(code);
    const text = t("settings.shareText", { name: list.name });
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
      } catch {
        // Partage annulé par l'utilisateur.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success(t("settings.copied"));
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(linkFor(code));
    toast.success(t("settings.copied"));
  }

  const createError = createInvitation.error && listErrorMessage(createInvitation.error);

  return (
    <div className="flex flex-col gap-3">
      <Button
        className="h-11 self-start"
        disabled={!online || createInvitation.isPending}
        onClick={() => createInvitation.mutate(list.id)}
      >
        {t("settings.invite")}
      </Button>
      {!online && (
        <p className="text-sm text-muted-foreground">{t("settings.invitationsOffline")}</p>
      )}
      {createError && (
        <p role="alert" className="text-sm text-destructive">
          {t(createError.messageKey)}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {invitations?.map((invitation) => (
          <li key={invitation.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="font-mono text-lg tracking-[0.3em]">{invitation.code}</p>
            <p className="text-sm break-all text-muted-foreground">{linkFor(invitation.code)}</p>
            <p className="text-sm text-muted-foreground">
              {t("settings.invitationExpires", {
                date: dateFormat.format(new Date(invitation.expires_at)),
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 gap-2"
                onClick={() => void share(invitation.code)}
              >
                <Share2 aria-hidden />
                {t("settings.share")}
              </Button>
              <Button
                variant="outline"
                className="h-11 gap-2"
                onClick={() => void copy(invitation.code)}
              >
                <Copy aria-hidden />
                {t("settings.copy")}
              </Button>
              <Button
                variant="ghost"
                className="h-11"
                disabled={!online}
                onClick={() =>
                  revokeInvitation.mutate(
                    { listId: list.id, invitationId: invitation.id },
                    {
                      onSuccess: () => toast.success(t("settings.revoked")),
                      onError: (error) => toast.error(t(listErrorMessage(error).messageKey)),
                    },
                  )
                }
              >
                {t("settings.revoke")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// LST-07, LST-08
function LeaveListDrawer({
  list,
  userId,
  confirm,
}: {
  list: ListDetail;
  userId: string;
  confirm: Confirmation;
}) {
  const { t } = useTranslation("lists");
  const navigate = useNavigate();
  const leaveList = useLeaveList();
  const forgetList = useLastListStore((state) => state.forgetList);
  const isLastMember = list.members.length <= 1;

  return (
    <ConfirmDrawer
      open={confirm.current === "quitter"}
      onClose={confirm.close}
      title={t("settings.leaveTitle", { name: list.name })}
      description={
        isLastMember ? t("settings.leaveLastDescription") : t("settings.leaveDescription")
      }
      confirmLabel={t("settings.leave")}
      onConfirm={() => {
        leaveList.mutate({ userId, listId: list.id });
        forgetList(list.id);
        toast(t("settings.left", { name: list.name }));
        void navigate({ to: "/", replace: true });
      }}
    />
  );
}

// LST-06 : suppression par le créateur, après saisie du nom.
function DeleteListDrawer({
  list,
  userId,
  confirm,
}: {
  list: ListDetail;
  userId: string;
  confirm: Confirmation;
}) {
  const { t } = useTranslation("lists");
  const navigate = useNavigate();
  const deleteList = useDeleteList();
  const forgetList = useLastListStore((state) => state.forgetList);
  const [typedName, setTypedName] = useState("");
  const matches = typedName.trim() === list.name;

  return (
    <ConfirmDrawer
      open={confirm.current === "supprimer"}
      onClose={() => {
        setTypedName("");
        confirm.close();
      }}
      title={t("settings.deleteTitle", { name: list.name })}
      description={t("settings.deleteDescription")}
      confirmLabel={t("settings.delete")}
      confirmDisabled={!matches}
      onConfirm={() => {
        deleteList.mutate({ userId, listId: list.id, name: typedName.trim() });
        forgetList(list.id);
        toast(t("settings.deleted", { name: list.name }));
        void navigate({ to: "/", replace: true });
      }}
    >
      <Field>
        <FieldLabel htmlFor="delete-name">{t("settings.deleteNameLabel")}</FieldLabel>
        <Input
          id="delete-name"
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          autoComplete="off"
          className="h-11"
        />
      </Field>
    </ConfirmDrawer>
  );
}
