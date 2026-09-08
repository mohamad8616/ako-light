import Footer from "@/components/footer/footer";
import NewsletterSectionWrapper from "@/components/footer/NewsLetterSectionWrapper";
import Navbar from "@/components/navbar/Navbar";
import SmoothScroll from "@/components/smoothScroll";
import PageLoader from "@/components/ui/PageLoader";
import { PageLoadInitializer } from "@/components/ui/PageLoadInitializer";
import PageTransition from "@/components/ui/PageTransition";
import Preloader from "@/components/ui/Preloader";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getLocalizedPath, isLocale, type Locale } from "@/lib/i18n/routing";
import { translations } from "@/lib/i18n/translations";
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
 *   /about      â†’ fa (unprefixed â€” Persian is the primary language)
 *   /en/about   â†’ en
 *
 * The proxy rewrites unprefixed URLs to /fa/... internally, so every request
 * that reaches this layout has a valid locale param.
 */
export function generateStaticParams() {
  return [{ locale: "fa" }, { locale: "en" }];
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

  return {
    title: {
      default: t["page.home.title"],
      template: `%s`,
    },
    description: t["page.home.description"],
    alternates: {
      languages: {
        "en-US": getLocalizedPath("/", "en"),
        "fa-IR": "/",
      },
    },
    openGraph: {
      title: t["page.home.title"],
      description: t["page.home.description"],
      locale: lang === "fa" ? "fa_IR" : "en_US",
      alternateLocale: lang === "fa" ? "en_US" : "fa_IR",
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
        <SmoothScroll>
          <LanguageProvider locale={initialLang}>
            <Navbar />
            <PageLoader />
            <Preloader />
            <PageTransition>{children}</PageTransition>
            <NewsletterSectionWrapper />
            <Footer />
          </LanguageProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
