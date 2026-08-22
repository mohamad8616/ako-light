"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MenuLink } from "../header/data";
import UnderLineEffect from "../ui/UnderLineEffect";

interface Props {
  titleKey: string;
  links: MenuLink[];
  delay: number;
  onLinkClick?: () => void;
}

const LinkStyles =
  "text-sm font-din  text-white transition-colors duration-300 hover:text-neutral-400 md:text-lg";

export default function MenuColumn({
  titleKey,
  links,
  delay,
  onLinkClick,
}: Props) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay,
      }}
    >
      <h2 className="mb-5 text-[20px] font-din tracking-tighter text-white/35 uppercase md:mb-6 md:text-[28px]">
        {t(titleKey)}
      </h2>

      <ul className="flex flex-col space-y-3 md:space-y-4">
        {links.map((item) => {
          const isExternal = item.href.startsWith("http");
          const linkKey = item.i18nKey;

          return (
            <li key={item.label} className="group relative w-fit">
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
              <UnderLineEffect duration="1000" color = {'bg-white/35'}/>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
