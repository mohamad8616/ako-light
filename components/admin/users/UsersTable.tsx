"use client";

import { updatedColumn } from "@/components/admin/catalog/columns";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setDirectoryBannedAction,
  setDirectoryRoleAction,
} from "@/lib/admin/actions/user-directory";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import {
  assignableRoles,
  canModerateAccount,
  directoryScope,
} from "@/lib/admin/user-directory-permissions";
import type { AppRole } from "@/lib/auth/permissions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "@/lib/i18n/Link";
import type { UserDirectoryRow } from "@/lib/repositories/user-directory";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

/**
 * The `/admin/users` table — the SHARED customer directory.
 *
 * Both admin and owner see the same rows. What differs is the CONTROLS:
 *
 *   - every admin-level actor sees a Ban/Unban button on eligible rows;
 *   - only an owner sees a role Select, and only on rows where a legal
 *     transition exists.
 *
 * The gating here calls the SAME pure predicates the server action uses
 * (lib/admin/user-directory-permissions.ts), so the UI and the enforcement
 * cannot drift. This is still convenience only: the action re-derives the
 * caller's authority server-side, so hiding a control is never the security
 * boundary.
 *
 * Search and pagination are SERVER-side (the page reads `searchParams`); this
 * component only navigates and never filters the full table in the browser.
 */
