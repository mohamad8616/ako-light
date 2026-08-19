# Plan: Align ImageGalleryCarousel with HomeCarousel

## Goal
Make `ImageGalleryCarousel.tsx` use the same carousel functionality as `HomeCarousel.tsx`, while showing a simple image column below 1024px (below `lg` breakpoint). Preserve the cursor-tracking circle feature unique to `ImageGalleryCarousel`.

## Key Differences to Resolve

### 1. Import path (line 4)
- Current: `import { EASE } from "@/utility/HomepageSection";`
- HomeCarousel uses: `import HomepageSection, { EASE } from "../../utility/HomepageSection";`
- **Fix**: Change to `import HomepageSection, { EASE } from "../../utility/HomepageSection";`

### 2. Root wrapper (lines 69-78)
- Current: `<motion.section>` with manual animation props + cursor circle inside
- HomeCarousel: `<HomepageSection className="bg-background-secondary w-full overflow-hidden border-y border-white/10 px-6 py-20 md:px-12 md:py-28 lg:py-32">`
- **Fix**: Replace `<motion.section>` opening tag with `<HomepageSection className="bg-background-secondary w-full overflow-hidden border-y border-white/10 px-6 py-20 md:px-12 md:py-28 lg:py-32">`. Keep the cursor circle `<motion.div>` inside. The closing `</motion.section>` becomes `</HomepageSection>`.

### 3. Container (carousel track) — lines 96-100
- Current: `grid grid-cols-1 gap-5 px-6 pb-2 sm:gap-6 md:px-12 lg:flex lg:cursor-grab lg:gap-8 lg:overflow-x-auto lg:px-20 lg:snap-x lg:snap-proximity lg:active:cursor-grabbing xl:px-[8.5vw]` + conditional `lg:select-none`
- HomeCarousel: `no-scrollbar mx-auto flex max-w-[1600px] cursor-grab gap-5 overflow-x-auto px-6 pb-2 active:cursor-grabbing sm:gap-6 md:px-12 lg:gap-8 lg:px-20 xl:px-[8.5vw]` + conditional snap on touch
- **Fix**: Use responsive classes that switch from grid column to flex carousel at `lg`:
```
className={`no-scrollbar mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-6 pb-2 sm:gap-6 md:px-12 lg:flex lg:cursor-grab lg:gap-8 lg:overflow-x-auto lg:px-20 lg:snap-x lg:snap-proximity lg:active:cursor-grabbing xl:px-[8.5vw] ${
  isTouch ? "snap-x snap-proximity" : ""
}`}
```
This matches HomeCarousel's container classes but keeps the `grid-cols-1` → `lg:flex` responsive behavior.

### 4. Carousel item — line 115 (current)
- Current: `relative w-full shrink-0 overflow-hidden lg:w-[24vw] lg:snap-start xl:w-[20vw]` + conditional `lg:select-none`
- HomeCarousel: `group xs:w-[56vw] relative w-[68vw] shrink-0 sm:w-[40vw] md:w-[31vw] lg:w-[24vw] xl:w-[20vw]` + conditional `snap-start` on touch
- **Fix**: Match HomeCarousel's item classes. Below `lg`, items use responsive widths (`xs:w-56vw`, `sm:w-40vw`, `md:w-31vw`). At `lg+`, they use `lg:w-[24vw] xl:w-[20vw]` (same as current). Add `group` for hover effects and conditional snap-start:
```
className={`group relative w-full shrink-0 xs:w-[56vw] sm:w-[40vw] md:w-[31vw] lg:w-[24vw] xl:w-[20vw] ${
  isTouch ? "snap-start" : ""
}`}
```
Remove `overflow-hidden` from item (it moves to the image wrapper div, matching HomeCarousel).

### 5. Image rendering — lines 119-124 (current)
- Current: Bare `<img>` with `aspect-4/5 h-full w-full object-cover` (no wrapper div, no hover effects)
- HomeCarousel: Wrapper `<div className="relative aspect-4/5 w-full overflow-hidden bg-[#111]">` containing `<img>` with `h-full w-full object-cover transition-transform ... group-hover:scale-110` + overlay `<div>`
- **Fix**: Match HomeCarousel's image structure exactly (wrapper div, hover zoom, overlay):
```tsx
<div className="relative aspect-4/5 w-full overflow-hidden bg-[#111]">
  <img
    src={src}
    alt=""
    draggable={false}
    className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
  />
  <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
</div>
```

### 6. PlusTextBtn
- Not currently used in ImageGalleryCarousel. Keep as-is (no PlusTextBtn needed for image gallery).

### 7. Heading row — lines 80-90 (current)
- Keep the "Image Gallery" heading. The current heading structure is fine — just ensure it stays inside `HomepageSection`.

### 8. Cursor tracking circle — lines 132-146 (current)
- Preserve entirely. This is unique to ImageGalleryCarousel and should be kept.

### 9. Trailing spacer — line 129 (current)
- Current: `<div className="hidden w-2 shrink-0 sm:w-4 lg:block" aria-hidden="true" />`
- HomeCarousel: `<div className="w-2 shrink-0 sm:w-4" aria-hidden="true" />`
- **Fix**: Match HomeCarousel — remove `hidden lg:block`, make it always visible.

## Final Structure (result after fixes)
```
<HomepageSection className="bg-background-secondary w-full overflow-hidden border-y border-white/10 px-6 py-20 md:px-12 md:py-28 lg:py-32">
  <div>heading: "Image Gallery"</div>
  <motion.div container — grid below lg, flex at lg+>
    {images.map((src, i) => (
      <motion.div item — responsive widths>
        <div wrapper — aspect-4/5>
          <img — object-cover, group-hover:scale-110 />
          <div overlay />
        </div>
      </motion.div>
    ))}
    <div trailing spacer />
  </motion.div>
  <motion.div cursor circle />
</HomepageSection>
```

## Out of Scope
- The Google Fonts fetch errors (JetBrains Mono, Oswald, Vazirmatn) in `app/layout.tsx` — network issue, not a code issue
- The `MetaphysicsTeaser.tsx` JSX errors in `app/about/page.tsx` — separate issue in a different component
- The hydration mismatch from `LanguageProvider` using localStorage — separate issue

## Validation
1. `npx tsc --noEmit` — no errors
2. `npm run lint` — no new warnings beyond existing ones
3. Visually verify carousel works (drag on desktop, scroll on mobile)
4. Below 1024px: images display in a single column (grid)
5. At 1024px+: horizontal drag-scroll carousel activates
