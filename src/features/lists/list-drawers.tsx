import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { profileQueryOptions } from "@/features/auth/profile";
import { useDrawerNavigation, type DrawerName } from "@/hooks/use-drawer-navigation";
import { EmojiPicker } from "@/features/lists/emoji-picker";
import { listErrorMessage } from "@/features/lists/errors";
import { useLastListStore } from "@/features/lists/last-list-store";
import { useAcceptInvitation, useCreateList } from "@/features/lists/mutations";
import { listsQueryOptions } from "@/features/lists/queries";
import {
  DEFAULT_LIST_EMOJI,
  listEmojiSchema,
  listJoinCodeSchema,
  listNameSchema,
} from "@/features/lists/schemas";
import { useOnline } from "@/hooks/use-online";

// UI-03 : tiroirs qui montent du bas de l'écran, pilotés par l'URL (NAV-05).
export function ListDrawers({ userId }: { userId: string }) {
  const drawers = useDrawerNavigation();
  const drawerProps = (name: DrawerName) => ({
    open: drawers.current === name,
    onOpenChange: (open: boolean) => {
      if (!open && drawers.current === name) drawers.close();
    },
  });

  return (
    <>
      <Drawer {...drawerProps("listes")}>
        <ListsDrawerContent userId={userId} />
      </Drawer>
      <Drawer {...drawerProps("ajouter")}>
        <AddListDrawerContent />
      </Drawer>
      <Drawer {...drawerProps("nouvelle")}>
        <CreateListDrawerContent userId={userId} />
      </Drawer>
      <Drawer {...drawerProps("rejoindre")}>
        <JoinListDrawerContent />
      </Drawer>
    </>
  );
}

// NAV-06 : « Ajouter une liste » propose de créer une liste ou d'en rejoindre une.
function AddListDrawerContent() {
  const { t } = useTranslation("lists");
  const drawers = useDrawerNavigation();
  const option = "h-12 justify-start gap-3 text-base";

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{t("actions.add")}</DrawerTitle>
      </DrawerHeader>
      <div className="flex flex-col gap-2 p-4">
        <Button
          variant="outline"
          className={option}
          onClick={() => drawers.open("nouvelle", { replace: true })}
        >
          <Plus aria-hidden />
          {t("actions.create")}
        </Button>
        <Button
          variant="outline"
          className={option}
          onClick={() => drawers.open("rejoindre", { replace: true })}
        >
          <UserPlus aria-hidden />
          {t("actions.join")}
        </Button>
      </div>
    </DrawerContent>
  );
}

// NAV-03, LST-02 : changement rapide de liste, sans création (NAV-06).
function ListsDrawerContent({ userId }: { userId: string }) {
  const { t } = useTranslation("lists");
  const { data: lists } = useQuery(listsQueryOptions(userId));

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{t("drawer.title")}</DrawerTitle>
      </DrawerHeader>
      <nav className="flex min-h-0 flex-col gap-1 overflow-y-auto p-4">
        {lists?.length === 0 && <p className="py-2 text-muted-foreground">{t("drawer.empty")}</p>}
        {lists?.map((list) => (
          <Link
            key={list.id}
            to="/listes/$listId"
            params={{ listId: list.id }}
            replace
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[status=active]:bg-accent data-[status=active]:font-medium"
          >
            <span aria-hidden className="text-xl">
              {list.emoji}
            </span>
            <span className="truncate">{list.name}</span>
          </Link>
        ))}
      </nav>
    </DrawerContent>
  );
}

// LST-01, LST-04 (création vide ; la copie arrivera avec les articles).
function CreateListDrawerContent({ userId }: { userId: string }) {
  const { t } = useTranslation("lists");
  const navigate = useNavigate();
  const { data: profile } = useQuery(profileQueryOptions(userId));
  const createList = useCreateList();
  const setLastListId = useLastListStore((state) => state.setLastListId);
  const [error, setError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = listNameSchema.safeParse(form.get("name"));
    if (!name.success) {
      setError(name.error.issues[0]?.message);
      return;
    }
    const listId = crypto.randomUUID();
    createList.mutate({
      userId,
      listId,
      name: name.data,
      emoji: listEmojiSchema.parse(form.get("emoji")),
      displayName: profile?.display_name ?? null,
    });
    setLastListId(listId);
    void navigate({ to: "/listes/$listId", params: { listId }, replace: true });
  }

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{t("create.title")}</DrawerTitle>
      </DrawerHeader>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 overflow-y-auto p-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="list-name">{t("create.nameLabel")}</FieldLabel>
          <Input
            id="list-name"
            name="name"
            maxLength={40}
            required
            autoComplete="off"
            className="h-11"
            aria-invalid={error ? true : undefined}
          />
          <FieldError>{error}</FieldError>
        </Field>
        <EmojiPicker defaultValue={DEFAULT_LIST_EMOJI} />
        <Button type="submit" className="h-11">
          {t("create.submit")}
        </Button>
      </form>
    </DrawerContent>
  );
}

// NAV-01, NAV-03 : rejoindre avec un code, compte déjà connecté (INV-02).
function JoinListDrawerContent() {
  const { t } = useTranslation(["lists", "common"]);
  const navigate = useNavigate();
  const online = useOnline();
  const accept = useAcceptInvitation();
  const setLastListId = useLastListStore((state) => state.setLastListId);
  const [fieldError, setFieldError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = listJoinCodeSchema.safeParse(new FormData(event.currentTarget).get("code"));
    if (!code.success) {
      setFieldError(code.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    accept.mutate(code.data, {
      onSuccess: (listId) => {
        setLastListId(listId);
        void navigate({ to: "/listes/$listId", params: { listId }, replace: true });
      },
    });
  }

  const acceptError = accept.error ? listErrorMessage(accept.error) : undefined;
  const error = fieldError ?? (acceptError && t(acceptError.messageKey));

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{t("join.title")}</DrawerTitle>
        {!online && <DrawerDescription>{t("common:errors.offline")}</DrawerDescription>}
      </DrawerHeader>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 p-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="join-code">{t("join.codeLabel")}</FieldLabel>
          <Input
            id="join-code"
            name="code"
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            className="h-11 text-center text-lg tracking-[0.4em] uppercase"
            aria-invalid={error ? true : undefined}
          />
          <FieldDescription>{t("join.codeHelp")}</FieldDescription>
          <FieldError>
            {error}
            {acceptError?.askNewLink && ` ${t("errors.askNewLink")}`}
          </FieldError>
        </Field>
        <Button type="submit" className="h-11" disabled={!online || accept.isPending}>
          {accept.isPending ? t("join.joining") : t("join.submit")}
        </Button>
      </form>
    </DrawerContent>
  );
}
