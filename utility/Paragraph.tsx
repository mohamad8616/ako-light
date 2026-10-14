import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";

/**
 * The site's body paragraph.
 *
 * ── `break-words` is load-bearing, not decoration ───────────────────────────
 *
 * `overflow-wrap: break-word` is what stops a long UNBREAKABLE token from
 * painting outside the paragraph. Without it the browser has nowhere to wrap, so
 * the line runs past its box and past the viewport: the page gains a horizontal
 * scrollbar and the reader has to drag sideways to finish a sentence. An
 * operator pasting an ID, a URL, a hash or a run of test characters hits this
 * immediately, and it is invisible on ordinary prose — which is exactly why it
 * survived until someone typed one.
 *
 * It only changes the rendering of content that would otherwise overflow, so no
 * existing paragraph moves.
 */
export function Paragraph({
  children,
  className,
  textColor,
}: {
  children: React.ReactNode;
  className?: string;
  textColor?: string;
}) {
  const { lang } = useLanguage();
  return (
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
      className={` ${lang === "fa" ? "font-noora tracking-tight" : "font-din"} max-w-prose text-justify wrap-break-word text-[15px] leading-relaxed font-light text-pretty md:text-base ${className} ${textColor ?? "text-background/90"} `}
    >
      {children}
    </motion.p>
  );
}
