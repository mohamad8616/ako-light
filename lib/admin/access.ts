import { ADMIN_ROLES, ROLES, type AppRole } from "@/lib/auth/permissions";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server-side admin access helpers — the *other* half of the role gate that
 * `proxy.ts` performs at the edge.
 *
 * Why both layers:
 *   - `proxy.ts` blocks the request before any rendering (fast, but its logic
 *     lives outside the React tree and is easiest to regress silently).
 *   - These helpers run inside the React tree (layout/pages), so they are the
 *     guaranteed backstop: even if the proxy rule is ever loosened, a page
 *     rendered without the required role simply redirects instead of leaking.
 *
 * Both helpers resolve the better-auth session from the request cookies and
 * `redirect()` (never return) when access is denied, so call sites can treat
 * a successful return as "authorized".
 */

/** The signed-in user's role, or undefined when not signed in. */
export async function getAdminRole(): Promise<AppRole | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role;
  return ADMIN_ROLES.includes(role as AppRole) ? (role as AppRole) : undefined;
}

/**
 * Gate for every admin route: the visitor must be signed in with an
 * admin-level role (`admin` or `owner` — see ADMIN_ROLES). Anything else
 * (anonymous or plain `user`) lands on the sign-in page with an
 * access-denied message rendered above the form.
 */
export async function requireAdminAccess(): Promise<AppRole> {
  const role = await getAdminRole();
  if (!role) {
    redirect("/sign-in?denied=1");
  }
  return role;
}

/**
 * Gate for owner-only routes (e.g. /admin/admins). An `admin` that reaches
 * this point is bounced back to the dashboard — deliberately not to the
 * sign-in page, because they *are* signed in and authorized for the shell.
 */
export async function requireOwnerAccess(): Promise<"owner"> {
  const role = await getAdminRole();
  if (!role) {
    redirect("/sign-in?denied=1");
  }
  if (role !== ROLES.owner) {
    redirect("/admin");
  }
  return role as "owner";
}
