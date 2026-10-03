import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ErrorScreen } from "@/components/error-screen";
import { UpdateBanner } from "@/features/pwa/update-banner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  errorComponent: () => (
    <AppShell>
      <ErrorScreen />
    </AppShell>
  ),
  notFoundComponent: () => (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <Link to="/" className="underline">
        Retour à l'accueil
      </Link>
    </main>
  ),
});

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
      <UpdateBanner />
      <Toaster theme="system" position="bottom-center" />
    </AppShell>
  );
}
