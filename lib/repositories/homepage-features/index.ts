/**
 * Homepage feature slots — Prisma-backed replacement for the per-banner data
 * that used to live in `lib/data/homepage.ts` (myPlan.md Part C).
 *
 * Every homepage banner is a singleton "feature" row (see prisma/schema.prisma
 * → "Homepage feature slots"). A slot either *references* a catalog entity
 * (`reference` mode — the displayed copy/image is read off the linked row) or
 * *overrides* it (`override` mode — the slot's own columns win, and any column
 * left NULL still falls back to the linked row, so a partial override can never
 * blank a banner out). The CTA destination is ALWAYS the linked entity's
 * canonical route (`/flagship/<slug>`, `/projects/<slug>`): override mode
 * changes what is displayed, never where the button goes.
 * `HomeCollectionBanner` is the exception — standalone content with no FK and
 * no mode toggle.
 *
 * `Resolved*` types are what the components consume: `Localized` values are
 * picked per language inside the component (`pick(value, lang)`), and `*Href`
 * is always a canonical route or a catalogue PDF link. A resolver returns
 * `null` when the slot row does not exist yet, which components render exactly
 * like `enabled: false` (nothing).
 *
 * STRUCTURE
 *
 * This was one 679-line module holding all five slots end to end. Each slot is
 * independent — its own row, its own resolved type, its own admin DTO and its
 * own save — so each now owns a file and this barrel re-exports the union:
 *
 *   ./slots                  slot key constants + HomepageFeatureSlot
 *   ./resolve                reference/override helpers (internal)
 *   ./flagship-one           the flagship banner
 *   ./project-banner         the H Istra project banner
 *   ./project-dark-background the Vocla 2026 banner
 *   ./home-collection        the standalone collections banner
 *   ./catalogue              the catalogue/PDF section
 *   ./overview               the admin hub summary (reads all five)
 *
 * Importers keep the same specifier they always used
 * (`@/lib/repositories/homepage-features`); only the internals moved. The
 * `./resolve` helpers stay private — they were never part of this module's API.
 */
export { FLAGSHIP_ONE_SLOT } from "./slots";
export { PROJECT_BANNER_SLOT } from "./slots";
export { PROJECT_DARK_BACKGROUND_SLOT } from "./slots";
export { HOME_COLLECTION_SLOT } from "./slots";
export { CATALOGUE_SLOT } from "./slots";
export { HOME_COLLECTION_HREF } from "./slots";
export type { HomepageFeatureSlot } from "./slots";

export { getFlagshipOneFeature } from "./flagship-one";
export { getFlagshipOneFeatureAdminDetail } from "./flagship-one";
export { updateFlagshipOneFeature } from "./flagship-one";
export type { ResolvedFlagshipOneFeature } from "./flagship-one";
export type { FlagshipOneFeatureWriteInput } from "./flagship-one";

export { getProjectBannerFeature } from "./project-banner";
export { getProjectBannerFeatureAdminDetail } from "./project-banner";
export { updateProjectBannerFeature } from "./project-banner";
export type { ResolvedProjectBannerFeature } from "./project-banner";
export type { ProjectBannerFeatureWriteInput } from "./project-banner";

export { getProjectDarkBackgroundFeature } from "./project-dark-background";
export { getProjectDarkBackgroundFeatureAdminDetail } from "./project-dark-background";
export { updateProjectDarkBackgroundFeature } from "./project-dark-background";
export type { ResolvedProjectDarkBackgroundFeature } from "./project-dark-background";
export type { ProjectDarkBackgroundFeatureWriteInput } from "./project-dark-background";

export { getHomeCollectionFeature } from "./home-collection";
export { getHomeCollectionFeatureAdminDetail } from "./home-collection";
export { updateHomeCollectionFeature } from "./home-collection";
export type { ResolvedHomeCollectionFeature } from "./home-collection";
export type { HomeCollectionFeatureWriteInput } from "./home-collection";

export { getCatalogueFeature } from "./catalogue";
export { getCatalogueFeatureAdminDetail } from "./catalogue";
export { updateCatalogueFeature } from "./catalogue";
export type { ResolvedCatalogueFeature } from "./catalogue";
export type { CatalogueFeatureWriteInput } from "./catalogue";

export { getHomepageFeaturesOverview } from "./overview";
export type { HomepageFeatureOverview } from "./overview";
