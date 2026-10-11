import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "@/lib/i18n/Link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

type PlusTextBtnBase = {
  className?: string;
  text: string;
  textColor?: string;
};

type PlusTextBtnLinkProps = PlusTextBtnBase &
  Omit<ComponentProps<typeof Link>, "className"> & { href: string };

type PlusTextBtnProps =
  | PlusTextBtnLinkProps
  | (PlusTextBtnBase &
      ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined });

// inline-flex on ALL sizes so the icon and text stay flex-centered together on
// mobile too — a base `inline`/`flex` conflict made <sm screens drop flexbox
// centering and misalign the icon against the text baseline.
const BUTTON_CLASSES =
  "group inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm uppercase transition-all duration-300 lg:text-base";

// The SVG is a fixed-size block element centered by its flex wrapper, so its
// center coincides with the wrapper center and rotating it stays in place.
// strokes are inset off the viewBox edges so they are not clipped/shifted.t
const PlusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 14 14" className="block shrink-0">
    <path
      d="M7 2V12M2 7H12"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const PlusTextBtn = (props: PlusTextBtnProps) => {
  const { dir } = useLanguage();
  const { className, text, textColor, ...rest } = props;
  const resolvedTextColor = textColor ?? "text-white";
  const isRtl = dir === "rtl";

  // Full static class strings so Tailwind can detect them at build time.
  // LTR: + rotates clockwise, text slides left
  // RTL: + rotates counter-clockwise, text slides right
  const iconClasses = [
    "flex shrink-0 items-center justify-center transition-transform duration-300 ease-in-out",
    isRtl ? "group-hover:-rotate-90" : "group-hover:rotate-90",
  ].join(" ");

  const textClasses = [
    "duration-300",
    isRtl ? "group-hover:translate-x-1" : "group-hover:-translate-x-1",
  ].join(" ");

  const classNames = [BUTTON_CLASSES, resolvedTextColor, className]
    .filter(Boolean)
    .join(" ");

  const content: ReactNode = (
    <>
      <span className={`${iconClasses} ${resolvedTextColor}`}>
        <PlusIcon />
      </span>
      <span className={`${textClasses} ${resolvedTextColor}`}>{text}</span>
    </>
  );

  if (props.href !== undefined) {
    // ── A DOWNLOAD MUST NOT GO THROUGH `Link` ────────────────────────────────
    //
    // The catalogue CTA can point at a same-origin route
    // (`/api/catalogue/cta`) that re-serves the uploaded PDF with
    // `Content-Disposition: attachment`, because a cross-origin storage URL is
    // rendered inline by the browser instead of downloaded.
    //
    // That href cannot survive `Link`: it prefixes any href starting with "/"
    // with the active locale, so the request would go to `/fa/api/...` and 404.
    // When a download name is supplied the CTA is therefore a PLAIN anchor,
    // which is also the only form in which the `download` attribute does
    // anything (it is ignored for cross-origin hrefs, and this one is
    // same-origin).
    if (props.download) {
      return (
        <a
          className={classNames}
          {...(rest as Omit<
            PlusTextBtnLinkProps,
            keyof PlusTextBtnBase | "href"
          >)}
          href={props.href}
          download={props.download}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={props.href}
        className={classNames}
        {...(rest as Omit<
          PlusTextBtnLinkProps,
          keyof PlusTextBtnBase | "href"
        >)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classNames}
      {...(rest as Omit<
        PlusTextBtnBase & ButtonHTMLAttributes<HTMLButtonElement>,
        keyof PlusTextBtnBase
      >)}
    >
      {content}
    </button>
  );
};

export default PlusTextBtn;
