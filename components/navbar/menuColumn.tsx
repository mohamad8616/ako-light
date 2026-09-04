"use client";

import { EASE } from "@/utility/HomepageSection";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MenuLink } from "../header/data";
import UnderLineEffect from "../ui/UnderLineEffect";

// Stagger between the links inside one column.
const LINK_STAGGER = 0.07;

interface Props {
  titleKey: string;
  links: MenuLink[];
  delay: number;
  /** Base delay for the link reveal — starts once the menu panel has landed. */
  linksDelay?: number;
  onLinkClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function MenuColumn({
  titleKey,
  links,
  delay,
  linksDelay = delay,
  onLinkClick,
}: Props) {
  const { t, lang } = useLanguage();

  // Noora for Persian, DinNext (default) for English - full static strings
  // so Tailwind can keep both classes.
  const fontForLang = lang === "fa" ? "font-noora" : "font-din";
  const LinkStyles = `text-sm ${fontForLang} text-white transition-colors duration-300 hover:text-neutral-400 md:text-lg`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay,
      }}
    >
      <h2 className={`${fontForLang} mb-5 text-[20px] tracking-tighter text-white/35 uppercase md:mb-6 md:text-[28px]`}>
        {t(titleKey)}
      </h2>

      <ul className="flex flex-col space-y-3 md:space-y-4">
        {links.map((item, i) => {
          const isExternal = item.href.startsWith("http");
          const linkKey = item.i18nKey;

          // Same reveal as HeroSectionText: the link starts hidden below its
          // own slot (y: 110%) inside an overflow-hidden clip, then slides up
          // into place after the menu panel has arrived.
          return (
            <li
              key={item.label}
              // pb-* keeps the UnderLineEffect (-bottom-1) inside the
              // overflow-hidden clip — without it the underline is cut off.
              className="overflow-hidden pb-1.5"
            >
              <motion.div
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                exit={{
                  y: "110%",
                  // Close: slide straight back down (staggered) before the
                  // panel starts leaving — the enter delay above must not
                  // apply to the exit.
                  transition: {
                    duration: 0.3,
                    delay: i * 0.04,
                    ease: EASE,
                  },
                }}
                transition={{
                  duration: 0.7,
                  delay: linksDelay + i * LINK_STAGGER,
                  ease: EASE,
                }}
                className="group relative w-fit"
              >
                {isExternal ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onLinkClick}
                    className={LinkStyles}
                  >
                    {t(linkKey)}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onLinkClick}
                    className={LinkStyles}
                  >
                    {t(linkKey)}
                  </Link>
                )}
                <UnderLineEffect duration="1000" color={"bg-white/35"} />
              </motion.div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
