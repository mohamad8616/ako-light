"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MenuLink } from "./data";

interface Props {
  title: string;
  links: MenuLink[];
  delay: number;
}

export default function MenuColumn({ title, links, delay }: Props) {
  const { t } = useLanguage();

  const titleKey = `${title.toLowerCase()}` as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay,
      }}
    >
      <h2 className="mb-5 text-[28px] md:text-[56px] font-light uppercase text-zinc-700 tracking-tight">
        {t(titleKey)}
      </h2>

      <ul className="space-y-4 md:space-y-6">
        {links.map((item) => {
          const isExternal = item.href.startsWith("http");
          const linkKey = `${item.label
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")}` as const;

          return (
            <li key={item.label}>
              {isExternal ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="menu-link text-sm md:text-lg font-medium tracking-[0.12em] text-white transition-colors duration-300 hover:text-neutral-400"
                >
                  {t(linkKey)}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="menu-link text-sm md:text-lg font-medium tracking-[0.12em] text-white transition-colors duration-300 hover:text-neutral-400"
                >
                  {t(linkKey)}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}