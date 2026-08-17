import Link from "next/link";

const PlusTextBtn = ({
  href,
  className,
  text,
  textColor,
}: {
  href?: string;
  className?: string;
  text: string;
  textColor?: string;
}) => {
  if (href) {
    return (
      <Link
        href={href}
        className={`group hidden shrink-0 items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-white transition duration-300 sm:flex ${className} ${textColor}`}
      >
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90 ${textColor}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        <span
          className={`duration-300 group-hover:-translate-x-1.5 ${textColor}`}
        >
          {text}
        </span>
      </Link>
    );
  }
  return (
    <p
      className={`group hidden shrink-0 items-center gap-2 text-sm uppercase text-white transition duration-300 sm:flex ${className} ${textColor}`}
    >
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90 ${textColor}`}
      >
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <span
        className={`duration-300 group-hover:-translate-x-1.5 ${textColor}`}
      >
        {text}
      </span>
    </p>
  );
};

export default PlusTextBtn;
