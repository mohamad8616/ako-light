"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MenuLink } from "../header/data";
import UnderLineEffect from "../ui/UnderLineEffect";

// ----- animation timing (seconds) -----

/** Stagger between links inside one column on entry. */
const LINK_STAGGER = 0.07;
/** Per-link exit stagger (used as the column leaves). */
const LINK_EXIT_STAGGER = 0.04;
/** Entry duration for each link. */
const LINK_ENTER_DURATION = 0.2;
/** Exit duration for each link. */
const LINK_EXIT_DURATION = 0.3;
/** Column entry duration. */
const COLUMN_ENTER_DURATION = 0.35;

interface Props {
  titleKey: string;
  links: MenuLink[];
  /** Delay before the column title appears. */
  delay: number;
  /** Delay before the links start revealing. Defaults to `delay`. */
  linksDelay?: number;
  onLinkClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * One column in the fullscreen menu: a title + a list of links.
 *
 * The column title fades + slides up; each link is wrapped in an
 * `overflow-hidden` clip and slides up from below — same reveal style
 * as `HeroSectionText`.
 */
export default function MenuColumn({
  titleKey,
  links,
  delay,
  linksDelay = delay,
  onLinkClick,
}: Props) {
  const { t, lang } = useLanguage();

  // Persian uses Noora; everything else uses DinNext (the page default).
  // Both classes are listed so Tailwind keeps them in its generated CSS.
  const fontForLang = lang === "fa" ? "font-noora" : "font-din";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: COLUMN_ENTER_DURATION, delay }}
    >
      <h2
        className={`${fontForLang} mb-5 text-[20px] tracking-tighter text-white/35 uppercase md:mb-6 md:text-[28px]`}
      >
        {t(titleKey)}
      </h2>

      <ul className="flex flex-col space-y-3 md:space-y-4">
        {links.map((item, i) => (
          <li
            key={item.label}
            // `pb-*` keeps the UnderLineEffect (`-bottom-1`) inside the
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
                  duration: LINK_EXIT_DURATION,
                  delay: i * LINK_EXIT_STAGGER,
                  ease: EASE,
                },
              }}
              transition={{
                duration: LINK_ENTER_DURATION,
                delay: linksDelay + i * LINK_STAGGER,
                ease: EASE,
              }}
              className="group relative w-fit"
            >
              <LinkItem
                item={item}
                onClick={onLinkClick}
                fontClass={fontForLang}
                t={t}
              />
              <UnderLineEffect duration="1000" color="bg-white/35" />
            </motion.div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ----- internal -----

/** Renders either a Next `Link` or an external `<a>` based on the href. */
function LinkItem({
  item,
  onClick,
  fontClass,
  t,
}: {
  item: MenuLink;
  onClick?: () => void;
  fontClass: string;
  t: (key: string) => string;
}) {
  const isExternal = item.href.startsWith("http");
  const className = `text-sm ${fontClass} text-white transition-colors duration-300 hover:text-neutral-400 md:text-lg`;

  if (isExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        {t(item.i18nKey)}
      </a>
    );
  }

  return (
    <Link href={item.href} onClick={onClick} className={className}>
      {t(item.i18nKey)}
    </Link>
  );
}
