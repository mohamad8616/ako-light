/**
 * Admin-only translation dictionary — barrel.
 *
 * WHY THIS IS A SEPARATE MODULE FROM `../index` (the public barrel)
 *
 * The admin dictionary is ~45% of every translation byte in the repo and every
 * string in it is read only by the admin dashboard. `LanguageProvider` is a
 * `"use client"` component rendered by `app/[locale]/layout.tsx`, which wraps
 * BOTH `(site)` and `(admin)` — so if these keys lived in the public barrel they
 * would be shipped to every visitor of every public page, to be parsed and held
 * in memory for strings those pages can never render.
 *
 * The split is load-bearing because the bundle boundary follows the module
 * graph: only `AdminLanguageProvider` (mounted inside the `(admin)` layout)
 * imports this file, so these strings land in a chunk that only admin routes
 * fetch.
 *
 * The one thing that must NOT live here is anything a public page reads. The
 * only such case was the sign-in page's access-denied message, which now lives
 * in `../auth` as `auth.access.denied.*` — see the note there.
 *
 * Keys are grouped one module per `admin.<namespace>.*` prefix; `./<ns>` holds
 * both locales for that namespace. Adding a key means adding it to the module
 * named after its namespace — the mapping is 1:1, so there is never a question
 * of where a key belongs.
 */
import { navEn, navFa } from "./nav";
import { sectionEn, sectionFa } from "./section";
import { statEn, statFa } from "./stat";
import { overviewEn, overviewFa } from "./overview";
import { placeholderEn, placeholderFa } from "./placeholder";
import { topbarEn, topbarFa } from "./topbar";
import { breadcrumbEn, breadcrumbFa } from "./breadcrumb";
import { brandEn, brandFa } from "./brand";
import { roleEn, roleFa } from "./role";
import { cardEn, cardFa } from "./card";
import { headerEn, headerFa } from "./header";
import { tableEn, tableFa } from "./table";
import { chartEn, chartFa } from "./chart";
import { orderEn, orderFa } from "./order";
import { productEn, productFa } from "./product";
import { collectionEn, collectionFa } from "./collection";
import { designerEn, designerFa } from "./designer";
import { materialEn, materialFa } from "./material";
import { fabricEn, fabricFa } from "./fabric";
import { catalogueEn, catalogueFa } from "./catalogue";
import { productCategoryEn, productCategoryFa } from "./productCategory";
import { crudEn, crudFa } from "./crud";
import { uploadEn, uploadFa } from "./upload";
import { mediaEn, mediaFa } from "./media";
import { settingsEn, settingsFa } from "./settings";
import { errorEn, errorFa } from "./error";
import { flagshipEn, flagshipFa } from "./flagship";
import { projectEn, projectFa } from "./project";
import { homepageEn, homepageFa } from "./homepage";
import { pageEn, pageFa } from "./page";
import { adminsEn, adminsFa } from "./admins";

export const adminEn = {
  ...navEn,
  ...sectionEn,
  ...statEn,
  ...overviewEn,
  ...placeholderEn,
  ...topbarEn,
  ...breadcrumbEn,
  ...brandEn,
  ...roleEn,
  ...cardEn,
  ...headerEn,
  ...tableEn,
  ...chartEn,
  ...orderEn,
  ...productEn,
  ...collectionEn,
  ...designerEn,
  ...materialEn,
  ...fabricEn,
  ...catalogueEn,
  ...productCategoryEn,
  ...crudEn,
  ...uploadEn,
  ...mediaEn,
  ...settingsEn,
  ...errorEn,
  ...flagshipEn,
  ...projectEn,
  ...homepageEn,
  ...pageEn,
  ...adminsEn,
} as const;

export const adminFa = {
  ...navFa,
  ...sectionFa,
  ...statFa,
  ...overviewFa,
  ...placeholderFa,
  ...topbarFa,
  ...breadcrumbFa,
  ...brandFa,
  ...roleFa,
  ...cardFa,
  ...headerFa,
  ...tableFa,
  ...chartFa,
  ...orderFa,
  ...productFa,
  ...collectionFa,
  ...designerFa,
  ...materialFa,
  ...fabricFa,
  ...catalogueFa,
  ...productCategoryFa,
  ...crudFa,
  ...uploadFa,
  ...mediaFa,
  ...settingsFa,
  ...errorFa,
  ...flagshipFa,
  ...projectFa,
  ...homepageFa,
  ...pageFa,
  ...adminsFa,
} as const;
