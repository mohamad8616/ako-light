# Plan: Add Noora font for Persian language

## Current state
- `app/layout.tsx` declares `noora` via `next/font/local` with `variable: "--font-dinnext"` — **collision**: same variable as `dinNextLTPro`, so Noora overwrites DinNext.
- `app/globals.css` has no `--font-noora` theme variable.
- Persian (RTL) pages use `var(--font-vazirmatn)` → `"Tahoma", "Noto Sans Arabic"`; Noora is never used there.

## Changes

### 1. Fix `app/layout.tsx`
- Change `noora`'s `variable` from `--font-dinnext` → `--font-noora`.
- Add weight variants for proper Persian rendering (ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold).

### 2. Update `app/globals.css`
- Add `--font-noora: "Noora", sans-serif;` in `@theme inline` block.
- Update RTL rule to use `var(--font-noora)` instead of `var(--font-vazirmatn)`.
- Remove or deprecate `--font-vazirmatn` if no longer referenced.

### 3. Validation
- Confirm `lang="fa"` + `dir="rtl"` causes `<body>` to use Noora.
- Build passes; font files load from `/fonts/noora/*.woff2`.
