# Homepage Banner Refactor & Admin CRUD Plan

## Overview & Confirmed Decisions
- **HengeLondonBanner Decision:** User confirmed `HengeLondonBanner` is permanently deleted (component removed, commented-out slot removed from `app/[locale]/(site)/page.tsx`, and dead references in `lib/data/homepage.ts` cleaned up).
- **CTA Dynamic Linking:** In both "reference" and "override" modes, CTA buttons strictly link to the canonical route of the referenced entity (`/flagship/${flagship.slug}` or `/projects/${project.slug}`). Override mode alters only displayed text/image (kicker, title, paragraphs, image), never the destination URL.
- **HomeCollectionBanner:** Standalone content model (`HomeCollectionFeature`) without an entity FK or mode toggle.
- **CatalogueSection:** References an existing `CatalogueItem` (`CatalogueFeature`) via `catalogueItemId`, obtaining the title and PDF href directly from the referenced item.

---

## Architecture & Implementation Steps

### PART A — Component Cleanup & Swaps
1. Delete legacy/obsolete components:
   - `components/home/HengeLondonBanner.tsx`
   - `components/home/HengeParisBanner.tsx`
   - `components/home/HIstraBanner.tsx`
   - `components/home/Vocla2026Section.tsx`
2. Clean up `lib/data/homepage.ts`:
   - Remove obsolete entries (`paris`, `london`, `catalogue`, `homeCollection`, `istra`, `vocla`).
   - Retain entries still in use by other homepage components (`slider`, `tables`, `carousel`).

---

### PART B — Schema & Migration
1. Add Prisma Enum & Models to `prisma/schema.prisma`:
   - `enum FeatureMode`: `reference`, `override`
   - `FlagshipOneFeature`: id, enabled, mode, flagshipId (FK to Flagship.id), nullable override fields (kicker, title, paragraphs, image).
   - `ProjectBannerFeature`: id, enabled, mode, projectId (FK to Project.id), nullable override fields (kicker, title, image).
   - `ProjectDarkBackgroundFeature`: id, enabled, mode, projectId (FK to Project.id), nullable override fields (title, paragraphs, image).
   - `HomeCollectionFeature`: id, enabled, image, title (Localized), text (Localized).
   - `CatalogueFeature`: id, enabled, catalogueItemId (FK to CatalogueItem.id).
2. Database Migration & Seed:
   - Run migration to apply the tables to Postgres and regenerate Prisma client.
   - Seed default rows in `prisma/seed.ts` linking to existing flagship ("henge-paris"), project ("h-istra"), project ("vocla-2026"), and catalogue item ("s34-5").



---

### PART C — Repositories & Component Rewrites
1. Create `lib/repositories/homepage-features.ts`:
   - Data types for each resolved feature:
     - `ResolvedFlagshipOneFeature`: `{ enabled: boolean, kicker: Localized, title: Localized, paragraphs: Localized[], image: string, ctaHref: string }`
     - `ResolvedProjectBannerFeature`: `{ enabled: boolean, kicker: Localized, title: Localized, image: string, ctaHref: string }`
     - `ResolvedProjectDarkBackgroundFeature`: `{ enabled: boolean, title: Localized, paragraphs: Localized[], image: string, ctaHref: string }`
     - `ResolvedHomeCollectionFeature`: `{ enabled: boolean, title: Localized, text: Localized, image: string, ctaHref: string }`
     - `ResolvedCatalogueFeature`: `{ enabled: boolean, title: string, downloadHref: string, image: string }`
   - Resolvers:
     - `getFlagshipOneFeature()`: Reads feature + joined Flagship. In "reference" mode, extracts content from Flagship; in "override" mode, uses stored overrides. Computes `ctaHref = /flagship/${flagship.slug}`.
     - `getProjectBannerFeature()`: Reads feature + joined Project. Computes `ctaHref = /projects/${project.slug}`.
     - `getProjectDarkBackgroundFeature()`: Reads feature + joined Project. Computes `ctaHref = /projects/${project.slug}`.
     - `getHomeCollectionFeature()`: Reads `HomeCollectionFeature`. `ctaHref = /collections`.
     - `getCatalogueFeature()`: Reads `CatalogueFeature` + joined CatalogueItem. Pulls `title` and `href` from `CatalogueItem`.
     - Admin read & write functions for updating the feature configurations.
2. Component rewrites to accept server-fetched props:
   - `components/home/flagshipOne.tsx`: accepts `{ data: ResolvedFlagshipOneFeature | null }`. If null or `!data.enabled`, renders nothing.
   - `components/home/projectBanner.tsx`: accepts `{ data: ResolvedProjectBannerFeature | null }`. If null or `!data.enabled`, renders nothing.
   - `components/home/projectWithDarkBackground.tsx`: accepts `{ data: ResolvedProjectDarkBackgroundFeature | null }`. If null or `!data.enabled`, renders nothing.
   - `components/home/HomeCollectionBanner.tsx`: accepts `{ data: ResolvedHomeCollectionFeature | null }`. If null or `!data.enabled`, renders nothing.
   - `components/home/CatalogueSection.tsx`: accepts `{ data: ResolvedCatalogueFeature | null }`. If null or `!data.enabled`, renders nothing.
3. Update `app/[locale]/(site)/page.tsx`:
   - Server-fetch all 5 features in parallel via repository functions.
   - Pass resolved props to `FlagshipOne`, `ProjectBanner`, `ProjectWithDarkBackground`, `HomeCollectionBanner`, and `CatalogueSection`.
   - Remove dead imports and dead component JSX.

---

### PART D — Admin CRUD & Navigation
1. Navigation & Revalidation Setup:
   - Update `lib/admin/revalidate.ts`:
     - Add `"homepage"` to `AdminSection`.
     - Add `homepage: ["/[locale]/(site)"]` to `PUBLIC_ROUTES`.
   - Update `lib/admin/sections.ts`:
     - Add `{ href: "/admin/homepage", labelKey: "admin.nav.homepage" }` to `ADMIN_CATALOG_NAV`.
   - Update `components/admin/AdminSidebar.tsx`:
     - Add icon for `/admin/homepage`.
   - Add translation keys to `lib/i18n/translations/admin.ts` (EN & FA).
2. Zod Validation Schemas:
   - Create `lib/admin/schemas/homepage.ts` with validation schemas for all 5 banner features.
3. Server Actions:
   - Create `lib/admin/actions/homepage.ts`: update actions for each feature.
4. Admin Interface:
   - Hub page: `app/[locale]/(admin)/admin/homepage/page.tsx` showing all 5 features.
   - Dedicated edit views/forms for each feature with entity pickers, enabled switch, mode toggle, and localized/image inputs.

---

### PART E — Verification
1. Run `npx tsc --noEmit` to verify type safety.
2. Run `pnpm run build` to confirm build succeeds.
3. Run `pnpm test`.
4. Test functionality and revalidation behavior.
