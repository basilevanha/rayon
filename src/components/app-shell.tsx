import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {/* view-transition-name : les pages glissent dans ce conteneur (index.css). */}
      <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col bg-background [view-transition-name:page]">
        {children}
      </div>
    </div>
  );
}
