"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/auth-client";
import { ROLES } from "@/lib/auth/permissions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Logout01Icon, UserCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";

/**
 * The signed-in staff account, fed straight from better-auth's session.
 *
 * `role` renders as a small badge (admin vs owner) so it is always obvious
 * which level of access the current session has. The demo Account / Billing
 * / Notifications entries don't exist for staff accounts and are not shown;
 * the profile-editing panel is a later step (see docs/admin-guide.md).
 */
export function NavUser({
  user,
}: {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
}) {
  const { isMobile } = useSidebar();
  const { t } = useLanguage();
  const router = useRouter();

  const displayName = user?.name || user?.email || "—";

  const initials = displayName.trim().slice(0, 2).toUpperCase() || "—";

  const roleLabel =
    user?.role === ROLES.owner
      ? t("admin.role.owner")
      : user?.role === ROLES.admin
        ? t("admin.role.admin")
        : (user?.role ?? "");

  const roleVariant =
    user?.role === ROLES.owner
      ? "default"
      : user?.role === ROLES.admin
        ? "secondary"
        : "outline";

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={user?.image ?? undefined} alt={displayName} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {roleLabel ? (
                <Badge variant={roleVariant} className="mt-1 w-fit">
                  {roleLabel}
                </Badge>
              ) : null}
            </div>
            <HugeiconsIcon
              icon={UserCircle02Icon}
              strokeWidth={2}
              className="ms-auto size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="size-8">
                  <AvatarImage
                    src={user?.image ?? undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {roleLabel ? (
                    <Badge variant={roleVariant} className="mt-1 w-fit">
                      {roleLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleSignOut}>
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                {t("admin.topbar.signOut")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
