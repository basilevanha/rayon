import type { FormEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// UI-03 : confirmation dans un tiroir qui monte du bas de l'écran.
export function ConfirmDrawer({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmDisabled) onConfirm();
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && open && onClose()}>
      <DrawerContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {children && <div className="px-4">{children}</div>}
          <DrawerFooter>
            <Button type="submit" variant="destructive" className="h-11" disabled={confirmDisabled}>
              {confirmLabel}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>
              {t("actions.cancel")}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
