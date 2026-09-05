import Footer from "@/components/footer/footer";
import NewsletterSectionWrapper from "@/components/footer/NewsLetterSectionWrapper";
import Navbar from "@/components/navbar/Navbar";
import SmoothScroll from "@/components/smoothScroll";
import PageLoader from "@/components/ui/PageLoader";
import { PageLoadInitializer } from "@/components/ui/PageLoadInitializer";
import PageTransition from "@/components/ui/PageTransition";
import Preloader from "@/components/ui/Preloader";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { type Language, translations } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";

const jetBrainsMono = localFont({
  src: [
    {
      path: "../public/fonts/JetBrainsMono-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/JetBrainsMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains-mono",
});

const dinNextLTPro = localFont({
  src: "../public/fonts/dinnextltpro.woff2",
  variable: "--font-dinnext",
});

const noora = localFont({
  src: [
    {
      path: "../public/fonts/noora/Noora-ExtraLight.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/noora/Noora-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/noora/Noora-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/noora/Noora-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/noora/Noora-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/noora/Noora-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/noora/Noora-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-noora",
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("henge-lang")?.value;
  const lang: Language =
    cookieLang === "fa" || cookieLang === "en" ? cookieLang : "en";

  const t = translations[lang];

  return {
    title: {
      default: t["page.home.title"],
      template: `%s`,
    },
    description: t["page.home.description"],
    alternates: {
      languages: {
        "en-US": "/en",
        "fa-IR": "/fa",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedLang = cookieStore.get("henge-lang")?.value;
  const initialLang: Language =
    savedLang === "fa" || savedLang === "en" ? savedLang : "en";
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
          <LanguageProvider initialLang={initialLang}>
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
