import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import type { ListMember } from "@/features/lists/schemas";

export function initials(displayName: string | null): string {
  return displayName?.trim().charAt(0).toLocaleUpperCase("fr") || "?";
}

// NAV-02 : avatars des membres, en initiales.
export function MemberAvatars({
  members,
  visible = 3,
}: {
  members: readonly ListMember[];
  visible?: number;
}) {
  const { t } = useTranslation("lists");
  const names = members.map((m) => m.displayName ?? t("settings.unnamed")).join(", ");
  const hidden = members.length - visible;

  return (
    <div className="shrink-0">
      <span className="sr-only">{t("header.members", { names })}</span>
      <AvatarGroup aria-hidden>
        {members.slice(0, visible).map((member) => (
          <Avatar key={member.userId} size="sm">
            <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
          </Avatar>
        ))}
        {hidden > 0 && (
          <AvatarGroupCount>{t("header.moreMembers", { count: hidden })}</AvatarGroupCount>
        )}
      </AvatarGroup>
    </div>
  );
}