export function UsersTable({
  rows,
  total,
  page,
  pageSize,
  search,
  currentUserId,
  currentRole,
}: {
  rows: UserDirectoryRow[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  currentUserId?: string;
  currentRole?: AppRole;
}) {
  const { t, lang } = useLanguage();
  const { run, pending } = useCrudSubmit();
  const [query, setQuery] = React.useState(search);
  const [pendingRole, setPendingRole] = React.useState<{
    row: UserDirectoryRow;
    role: AppRole;
  } | null>(null);

  const scope = directoryScope(currentRole);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const roleLabels: Record<string, string> = {
    user: t("admin.users.role.user"),
    admin: t("admin.users.role.admin"),
    owner: t("admin.users.role.owner"),
  };

  /** Whether the caller may moderate (ban/unban) this row. */
  const mayModerate = (row: UserDirectoryRow) =>
    canModerateAccount({
      actorRole: currentRole,
      actorId: currentUserId ?? "",
      targetRole: row.role,
      targetId: row.id,
    });

  /** The roles this row may be moved to by the current caller (owner only). */
  const rowAssignable = (row: UserDirectoryRow): readonly AppRole[] =>
    assignableRoles(currentRole, row.role);

  const toggleBan = (row: UserDirectoryRow) =>
    run(
      () => setDirectoryBannedAction({ userId: row.id, banned: !row.banned }),
      { successMessage: t("admin.users.status.updated") },
    );

  const changeRole = async () => {
    if (!pendingRole) return;
    const result = await run(
      () =>
        setDirectoryRoleAction({
          userId: pendingRole.row.id,
          role: pendingRole.role,
        }),
      { successMessage: t("admin.users.role.updated") },
    );
    if (result?.ok) setPendingRole(null);
  };

  const columns: ColumnDef<UserDirectoryRow, unknown>[] = [
    {
      id: "user",
      accessorFn: (row) => `${row.name} ${row.email}`,
      header: () => <span>{t("admin.users.col.user")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        return (
          <div className="max-w-64 min-w-32">
            <span className="text-foreground block truncate font-medium">
              {row.name}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {row.email}
            </span>
          </div>
        );
      },
    },
    {
      id: "role",
      accessorFn: (row) => row.role,
      header: () => <span>{t("admin.users.col.role")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        const isSelf = row.id === currentUserId;
        const options = rowAssignable(row);

        // Static badge wherever no caller may change this row's role: a
        // customer (never grantable here in the directory), the caller's own
        // account, and every row when the caller is an admin. The rule comes
        // from `assignableRoles`, so an admin simply gets no options.
        if (options.length === 0 || isSelf) {
          return (
            <div className="flex flex-col gap-1">
              <Badge variant={row.role === "user" ? "secondary" : "default"}>
                {roleLabels[row.role]}
              </Badge>
              {isSelf ? (
                <span className="text-muted-foreground text-[10px]">
                  {t("admin.users.self.hint")}
                </span>
              ) : null}
            </div>
          );
        }

        return (
          <Select
            items={Object.fromEntries(
              [row.role, ...options].map((value) => [value, roleLabels[value]]),
            )}
            value={row.role}
            disabled={pending}
            onValueChange={(value) =>
              value &&
              value !== row.role &&
              setPendingRole({ row, role: value as AppRole })
            }
          >
            <SelectTrigger
              className="w-32"
              aria-label={t("admin.users.col.role")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={ADMIN_SHELL_DIR}>
              {[row.role, ...options].map((value) => (
                <SelectItem key={value} value={value}>
                  {roleLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "phone",
      accessorFn: (row) => row.phoneNumber ?? "",
      header: () => <span>{t("admin.users.col.phone")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {row.phoneNumber ?? "—"}
          </span>
        );
      },
    },
    {
      id: "status",
      accessorFn: (row) => (row.banned ? "banned" : "active"),
      header: () => <span>{t("admin.users.col.status")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        if (row.banned) {
          return (
            <Badge variant="destructive">
              {t("admin.users.status.banned")}
            </Badge>
          );
        }
        if (!row.emailVerified) {
          return (
            <Badge variant="outline">
              {t("admin.users.status.unverified")}
            </Badge>
          );
        }
        return (
          <Badge variant="secondary">{t("admin.users.status.active")}</Badge>
        );
      },
    },
    updatedColumn<UserDirectoryRow>({
      label: t("admin.users.col.joined"),
      lang,
      access: (row) => row.createdAt,
    }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx) => {
        const row = ctx.row.original;
        if (!mayModerate(row)) return null;

        return (
          <Button
            type="button"
            variant={row.banned ? "outline" : "destructive"}
            size="sm"
            disabled={pending}
            onClick={() => toggleBan(row)}
          >
            {row.banned
              ? t("admin.users.action.unban")
              : t("admin.users.action.ban")}
          </Button>
        );
      },
    },
  ];

  const pendingRoleLabel = pendingRole ? roleLabels[pendingRole.role] : "";
  const pendingUserName = pendingRole?.row.name ?? "";

  /** Builds a href preserving the search while changing the page. */
  const pageHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (query.trim()) sp.set("q", query.trim());
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <p className="text-muted-foreground text-xs">
        {t(`admin.users.scope.${scope}`)}
      </p>

      <form
        className="space-y-3"
        action="/admin/users"
        // Server-side search: submitting navigates and the PAGE re-queries the
        // database. No client filtering of a fully-loaded table.
      >
        <label
          className="text-muted-foreground block text-xs font-medium"
          htmlFor="directory-search"
        >
          {t("admin.users.search.label")}
        </label>
        <Input
          id="directory-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("admin.users.search.placeholder")}
          className="max-w-md"
        />
        <Button type="submit" size="sm" variant="secondary">
          {t("admin.users.search.label")}
        </Button>
      </form>

      <DataTable columns={columns} data={rows} pageSize={pageSize} />

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("admin.users.empty")}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          {t("admin.users.pager.page")} {page} {t("admin.users.pager.of")}{" "}
          {totalPages} · {total} {t("admin.users.pager.total")}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={pageHref(page - 1)} />}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("admin.users.pager.prev")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("admin.users.pager.prev")}
            </Button>
          )}
          {page < totalPages ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={pageHref(page + 1)} />}
            >
              {t("admin.users.pager.next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {t("admin.users.pager.next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={pendingRole !== null}
        onOpenChange={(open) => !open && !pending && setPendingRole(null)}
      >
        <DialogContent dir={ADMIN_SHELL_DIR} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.users.confirm.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.confirm.description")}
              <span className="text-foreground block pt-2 font-medium">
                {pendingUserName} · {pendingRoleLabel}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-end px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setPendingRole(null)}
            >
              {t("admin.crud.cancel")}
            </Button>
            <Button
              type="button"
              variant={pendingRole?.role === "user" ? "destructive" : "default"}
              size="sm"
              disabled={pending}
              onClick={() => void changeRole()}
            >
              {t("admin.users.confirm.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
