import CartResetOnPaidOrder from "@/components/cart/CartResetOnPaidOrder";
import SmoothScroll from "@/components/smoothScroll";
import { PageLoadInitializer } from "@/components/ui/PageLoadInitializer";
import { readCartResetSignal } from "@/lib/cart/reset-signal";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import {
  defaultLocale,
  getLocalizedPath,
  isLocale,
  locales,
  type Locale,
} from "@/lib/i18n/routing";
import { shellTranslations } from "@/lib/i18n/shell-translations";
import { translations } from "@/lib/i18n/translations";
import { getSiteSettings } from "@/lib/repositories/site-settings";
import { siteName, siteUrl } from "@/lib/seo/config";
import {
  jsonLdScript,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/lib/seo/structuredData";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import "../globals.css";

const jetBrainsMono = localFont({
  src: [
    {
      path: "../../public/fonts/JetBrainsMono-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrainsMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains-mono",
});

const dinNextLTPro = localFont({
  src: "../../public/fonts/dinnextltpro.woff2",
  variable: "--font-dinnext",
});

const noora = localFont({
  src: [
    {
      path: "../../public/fonts/noora/Noora-ExtraLight.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/noora/Noora-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/noora/Noora-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/noora/Noora-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/noora/Noora-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/noora/Noora-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/noora/Noora-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-noora",
});

/**
 * The URL is the source of truth for the active locale:
 *
 *   /about      -> en (unprefixed -- English is the primary language)
 *   /fa/about   -> fa
 *
 * The proxy rewrites unprefixed URLs to /en/... internally, so every request
 * that reaches this layout has a valid locale param. Both locales are still
 * prerendered; only which one is prefixed changed.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Only the two known locales are valid route params; anything else 404s.
export const dynamicParams = false;

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang: Locale = isLocale(locale) ? locale : "fa";
  const t = translations[lang];
  const homePath = "/";

  // Pass 13.5D — admin-managed defaults.
  //
  // PRIORITY IS UNCHANGED: these are DEFAULTS on the root layout, and every
  // page's own `metadata` still wins over them (Next merges child over parent
  // field by field). A null settings row — a fresh database — leaves every
  // value exactly as it was before this pass, which is what keeps the SEO
  // system untouched.
  const settings = await getSiteSettings();
  const brand = settings ? pick(settings.siteName, lang).trim() : "";
  const description = settings
    ? pick(settings.siteDescription, lang).trim()
    : "";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      // Home title is brand-complete; child pages get "| <brand>".
      default: brand || t["page.home.title"],
      template: `%s | ${brand || siteName}`,
    },
    description: description || t["page.home.description"],
    // A custom favicon replaces the static app/favicon.ico; with none set the
    // file convention keeps serving the built-in one.
    ...(settings?.faviconUrl
      ? { icons: { icon: settings.faviconUrl, shortcut: settings.faviconUrl } }
      : {}),
    alternates: {
      canonical: getLocalizedPath(homePath, lang),
      languages: {
        "fa-IR": getLocalizedPath(homePath, "fa"),
        "en-US": getLocalizedPath(homePath, "en"),
        "x-default": getLocalizedPath(homePath, defaultLocale),
      },
    },
    openGraph: {
      title: brand || t["page.home.title"],
      description: description || t["page.home.description"],
      url: getLocalizedPath(homePath, lang),
      siteName,
      locale: lang === "fa" ? "fa_IR" : "en_US",
      alternateLocale: lang === "fa" ? "en_US" : "fa_IR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const initialLang: Locale = locale;
  const initialDir = initialLang === "fa" ? "rtl" : "ltr";

  // Global structured data, emitted once per page (server-rendered).
  const siteDescription = translations[initialLang]["page.home.description"];
  const homeUrl = `${siteUrl}${getLocalizedPath("/", initialLang)}`;
  const org = organizationJsonLd(siteName, siteDescription);
  const webSite = webSiteJsonLd(
    siteName,
    siteDescription,
    homeUrl,
    org,
  );

  // Set server-side by the checkout callback only after a payment is durably
  // recorded as paid. Passed down so the cart can be emptied on whichever page
  // the customer next loads — not merely on the callback page. See
  // lib/cart/reset-signal.ts.
  const cartResetOrderId = await readCartResetSignal();

  return (
    <html
      lang={initialLang}
      dir={initialDir}
      data-scroll-behavior="smooth"
      className={cn(
        "h-full",
        "antialiased",
        jetBrainsMono.variable,
        dinNextLTPro.variable,
        "font-sans",
        noora.variable,
      )}
    >
      <body className="no-scrollbar bg-background text-background-secondary flex min-h-full flex-col font-sans text-sm leading-normal md:text-base">
        <PageLoadInitializer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(org) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(webSite) }}
        />
        <SmoothScroll>
          {/* The SHELL dictionary, not the full public one: this layout wraps
              BOTH route groups, and the only consumer above them is
              app/[locale]/not-found.tsx. (site) and (admin) each re-provide the
              dictionary their own subtree needs, so the full public dictionary
              never has to reach the client for an admin route. See
              lib/i18n/shell-translations.ts. */}
          <LanguageProvider
            locale={initialLang}
            dictionary={shellTranslations[initialLang]}
          >
            {/* Clears the persisted cart when a payment for this order has
                succeeded. Renders nothing. */}
            <CartResetOnPaidOrder paidOrderId={cartResetOrderId} />
            {children}
          </LanguageProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
