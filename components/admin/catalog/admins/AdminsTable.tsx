"use client";

import { updatedColumn } from "@/components/admin/catalog/columns";
import { useCrudSubmit } from "@/components/admin/catalog/useCrudSubmit";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setUserBannedAction,
  setUserRoleAction,
} from "@/lib/admin/actions/admins";
import { ASSIGNABLE_ROLES } from "@/lib/admin/schemas/admin-user";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { AdminUserRow } from "@/lib/repositories/admin-users";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";

/**
 * The `/admin/admins` table — the owner's user-management screen.
 *
 * Every mutation goes through a server action that re-runs
 * `requireOwnerAccess()`, so this component's role/ban controls are conveniences,
 * not the security boundary (a direct POST still hits the gate).
 *
 * Two safety behaviours are enforced in the UI as well:
 *   - the OWNER'S OWN row renders its role/status as read-only (with the
 *     `admin.admins.self.hint` note), mirroring the server-side self-target
 *     rejection;
 *   - only `user`/`admin` are offered as assignable roles — the owner role is
 *     never grantable here, and a row that already holds `owner` shows a static
 *     badge rather than a select.
 *
 * Feedback goes through the shared `useCrudSubmit` hook, so success/failure
 * raises the same sonner toast as every other admin mutation.
 */
export function AdminsTable({
  rows,
  currentUserId,
}: {
  rows: AdminUserRow[];
  /**
   * The signed-in owner's id. Used ONLY to render their own row read-only;
   * authorization itself is enforced server-side.
   */
  currentUserId?: string;
}) {
  const { t, lang } = useLanguage();
  const { run, pending } = useCrudSubmit();

  const roleLabels: Record<string, string> = {
    user: t("admin.admins.role.user"),
    admin: t("admin.admins.role.admin"),
    owner: t("admin.admins.role.owner"),
  };

  const changeRole = (row: AdminUserRow, nextRole: "user" | "admin") =>
    run(() => setUserRoleAction({ userId: row.id, role: nextRole }), {
      successMessage: t("admin.admins.role.updated"),
    });

  const toggleBan = (row: AdminUserRow) =>
    run(() => setUserBannedAction({ userId: row.id, banned: !row.banned }), {
      successMessage: t("admin.admins.status.updated"),
    });

  const columns: ColumnDef<AdminUserRow, unknown>[] = [
    {
      id: "user",
      accessorFn: (row) => `${row.name} ${row.email}`,
      header: () => <span>{t("admin.admins.col.user")}</span>,
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
      header: () => <span>{t("admin.admins.col.role")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        const isSelf = row.id === currentUserId;

        // The owner role is never assignable here, and the caller may not
        // change their own role → both render a static badge.
        if (row.role === "owner" || isSelf) {
          return (
            <div className="flex flex-col gap-1">
              <Badge variant={row.role === "owner" ? "default" : "secondary"}>
                {roleLabels[row.role]}
              </Badge>
              {isSelf ? (
                <span className="text-muted-foreground text-[10px]">
                  {t("admin.admins.self.hint")}
                </span>
              ) : null}
            </div>
          );
        }

        return (
          <Select
            items={Object.fromEntries(
              ASSIGNABLE_ROLES.map((value) => [value, roleLabels[value]]),
            )}
            value={row.role}
            disabled={pending}
            onValueChange={(value) =>
              changeRole(row, value as "user" | "admin")
            }
          >
            <SelectTrigger className="w-32" aria-label={t("admin.admins.col.role")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={ADMIN_SHELL_DIR}>
              {ASSIGNABLE_ROLES.map((value) => (
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
      header: () => <span>{t("admin.admins.col.phone")}</span>,
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
      header: () => <span>{t("admin.admins.col.status")}</span>,
      cell: (ctx) => {
        const row = ctx.row.original;
        if (row.banned) {
          return (
            <Badge variant="destructive">{t("admin.admins.status.banned")}</Badge>
          );
        }
        if (!row.emailVerified) {
          return (
            <Badge variant="outline">
              {t("admin.admins.status.unverified")}
            </Badge>
          );
        }
        return <Badge variant="secondary">{t("admin.admins.status.active")}</Badge>;
      },
    },
    updatedColumn<AdminUserRow>({
      label: t("admin.admins.col.joined"),
      lang,
      access: (row) => row.createdAt,
    }),
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: (ctx) => {
        const row = ctx.row.original;
        const isSelf = row.id === currentUserId;
        // The caller may not ban themselves either.
        if (isSelf) return null;

        return (
          <Button
            type="button"
            variant={row.banned ? "outline" : "destructive"}
            size="sm"
            disabled={pending}
            onClick={() => toggleBan(row)}
          >
            {row.banned
              ? t("admin.admins.action.unban")
              : t("admin.admins.action.ban")}
          </Button>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={rows} />;
}
