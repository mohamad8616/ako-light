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
  "group inline shrink-0 cursor-pointer items-center gap-2 text-sm uppercase tracking-[0.15em] transition duration-300 sm:inline-flex";
const ICON_CLASSES =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90";

const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
    <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const PlusTextBtn = (props: PlusTextBtnProps) => {
  const { dir } = useLanguage();
  const { className, text, textColor, ...rest } = props;
  const resolvedTextColor = textColor ?? "text-white";
  const TEXT_CLASSES = `duration-300 group-hover:${dir === "rtl" ? "translate-x-1.5" : "-translate-x-1.5"}`;
  const classNames = [BUTTON_CLASSES, resolvedTextColor, className]
    .filter(Boolean)
    .join(" ");

  const content: ReactNode = (
    <>
      <span className={`${ICON_CLASSES} ${resolvedTextColor}`}>
        <PlusIcon />
      </span>
      <span className={`${TEXT_CLASSES} ${resolvedTextColor}`}>{text}</span>
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
