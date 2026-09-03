# Fix PlusTextBtn RTL icon rotation

## Context
`components/ui/PlusTextBtn.tsx` handles RTL text translation via `dir` from `useLanguage()`, but the SVG icon rotation is hardcoded to `group-hover:rotate-90` with no RTL awareness.

## Plan

### 1. Split icon classes into RTL/LTR variants in `components/ui/PlusTextBtn.tsx`

Replace the single `ICON_CLASSES` constant with two constants:

```tsx
const ICON_CLASSES_RTL = "inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-300 ease-in-out group-hover:-rotate-90";
const ICON_CLASSES_LTR = "inline-flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90";
```

### 2. Resolve the correct icon class using `dir`

Inside the `PlusTextBtn` component body, after `dir` is available:

```tsx
const resolvedIconClasses = dir === "rtl" ? ICON_CLASSES_RTL : ICON_CLASSES_LTR;
```

### 3. Apply resolved icon class to the SVG wrapper span

Change line 41 from:

```tsx
<span className={`${ICON_CLASSES} ${resolvedTextColor}`}>
```

to:

```tsx
<span className={`${resolvedIconClasses} ${resolvedTextColor}`}>
```

## Files changed
- `components/ui/PlusTextBtn.tsx` — only

## Validation
- Verify LTR: hover rotates `+` icon `+90deg`, text slides `-x`
- Verify RTL: hover rotates `+` icon `-90deg`, text slides `+x`
- Confirm `PlusTextBtn` still renders as `<Link>` when `href` is present and as `<button>` otherwise
- Confirm no TypeScript type errors (cast spreads unchanged)
