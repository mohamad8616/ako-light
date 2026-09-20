import SignInForm from "@/components/signIn";
import { translations } from "@/lib/i18n/translations";
import { isLocale } from "@/lib/i18n/routing";
import { notFound } from "next/navigation";

/**
 * Sign-in route — `/sign-in` for Persian and `/en/sign-in` for English.
 *
 * URL map (see lib/i18n/routing.ts and the proxy in proxy.ts):
 *   /sign-in     fa, canonical and unprefixed: the proxy rewrites it to
 *                /fa/sign-in so this [locale] page renders while the address
 *                bar stays clean.
 *   /en/sign-in  en, the explicit English tree.
 *   /fa/sign-in  308 redirect to /sign-in (/fa is not canonical).
 *
 * This path is also the auth hand-off: proxy.ts lets it through
 * unauthenticated, and when it blocks a protected page it redirects here with
 * `?redirectTo=<path>` (e.g. /sign-in?redirectTo=%2Fadmin). After a successful
 * sign-in the form navigates back there, but only if the value is a same-origin
 * path — see readRedirectTo in components/signIn/useSignInForm.ts.
 *
 * A `?denied=1` param is appended by proxy.ts / lib/admin/access.ts when a
 * *signed-in* user without the admin/owner role tried to open an /admin URL:
 * the banner below explains why the dashboard is out of reach.
 *
 * Instructions:
 *   - Keep this a server component. `components/signIn` is the client family
 *     (hook, toggles, fields); importing it is enough, and adding "use client"
 *     here would drop server rendering for no benefit.
 *   - Page metadata/SEO comes from app/[locale]/layout.tsx, not from here.
 *   - To change the page frame (background, max width, vertical rhythm) edit
 *     the <main> below; the card owns its own width, radius and padding.
 *   - To try the redirect flow manually: log out, then open a protected URL
 *     (e.g. /admin) — you should land on /sign-in?redirectTo=%2Fadmin.
 */
export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const t = translations[locale];
  const denied = query.denied === "1" || query.denied === "true";

  return (
    <main className="bg-background mt-24 lg:mt-32 text-background-secondary flex min-h-screen items-center justify-center px-4 py-16">
      <div className="flex w-full flex-col items-center gap-4">
        {denied ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive w-full max-w-md rounded-lg border px-4 py-3 text-sm"
          >
            <p className="font-medium">{t["admin.access.denied.title"]}</p>
            <p className="text-destructive/90 mt-1 leading-relaxed">
              {t["admin.access.denied.description"]}
            </p>
          </div>
        ) : null}
        <SignInForm />
      </div>
    </main>
  );
}
