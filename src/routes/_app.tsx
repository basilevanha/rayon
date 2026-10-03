import { createFileRoute, Navigate, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { profileQueryOptions, useIsSettingDisplayName } from "@/features/auth/profile";
import { getAuthState } from "@/features/auth/session";

// Écrans réservés aux comptes connectés.
export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const auth = await getAuthState();
    if (!auth) throw redirect({ to: "/connexion" });
    return { auth };
  },
  component: AppLayout,
});

function AppLayout() {
  const { auth } = Route.useRouteContext();
  const { data: profile } = useQuery(profileQueryOptions(auth.userId));
  const settingDisplayName = useIsSettingDisplayName();

  // CPT-04 : le nom affiché est obligatoire.
  if (profile && profile.display_name === null && !settingDisplayName)
    return <Navigate to="/bienvenue" />;

  return <Outlet />;
}
