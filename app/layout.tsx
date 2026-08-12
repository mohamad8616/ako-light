import Footer from "@/components/footer/footer";
import NewsletterSection from "@/components/footer/newsLetterSection";
import Navbar from "@/components/navbar/Navbar";
import PageTransition from "@/components/ui/PageTransition";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { Metadata } from "next";
import { Oswald, Vazirmatn } from "next/font/google";
import "./globals.css";

export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-oswald",
});

export const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
});

export const metadata: Metadata = {
  title: "Henge | Italian Design Furniture",
  description:
    "Unveil timeless design. Henge: Italian furniture that transcends trends. Handcrafted for enduring beauty, each piece elevates your space. Explore Henge's legacy of exceptional Italian craftsmanship.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${oswald.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-white">
        <LanguageProvider>
          <Navbar />
          <PageTransition>{children}</PageTransition>
          <NewsletterSection />
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}