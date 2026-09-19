"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { translations } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AdminTopbar({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const router = useRouter();
  const { lang } = useLanguage();
  const { data: session } = authClient.useSession();
  const displayName = session?.user?.name ?? "Admin";

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className={cn(
        "border-border bg-background/80 flex h-16 items-center justify-between border-b px-4 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div>
          <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
            {translations[lang]["admin.overview.title"]}
          </p>
          <h1 className="text-foreground text-xl font-semibold">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="border-border bg-muted/40 hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:flex">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-muted-foreground text-xs">
              {translations[lang]["admin.topbar.greeting"]}
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
          className="gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{translations[lang]["admin.topbar.signOut"]}</span>
        </Button>
      </div>
    </header>
  );
}
