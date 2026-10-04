"use client";

import { useLanguage } from "./LanguageProvider";
import { getLocalizedPath } from "./routing";
import NextLink from "next/link";
import type { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof NextLink>;

/**
 * Locale-aware drop-in replacement for `next/link`.
 *
 * Internal string hrefs (starting with a single "/") are rewritten to the
 * active route locale:
 *
 *   current locale en: href="/about"      → "/about"
 *   current locale fa: href="/about"      → "/fa/about"
 *
 * External URLs, anchors (#...) and non-string hrefs pass through untouched.
 * The `lang` comes from the URL via LanguageProvider, so every internal link
 * on a /fa page automatically keeps the /fa prefix.
 */
export default function Link({ href, ...rest }: LinkProps) {
  const { lang } = useLanguage();

  if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) {
    return <NextLink href={getLocalizedPath(href, lang)} {...rest} />;
  }

  return <NextLink href={href} {...rest} />;
}
