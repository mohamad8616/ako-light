# ProductsSheet: align links column with the navbar products/close trigger

## Goal
The "all Products" link should sit in the same horizontal row as the navbar's products/close trigger (its text center aligned with the trigger's text center), with the category list flowing below it — instead of the current vertically-centered block. Applies at both breakpoints (mobile `side=top` full-screen and desktop `side=right` panel).

## Geometry derivation (why the numbers are exact)
While any overlay is open, Navbar freezes to unscrolled geometry (components/navbar/Navbar.tsx):
- Band height: `h-32` = 128px (<768px), `md:h-52` = 208px (≥768px).
- Inner controls row is `h-full items-center` → trigger (h-5, text-sm/20px line) vertical center = **64px** mobile / **104px** desktop from viewport top.
Target: first link's line-box center at those y values → first link top = 54px mobile / 94px desktop.
`SheetContent` has `p-6` (24px top padding) → inner column padding-top must be **30px** mobile / **70px** desktop.

## Tasks — `components/ui/ProductsSheet.tsx` only
1. Content column div (currently `className="font-din flex h-full flex-col items-start justify-center gap-6 mt-9"`):
   - Remove `justify-center` → use `justify-start`.
   - Remove `mt-9`.
   - Add `pt-[30px] md:pt-[70px]` (+ brief comment deriving the values from the navbar band heights so future edits keep them in sync).
2. "all Products" Link: remove `mb-6` (the container's `gap-6` already provides spacing; keeping both double-spaces).
3. Leave everything else untouched: `linkClasses`, `UnderLineEffect`, categories map, controlled props, motionProps, close handlers, cursor/pointer-events fixes.

No changes to Navbar.tsx, sheet.tsx, or fullScreenMenu.tsx.

## Edge cases
- Exactly 768px wide: sheet renders `side=top` (isMobile uses `max-width: 768px`) while `md:pt-[70px]` kicks in — alignment stays correct because both sides key off 768px consistently (navbar band `md:h-52`, padding `md:`).
- Short viewports (e.g., landscape phones): the long category list may overflow below the fold; same as today's centered variant (popup has no scroll container). Out of scope unless requested — could later add `overflow-y-auto` + `data-lenis-prevent`.
- Trigger alignment relies on the frozen unscrolled band while overlays are open (`scrolled && !overlayOpen` logic) — already guaranteed by prior work.

## Validation
1. `npm run dev`; open the products sheet on desktop: "all Products" text baseline lines up with the floating products/close trigger above the panel; categories cascade below with even gap-6/space-y-4 rhythm.
2. Repeat at <768px (top sheet) and at exactly 768px: same row alignment holds.
3. Close/reopen several times (trigger, Esc, backdrop, link click): entrance/exit animation unchanged; no layout jump when the list appears.
4. Regression: hovering "all Products" shows hand pointer everywhere on the label (pointer-events fix intact).
5. `npm run lint` and `npx tsc --noEmit`: no new output beyond the known pre-existing warnings/errors.
