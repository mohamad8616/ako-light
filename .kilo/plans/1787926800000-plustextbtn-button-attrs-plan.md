# Plan: Type `PlusTextBtn` so the button variant accepts button attributes (e.g. `onClick`)

## Goal
Allow consumers to pass native `<button>` attributes (`onClick`, `type`, `disabled`, `form`, `name`, `value`, etc.) to `PlusTextBtn` when it renders as a button (i.e. no `href`), while keeping the link variant typed against `next/link`.

## Current state (`components/ui/PlusTextBtn.tsx`)
- Single flat prop type: `{ href?, className?, text, textColor? }`.
- `if (href)` renders `<Link ...>`, else renders `<button>`.
- The `button` branch is NOT typed, so `onClick` (and other button attrs) cannot be passed safely.

## Approach — discriminated union on `href`
Make `href` the discriminant:
- Link variant: `href: string` → accepts `next/link` props.
- Button variant: `href?: undefined` → accepts `React.ButtonHTMLAttributes<HTMLButtonElement>`.

When the consumer omits `href`, TS selects the button variant and `onClick` etc. are allowed/required-typed. When `href` is present, they get link props.

## Implementation (full replacement of `components/ui/PlusTextBtn.tsx`)

```tsx
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type PlusTextBtnBase = {
  className?: string;
  text: string;
  textColor?: string;
};

type PlusTextBtnProps =
  | (PlusTextBtnBase & Omit<ComponentProps<typeof Link>, "className"> & { href: string })
  | (PlusTextBtnBase & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined });

const PlusTextBtn = (props: PlusTextBtnProps) => {
  if (props.href) {
    const { href, className, text, textColor, ...rest } = props;
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
```

### Why this works
- `Omit<ComponentProps<typeof Link>, "className">` keeps Next's Link props but defers `className` to `PlusTextBtnBase`.
- `textColor` is destructured so it never leaks into `{...rest}`.
- Destructure **inside** each branch (after `props.href` narrows) so `rest` is correctly typed per variant — avoids the "rest from union loses narrowing" TS pitfall.
- `if (props.href)` narrows `props` to the link variant (buttons have `href?: undefined`).

## Backward compatibility (all 14 existing call sites still type-check)
- `<PlusTextBtn text="Discover" />` → button variant, `text` required. OK.
- `<PlusTextBtn text={btn} href="/catalogue" className="mt-5" />` → link variant. OK.
- `<PlusTextBtn text={item.title} textColor="text-background" className="mt-7" />` → button variant. OK.
- `<PlusTextBtn href={website} text="view website" className="..." />` → link variant. OK.
- `<PlusTextBtn href="#" text="Discover" className="flex!" />` → link variant. OK.
- `<PlusTextBtn text="more info" />` → button variant. OK.

## Usage example after change
```tsx
<PlusTextBtn
  text="Open modal"
  onClick={() => open()}
  type="button"
/>
```

## Validation
1. `npx tsc --noEmit` (allowed by AGENTS.md scripts; strict mode is on).
2. `npm run lint`.

## Non-blocking observations / future cleanup (out of scope here)
- `textColor` actually holds a Tailwind class string (e.g. `"text-background"`), not a color — naming is misleading. Consider renaming to something like `extraClassName` or folding into `className`. Do NOT change in this task to avoid touching call sites.
- `width="11" height="11"` on the `<svg>` conflicts with `viewBox="0 0 14 14"` (11≠14). Visual only; leave as-is to keep diff minimal.
- No snapshot/Storybook tests exist for this component; none required for a type-only change.
