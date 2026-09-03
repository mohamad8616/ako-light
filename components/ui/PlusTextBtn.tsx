import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Link from "next/link";
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

const BUTTON_CLASSES =
  "group flex inline shrink-0 cursor-pointer items-center gap-2 text-sm uppercase tracking-[0.15em] transition duration-300 flex items-center sm:inline-flex";

// The SVG is a fixed-size block element centered by its flex wrapper, so its
// center coincides with the wrapper center and rotating it stays in place.
// strokes are inset off the viewBox edges so they are not clipped/shifted.
const PlusIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 14 14"
    className="block shrink-0"
  >
    <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
