# Optimization & Cleanup Plan

## Context
Next.js 16 + React 19 project. Heavy animation stack (framer-motion, gsap, lenis), multiple icon libs, dead dependencies, commented-out code, and excessive `"use client"` directives.

---

## Step 1 — Remove dead dependencies
- `pnpm remove slick-carousel react-icons`
- Removes jQuery transitive dependency (~100KB+ bundle savings)

## Step 2 — Delete unused component files
| File | Reason |
|------|--------|
| `components/header/index.ts` | Barrel export, never imported |
| `components/header/menuColumn.tsx` | Duplicate of navbar version, never imported |
| `components/header/menuData.ts` | Old data, not imported |
| `components/ui/Reveal.tsx` | Never imported |
| `components/ui/Marquee.tsx` | Never imported |
| `components/ui/PageHeader.tsx` | Never imported |
| `components/home/newCatalogue.tsx` | 100% commented-out code |
| `components/flagship/flag/Newsletter.tsx` | Placeholder, never imported |
| `lib/data/products.ts` | Old product format, not imported in runtime |

## Step 3 — Delete commented-out code in active files
- `components/home/HomeCarousel.tsx` — remove ~120 lines of dead carousel code
- `components/footer/footer.tsx` — remove ~83 lines of old footer code
- `components/ui/HengeLogo.tsx` — remove ~15 lines of old logo code
- `app/products/[product]/[prod]/page.tsx` — remove dead `<CatalogueDownloadSection />`
- `app/page.tsx` — remove dead `<SliderSection />` and `<TimelessTablesBanner />` references

## Step 4 — Remove unnecessary `"use client"` from ~16 static components
Components with no hooks or browser APIs:
- `components/products/ProductsHeader.tsx`
- `components/projects/ProjectsHeader.tsx`
- `components/collections/CollectionsHeader.tsx`
- `components/materials/MaterialsHeader.tsx`
- `components/designers/DesignersHeader.tsx`
- `components/flagship/FlagshipHeader.tsx`
- `components/catalogue/CatalogueGrid.tsx`
- `components/catalogue/CatalogueCard.tsx`
- `components/contact/ContactInfoSection.tsx`
- `components/products/prod/ProdHero.tsx`
- `components/flagship/flag/FlagshipHero.tsx`
- `components/flagship/flag/FlagshipInfoSection.tsx`
- `components/flagship/flag/FlagshipGallerySection.tsx`
- `components/flagship/flag/FlagshipVideoSection.tsx`
- `components/s34/S34Harmony.tsx`
- `components/about/AboutHeroVideo.tsx`

## Step 5 — Deduplicate `EASE` constant
- 6 files redefine `[0.22, 1, 0.36, 1]` locally
- Import from `utility/HomepageSection.tsx` in all 5 files, remove local definitions

## Step 6 — Fix dead route / copy-paste error
- `app/projects/[project]/page.tsx` renders material components, not project content
- Either delete it (duplicates `app/materials/[material]/page.tsx`) or implement proper project detail page

## Step 7 — Migrate `<img>` to `next/image`
- 15+ components use raw `<img>` tags
- Replace with `next/image` + `fill` or `width/height`
- Add `priority` to above-the-fold hero images

## Step 8 — Replace simple framer-motion scroll animations with CSS
- Many `motion.section` + `whileInView` are just fade/slide effects
- Replace with `animation-timeline: view()` + `@keyframes` or IntersectionObserver + CSS classes
- Keep framer-motion only for gesture-driven interactions (carousel drag, menu transitions)

## Step 9 — Evaluate Lenis + GSAP removal
- Currently only used for smooth-scroll + GSAP ticker sync
- Replace with native `scroll-behavior: smooth` + `requestAnimationFrame`
- Potential bundle savings: ~130KB+

## Step 10 — Extract shared `SplitBanner` component
- `HengeParisBanner`, `HengeLondonBanner`, `Vocla2026Section`, `HomeCollectionBanner` share similar grid layouts
- Extract shared component to reduce duplication

## Step 11 — Audit translation keys
- Remove unused keys from `lib/i18n/translations.ts` (e.g., `nav.hengeWorld`, `slider.title`, `tables.title`)
- Use script to detect dead keys

## Step 12 — Consolidate loaders
- `Preloader` (initial load) and `PageLoader` (route transitions) both use `fixed inset-0`
- Merge into single loading system to avoid visual conflicts

## Step 13 — Fix minor issues
- `components/ProjectsSections.tsx` — rename `HomerPageSection` typo to `HomepageSection`
- `lib/data/materials.ts` — rename `metal: string` field to `type` or `category`
- `components/ui/HengeLogo.tsx` — rename component to match branding (now renders Ako Lighting logo)

---

## Priority Order
1. Steps 1–4 (quick wins, bundle + hygiene)
2. Steps 5–7 (medium effort, SSR + images)
3. Steps 8–10 (larger refactors)
4. Steps 11–13 (polish)

**Estimated bundle savings**: 400–500KB+ if all applied.
