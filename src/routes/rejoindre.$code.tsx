import { useEffect, useRef } from "react";
import { createFileRoute, Link, Navigate, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { profileQueryOptions, useIsSettingDisplayName } from "@/features/auth/profile";
import { getAuthState } from "@/features/auth/session";
import { listErrorMessage } from "@/features/lists/errors";
import { useLastListStore } from "@/features/lists/last-list-store";
import { useAcceptInvitation } from "@/features/lists/mutations";
import { listJoinCodeSchema } from "@/features/lists/schemas";
import { useOnline } from "@/hooks/use-online";

// INV-02, INV-03 : lien d'invitation à une liste. Sans session, la connexion
// transmet le code au hook d'inscription, puis revient ici.
export const Route = createFileRoute("/rejoindre/$code")({
  beforeLoad: async ({ params }) => {
    const code = listJoinCodeSchema.safeParse(params.code);
    const auth = await getAuthState();
    // OFF-08 : une session perdue se reconnecte d'abord, puis revient ici.
    if (code.success && (!auth || auth.sessionLost)) {
      throw redirect({ to: "/connexion", search: { rejoindre: code.data } });
    }
    return { userId: auth?.userId ?? null };
  },
  component: JoinPage,
});

function JoinPage() {
  const { code: rawCode } = Route.useParams();
  const code = listJoinCodeSchema.safeParse(rawCode);
  // Format invalide : même message qu'un code inconnu du serveur (INV-03).
  const { userId } = Route.useRouteContext();
  return code.success && userId ? (
    <AcceptInvitation code={code.data} userId={userId} />
  ) : (
    <JoinError {...listErrorMessage({ message: "invitation_inconnue" })} />
  );
}

function AcceptInvitation({ code, userId }: { code: string; userId: string }) {
  const { t } = useTranslation("lists");
  const { data: profile } = useQuery(profileQueryOptions(userId));
  const settingName = useIsSettingDisplayName();
  // INV-04 : la liste n'est rejointe qu'une fois le nom affiché enregistré (CPT-04),
  // pour que ses membres voient « [nom] a rejoint « [liste] » ».
  const named = Boolean(profile?.display_name) && !settingName;
  const navigate = useNavigate();
  const online = useOnline();
  const accept = useAcceptInvitation();
  const setLastListId = useLastListStore((state) => state.setLastListId);
  const started = useRef(false);

  useEffect(() => {
    if (!online || !named || started.current) return;
    started.current = true;
    accept.mutate(code, {
      onSuccess: (listId) => {
        setLastListId(listId);
        void navigate({ to: "/listes/$listId", params: { listId }, replace: true });
      },
    });
  }, [accept, code, navigate, online, named, setLastListId]);

  if (profile && !profile.display_name && !settingName) {
    return <Navigate to="/bienvenue" search={{ rejoindre: code }} replace />;
  }

  // OFF-07 : rejoindre une liste nécessite le réseau.
  if (!online) return <JoinError messageKey="common:errors.offline" askNewLink={false} />;
  if (accept.error) {
    const { messageKey, askNewLink } = listErrorMessage(accept.error);
    return <JoinError messageKey={messageKey} askNewLink={askNewLink} />;
  }
  return (
    <main className="flex flex-1 items-center justify-center p-6" aria-live="polite">
      <p className="text-muted-foreground">{t("join.joining")}</p>
    </main>
  );
}

function JoinError({
  messageKey,
  askNewLink,
}: {
  messageKey: ReturnType<typeof listErrorMessage>["messageKey"];
  askNewLink: boolean;
}) {
  const { t } = useTranslation(["lists", "common"]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t(messageKey)}</h1>
      {askNewLink && <p className="text-muted-foreground">{t("errors.askNewLink")}</p>}
      <Link to="/" className="inline-flex min-h-11 items-center underline">
        {t("common:app.open")}
      </Link>
    </main>
  );
}
