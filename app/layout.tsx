import Footer from "@/components/footer/footer";
import NewsletterSectionWrapper from "@/components/footer/NewsLetterSectionWrapper";
import Navbar from "@/components/navbar/Navbar";
import SmoothScroll from "@/components/smoothScroll";
import PageLoader from "@/components/ui/PageLoader";
import { PageLoadInitializer } from "@/components/ui/PageLoadInitializer";
import PageTransition from "@/components/ui/PageTransition";
import Preloader from "@/components/ui/Preloader";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { type Language } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  title: "Henge | Italian Design Furniture",
  description:
    "Unveil timeless design. Henge: Italian furniture that transcends trends. Handcrafted for enduring beauty, each piece elevates your space. Explore Henge's legacy of exceptional Italian craftsmanship.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedLang = cookieStore.get("henge-lang")?.value;
  const initialLang: Language = savedLang === "fa" ? "fa" : "en";
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
      )}
    >
      <body
        className="no-scrollbar bg-background text-background-secondary flex min-h-full flex-col font-sans text-sm leading-normal md:text-base"
      >
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
