import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  notFoundComponent: NotFound,
});

function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
      <Link to="/" className="inline-flex min-h-11 items-center underline">
        {t("notFound.back")}
      </Link>
    </main>
  );
}

function RootLayout() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <Outlet />
      <UpdateBanner />
      <Toaster theme="system" position="bottom-center" containerAriaLabel={t("notifications")} />
    </AppShell>
  );
}
