# Navbar: hide other elements while Products sheet or fullscreen menu is open

## Goal
When the user clicks **products** or the **hamburger**, every other navbar element fades out fast (no delay); the active trigger stays visible:
- products button keeps its existing products/close text-slide,
- hamburger swaps to an **X** icon and can toggle the menu closed.

Reusable, performance-friendly: pure CSS transitions, elements stay mounted (no mount/unmount churn, no layout reflow).

## Confirmed decisions
- Navbar owns a single state `activeOverlay: "products" | "menu" | null` → mutual exclusivity is automatic (opening one closes the other).
- Hidden elements **fade in place**: ~200ms ease-out, opacity + slight translate, they KEEP their flex space (no shifting of remaining buttons), and become non-interactive/non-focusable.
- While the fullscreen menu is open, the **header itself is elevated above the menu panel** (menu is `z-999`, header normally `z-50`; children can't escape the parent stacking context, so the conditional class goes on `motion.header`). Only the X is visible/clickable on top of the menu.
- The internal X inside `fullScreenMenu.tsx` stays untouched (both closers work).
- `ProductsSheet` becomes a controlled component (`open` / `onOpenChange` props lifted to Navbar).
- React 19.2.4 → the boolean `inert` attribute is supported.

## Tasks

### 1. New reusable wrapper — `components/navbar/CollapsibleNavItem.tsx`
```tsx
"use client";
import { cn } from "@/lib/utils";

interface Props {
  hidden: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleNavItem({ hidden, children, className }: Props) {
  return (
    <div
      inert={hidden || undefined}
      aria-hidden={hidden}
      className={cn(
        "transition-[opacity,transform] duration-200 ease-out",
        hidden ? "pointer-events-none translate-y-1 opacity-0" : "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
```
No framer-motion here — cheapest possible animation path (GPU-only properties).

### 2. Refactor `components/ui/ProductsSheet.tsx` to controlled
- Props: `{ open: boolean; onOpenChange: (open: boolean) => void }`.
- Delete internal `isOpen` state and `toggleSheet`; keep `closeSheet`.
- `<Sheet open={open} onOpenChange={(nextOpen, eventDetails) => { if (!nextOpen) eventDetails.preventUnmountOnClose(); onOpenChange(nextOpen); }} actionsRef={actionsRef}>`.
- Remove the manual `onClick={toggleSheet}` on `SheetTrigger` — Base UI Trigger toggles controlled state natively. The products/close two-span slide now reads the `open` prop.
- Everything else (motionProps, categories, media query hook) unchanged.

### 3. Update `components/navbar/Navbar.tsx`
- State: replace `const [open, setOpen] = useState(false)` with
  `const [activeOverlay, setActiveOverlay] = useState<"products" | "menu" | null>(null);`
  and `const overlayOpen = activeOverlay !== null;`
- Wrap in `CollapsibleNavItem hidden={overlayOpen}`:
  - the logo `<Link>`,
  - the Search `<button>`.
- Do NOT wrap the ProductsSheet trigger or the hamburger button (they are the surviving triggers).
- Wire ProductsSheet:
  ```tsx
  <ProductsSheet
    open={activeOverlay === "products"}
    onOpenChange={(o) => setActiveOverlay(o ? "products" : null)}
  />
  ```
- Hamburger button:
  - `onClick={() => setActiveOverlay((cur) => (cur === "menu" ? null : "menu"))}`
  - Icon: two stacked lucide icons (`Menu`, `X`) inside a small relative container, absolutely positioned on top of each other, swapping via CSS transition (`opacity` + `rotate-90`/`rotate-0`, duration-300) driven by `activeOverlay === "menu"` — same technique as the products/close text slide.
  - `aria-expanded={activeOverlay === "menu"}`, aria-label switches between `t("nav.menu")` / `t("nav.close")`.
- Header elevation: on `motion.header` make z-index conditional:
  `className={...${activeOverlay === "menu" ? "z-[1000]" : "z-50"}}` (keep the rest of existing classes).
- Scrolled-style conflict fix: when any overlay is open, the elevated header must not paint a solid bar over the overlay. Use `scrolled && !overlayOpen` as the effective condition for the inner div's scrolled styling (height, `bg-background`, `border-white/10`) so geometry/colors stay frozen while an overlay is open.
- FullscreenMenu wiring: `<FullscreenMenu open={activeOverlay === "menu"} onClose={() => setActiveOverlay(null)} />`.

### 4. Files NOT changed
- `fullScreenMenu.tsx` — internal X and animations untouched.
- `sheet.tsx`, `PageLoader.tsx`, lenis store — untouched. (Sheet popup/backdrop are `z-30`, below header `z-50`, so the triggers already float above the sheet on desktop AND mobile `side=top`.)

## Behavior / edge cases
- Opening products while menu is open (or vice versa) automatically closes the other via single state.
- On close, hidden elements fade back in (~200ms) immediately — intentional, matches "fast, no delay".
- During the menu's exit slide-up, header z drops back to 50 right away; the panel simply covers the navbar again as it leaves — acceptable, no flicker of controls since they fade back under the panel.
- `inert` guarantees keyboard users can't Tab into faded-out logo/search.
- Menu's own lenis lock/unlock and Escape handling keep working as today.

## Constraints
- Per repo AGENTS.md: this is Next 16 — skim `node_modules/next/dist/docs/` guides if anything about client components differs; this work is plain `"use client"` React and shouldn't hit breaking changes.
- No new dependencies.

## Validation
1. `npm run dev`: click **products** → logo/search/hamburger fade out in ~0.2s with no layout shift; sheet animates in after its configured delay; close (text button, backdrop, Esc, link click) restores elements.
2. Click **hamburger** → others fade out, icon crossfades to X, menu slides down, X remains visible/clickable ABOVE the menu; clicking navbar X or the menu's internal X or Esc closes and restores everything.
3. Open products, then hamburger → sheet closes and menu opens (no double overlay).
4. At mobile width (<768px): products sheet takes `side=top` and the trigger must remain visible/clickable above it.
5. Keyboard: Tab skips faded-out elements.
6. Run repo lint/typecheck scripts.
