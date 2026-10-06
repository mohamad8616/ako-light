/**
 * Shared user-directory reads for `/admin/users` — the admin/owner support
 * screen.
 *
 * ── Privacy boundary ─────────────────────────────────────────────────────────
 *
 * This module never selects, joins, or returns authentication material. The
 * `User` model has no password column at all; credentials live on `Account`
 * (`password`, `accessToken`, `refreshToken`, `idToken`) and `Session` (`token`,
 * `ipAddress`, `userAgent`). Those relations are simply not part of the
 * `select` below, so password hashes, session tokens, verification rows and
 * OAuth credentials are structurally unreachable from this path — not hidden
 * in the UI, absent from the query.
 *
 * The projection is EXPLICIT (`select`, never `include`, never `...user`), and
 * the DTO is plain JSON (Dates become ISO strings) so nothing unusual crosses
 * the RSC boundary.
 *
 * ── Scope ────────────────────────────────────────────────────────────────────
 *
 * The directory lists CUSTOMERS (role `user`) — the accounts an operator
 * supports. `owner` accounts are excluded outright, and `admin` accounts are
 * out of scope too (staff management is the owner's `/admin/admins` screen).
 * That keeps this screen least-privilege: an operator sees customers, not the
 * staff roster.
 *
 * ── Scale ────────────────────────────────────────────────────────────────────
 *
 * Search and pagination happen in the DATABASE (`where` + `skip`/`take`); the
 * whole table is never loaded into the browser. `getUserDirectoryPage` returns
 * one page plus a total count.
 */
import { ROLES, type AppRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { cache } from "react";

/** Default / maximum page size — clamped so a client cannot request everything. */
export const USER_DIRECTORY_PAGE_SIZE = 20;
export const USER_DIRECTORY_MAX_PAGE_SIZE = 100;

/**
 * One directory row — a plain, serializable DTO.
 *
 * Deliberately excludes: password / password hash (on Account), session tokens,
 * verification/reset tokens, OAuth access/refresh tokens, `referredByCode`, and
 * every other field this support screen does not need.
 */
export interface UserDirectoryRow {
  id: string;
  name: string;
  email: string;
  /** Narrowed so the UI can render a type-safe badge; unknown → `user`. */
  role: AppRole;
  phoneNumber: string | null;
  banned: boolean;
  emailVerified: boolean;
  /** ISO timestamp — Dates never cross the RSC boundary. */
  createdAt: string;
}

export interface UserDirectoryPage {
  rows: UserDirectoryRow[];
  /** Total matching rows, for the pager. */
  total: number;
  page: number;
  pageSize: number;
}

const KNOWN_ROLES: readonly AppRole[] = [ROLES.user, ROLES.admin, ROLES.owner];

function normalizeRole(value: string): AppRole {
  return KNOWN_ROLES.includes(value as AppRole)
    ? (value as AppRole)
    : ROLES.user;
}

/**
 * The ONE projection used by every directory read. Centralised so a future
 * field cannot be added to one query and forgotten in another — and so a
 * reviewer can audit the privacy boundary in a single place.
 */
const DIRECTORY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phoneNumber: true,
  banned: true,
  emailVerified: true,
  createdAt: true,
} as const;

/** Roles this directory is allowed to show: customers only. */
const DIRECTORY_ROLES: readonly string[] = [ROLES.user];

function mapRow(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  phoneNumber: string | null;
  banned: boolean;
  emailVerified: boolean;
  createdAt: Date;
}): UserDirectoryRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    phoneNumber: row.phoneNumber,
    banned: row.banned,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Builds the `where` clause for the directory: customers only, optionally
 * narrowed by a case-insensitive name/email search. Exported for testing so the
 * role restriction and the search shape can be asserted without a database.
 */
export function buildDirectoryWhere(search?: string) {
  const query = search?.trim();
  return {
    role: { in: [...DIRECTORY_ROLES] },
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

/**
 * One page of the customer directory, newest first.
 *
 * `page` is 1-based and clamped to a sane range; `pageSize` is clamped to
 * `USER_DIRECTORY_MAX_PAGE_SIZE` so a crafted request cannot stream the whole
 * table. Search + pagination are both evaluated by Postgres.
 */
export const getUserDirectoryPage = cache(
  async (args: {
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<UserDirectoryPage> => {
    const pageSize = Math.min(
      Math.max(1, Math.trunc(args.pageSize ?? USER_DIRECTORY_PAGE_SIZE)),
      USER_DIRECTORY_MAX_PAGE_SIZE,
    );
    const page = Math.max(1, Math.trunc(args.page ?? 1));
    const where = buildDirectoryWhere(args.search);

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: DIRECTORY_SELECT,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      rows: rows.map(mapRow),
      total,
      page,
      pageSize,
    };
  },
);

/**
 * A single directory row by id, or null when the account is not a customer
 * (staff, owner, or missing). Used by the server actions as a second, authoritative
 * read of the TARGET's current role before any write — never trust the role the
 * client sent.
 */
export async function getUserDirectoryTarget(
  userId: string,
): Promise<UserDirectoryRow | null> {
  // `findFirst`, not `findUnique`: the role restriction is a WHERE filter, and
  // `findUnique` only accepts unique-field selectors.
  const row = await prisma.user.findFirst({
    where: { id: userId, role: { in: [...DIRECTORY_ROLES] } },
    select: DIRECTORY_SELECT,
  });
  return row ? mapRow(row) : null;
}
