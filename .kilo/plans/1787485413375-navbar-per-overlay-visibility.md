# Refactor ImageGalleryCarousel onto Embla

## Goal
Replace the hand-rolled drag-scroll in `components/about/ImageGalleryCarousel.tsx` with the installed `embla-carousel-react` (^8.6.0), following the commented-out snippet at the file's bottom as the structural instruction and the repo's established pattern in `components/home/HomeCarousel.tsx`.

## Confirmed decisions
- **Drag feel**: `dragFree: true` — free momentum scroll, no snap-to-slide (user choice). Plus `{ align: "start", containScroll: "trimSnaps", loop: false }`.
- **Structure** (mirrors HomeCarousel): outer viewport div gets `ref={emblaRef}` with grab cursors/overflow-hidden/side paddings; first child is the Embla container (`flex gap-*`); slides are `shrink-0` fixed-width cards.
- **Slide sizing** from the commented snippet: `aspect-4/5 w-[70vw] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]` (replaces current aspect-video / grid-below-lg / odd `xl:w-[38vw]`).
- **Keep all custom features** (not present in snippet): circle arrow cursor w/ mix-blend-difference tracking mouse over the section (hidden on touch via existing `useSyncExternalStore` pointer MQL), staggered entry reveal (IntersectionObserver `inView` + `.carousel.in-view .group` rule already in globals.css + per-slide `transitionDelay (i % 6) * 0.06s`), hover zoom + black/15 overlay, header row with SectionSubTitle.
- **Delete**: all manual drag state/logic (`isDragging`, `startX`, `startScrollLeft`, `maxScroll`, measure-on-resize effect, mousedown handler, global mousemove/mouseup effect), `snap-x`/`snap-start` conditionals, trailing spacer div, the entire dead commented block + stray fragment after `return`, unused imports (`useEffect` still needed for observer; `useRef` still needed for sectionRef).
- Embla handles touch dragging natively → no `isTouch` branching inside the carousel anymore; `isTouch` survives ONLY to gate the cursor circle.
- Padding parity with HomeCarousel kept as-is (root px + inner px double-up exists there too) — not touched in this refactor.

## Tasks — single file rewrite: `components/about/ImageGalleryCarousel.tsx`
1. Import `useEmblaCarousel` from `"embla-carousel-react"`; drop nothing else from imports except what becomes unused.
2. `const [emblaRef] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", dragFree: true, loop: false });`
3. Keep unchanged: `sectionRef`, `inView` IntersectionObserver effect, pointer MQL store helpers, `cursorPos`/`hovering` state + `handleMouseMove`, `circleStyle`, JSX for header + cursor circle.
4. Carousel markup:
   ```tsx
   <div ref={emblaRef} className="no-scrollbar mx-auto max-w-[1600px] cursor-grab overflow-hidden px-6 pb-2 active:cursor-grabbing md:px-12 lg:px-20 xl:px-[8.5vw]">
     <div className={`carousel flex gap-4 md:gap-6 ${inView ? "in-view" : ""}`}>
       {images.map((src, i) => (
         <div key={src} style={{ transitionDelay: `${(i % 6) * 0.06}s` }}
           className="group relative aspect-4/5 w-[70vw] shrink-0 overflow-hidden bg-[#111] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[20vw]">
           <img src={src} alt="" draggable={false} loading="lazy" decoding="async"
             className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" />
           <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
         </div>
       ))}
     </div>
   </div>
   ```
   (Container must keep literal class `carousel` — globals.css keys the reveal off `.carousel .group` / `.carousel.in-view .group`.)
5. Remove trailing spacer + entire commented block after the component close brace.

## Edge cases
- `overflow-hidden` viewport + root section's own `overflow-hidden`: no horizontal page scroll leaks during drag.
- Reveal CSS applies at ALL viewports once `carousel` class is used (previous `.lg\:flex` hook only matched ≥lg markup quirk) — mobile now also gets the staggered reveal; acceptable/intended.
- `alt=""` decorative images kept; `draggable={false}` retained so Embla owns the pointer.
- SSR: emblaRef attaches post-hydration; no window access added beyond existing MQL helpers (already guarded by useSyncExternalStore server snapshot).

## Validation
1. `npm run dev` → `/about`: desktop drag throws with momentum and stops cleanly at both ends (no bounce past last image); wheel/trackpad horizontal scroll works.
2. Touch viewport: native swipe via Embla; no circle cursor rendered; hover zoom N/A but layout correct.
3. Circle arrow cursor appears over section, follows mouse, scales/fades out on leave; sits above images (`z-50`) and doesn't intercept clicks (`pointer-events-none`).
4. Entry reveal plays once with 6-image stagger cycle; no flash if section already in view on load.
5. Resize between breakpoints re-flows widths without breaking Embla bounds (Embla self-measures; optionally call `emblaApi.reInit()` — only add if visibly stale).
6. `npm run lint` + `npx tsc --noEmit`: no new output beyond known pre-existing warnings/errors.
