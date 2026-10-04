import { useEffect } from "react";
import { createFileRoute, Navigate, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountDrawers } from "@/features/auth/account";
import {
  AccountNotFoundError,
  profileQueryOptions,
  useIsSettingDisplayName,
} from "@/features/auth/profile";
import { signOutAndClear } from "@/features/auth/sign-out";
import { getAuthState } from "@/features/auth/session";
import { drawerSearchSchema } from "@/hooks/use-drawer-navigation";
import { useLastListStore } from "@/features/lists/last-list-store";
import { ListDrawers } from "@/features/lists/list-drawers";
import { useAcceptPendingInvitations } from "@/features/lists/mutations";
import { useOnline } from "@/hooks/use-online";

// Écrans réservés aux comptes connectés.
export const Route = createFileRoute("/_app")({
  validateSearch: drawerSearchSchema,
  beforeLoad: async () => {
    const auth = await getAuthState();
    if (!auth) throw redirect({ to: "/connexion" });
    return { auth };
  },
  component: AppLayout,
});

function AppLayout() {
  const { auth } = Route.useRouteContext();
  const { data: profile, error: profileError } = useQuery(profileQueryOptions(auth.userId));
  const settingDisplayName = useIsSettingDisplayName();
  useSignOutIfAccountMissing(profileError);
  useJoinPendingLists(auth.userId);

  // CPT-04 : le nom affiché est obligatoire.
  if (profile && profile.display_name === null && !settingDisplayName)
    return <Navigate to="/bienvenue" />;

  return (
    <>
      <Outlet />
      <ListDrawers userId={auth.userId} />
      <AccountDrawers auth={auth} />
    </>
  );
}

// INV-02 : à la connexion, le compte rejoint les listes dont il a utilisé le code
// pour s'inscrire ; la dernière rejointe s'ouvre (section 4.2).
function useJoinPendingLists(userId: string) {
  const online = useOnline();
  const { mutate } = useAcceptPendingInvitations();
  const setLastListId = useLastListStore((state) => state.setLastListId);

  useEffect(() => {
    if (!online) return;
    mutate(undefined, {
      onSuccess: (listIds) => {
        const joined = listIds.at(-1);
        if (joined) setLastListId(joined);
      },
    });
  }, [userId, online, mutate, setLastListId]);
}

// CPT-07 : une session dont le compte n'existe plus est fermée, et l'appareil vidé.
function useSignOutIfAccountMissing(error: Error | null) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const missing = error instanceof AccountNotFoundError;

  useEffect(() => {
    if (!missing) return;
    void signOutAndClear(client).then(() => navigate({ to: "/connexion", replace: true }));
  }, [missing, client, navigate]);
}
