import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type PlusTextBtnBase = {
  className?: string;
  text: string;
  textColor?: string;
};

type PlusTextBtnLinkProps = PlusTextBtnBase & Omit<ComponentProps<typeof Link>, "className"> & { href: string };

type PlusTextBtnProps =
  | PlusTextBtnLinkProps
  | (PlusTextBtnBase & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined });

const PlusTextBtn = (props: PlusTextBtnProps) => {
  if ("href" in props) {
    const { href, className, text, textColor, ...rest } = props as PlusTextBtnLinkProps;
    return (
      <Link
        href={href}
        className={`group inline shrink-0 items-center gap-2 text-sm tracking-[0.15em] text-white uppercase transition duration-300 sm:inline-flex ${className} ${textColor}`}
        {...rest}
      >
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90 ${textColor}`}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        <span className={`duration-300 group-hover:-translate-x-1.5 ${textColor}`}>
          {text}
        </span>
      </Link>
    );
  }

  const { className, text, textColor, ...rest } = props;
  return (
    <button
      className={`group inline shrink-0 cursor-pointer items-center gap-2 text-sm text-white uppercase transition duration-300 sm:inline-flex ${className} ${textColor}`}
      {...rest}
    >
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90 ${textColor}`}
      >
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <span className={`duration-300 group-hover:-translate-x-1.5 ${textColor}`}>
        {text}
      </span>
    </button>
  );
};

export default PlusTextBtn;
