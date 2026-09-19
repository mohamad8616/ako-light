"use client";

import { getAdminNavItem } from "@/lib/admin/sections";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Admin topbar — generic chrome only.
 *
 * Instructions:
 *   - This component must NOT render a page's main heading. Each admin page
 *     owns its own <h2> in its own body content (see
 *     app/[locale]/(admin)/page.tsx), so an <h1> here would both duplicate
 *     and mislabel it: the same hardcoded title used to show on all ten
 *     admin routes. There is deliberately no `title` prop.
 *   - The current section is derived from the URL — `usePathname()` plus the
 *     shared registry in lib/admin/sections.ts — so it is correct on every
 *     route without any page passing anything up. The breadcrumb is
 *     navigation (<nav>/<ol>), not a heading.
 *   - The trigger is visible at every width: the primitive routes its click
 *     to the drawer on mobile and to the collapse state on desktop. The
 *     sidebar provider lives in the admin layout, which is what makes this
 *     trigger actually work.
 */
export function AdminTopbar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const displayName = session?.user?.name ?? "Admin";
  const section = getAdminNavItem(pathname);
  const signOutLabel = t("admin.topbar.signOut");

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className={cn(
        "border-border bg-background/80 flex h-16 min-w-0 items-center justify-between gap-2 border-b px-3 backdrop-blur-sm md:gap-3 md:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <SidebarTrigger className="shrink-0" />

        <nav aria-label={t("admin.breadcrumb.label")} className="min-w-0">
          <ol className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <li className="shrink-0">{t("admin.breadcrumb.root")}</li>
            {section ? (
              <>
                <li aria-hidden className="text-muted-foreground/50 shrink-0">
                  /
                </li>
                <li className="text-foreground truncate font-medium">
                  {t(section.labelKey)}
                </li>
              </>
            ) : null}
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="border-border bg-muted/40 hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:flex">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-start">
            <p className="text-muted-foreground text-xs">
              {t("admin.topbar.greeting")}
            </p>
            <p className="text-foreground text-sm font-medium">{displayName}</p>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          aria-label={signOutLabel}
          className="gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          {/* Icon-only under `sm` so the bar never overflows on a phone. */}
          <span className="hidden sm:inline">{signOutLabel}</span>
        </Button>
      </div>
    </header>
  );
}
