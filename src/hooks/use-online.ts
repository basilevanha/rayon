import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

// État réseau tel que TanStack Query le voit (mise en pause des mutations, OFF-02).
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
