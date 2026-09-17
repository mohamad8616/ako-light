import SignInForm from "@/components/signIn";

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
export default function SignInPage() {
  return (
    <main className="bg-background-secondary text-foreground flex min-h-screen items-center justify-center px-4 py-16">
      <SignInForm />
    </main>
  );
}
