/**
 * `/about` page sections — Prisma-backed replacement for the `about.*` copy in
 * lib/i18n/translations/about.ts (myPlan.md Part C).
 *
 * Each `AboutPageSection` row holds ONE section's content in a single `jsonb`
 * column (AGENTS.md data-storage policy) whose shape follows what that section
 * actually renders — hero lines, a subtitle paragraph, the brand-story block
 * copy, the elegance paragraphs — not one rigid shared shape.
 *
 * `Localized` values are picked per language inside the client components
 * (`pick(value, lang)`), exactly like the homepage feature slots. The
 * translation dictionary is both the SEED SOURCE and the fallback for a section
 * row that does not exist yet (fresh DB), so the page never renders empty copy
 * mid-deploy; once a row exists its fields win, so admin edits always ship.
 * Genuine UI chrome (the hero "play" label) never left the dictionary — see the
 * myPlan.md Part A classification.
 */
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { loc, type Localized } from "@/lib/i18n/localized";
import { aboutEn, aboutFa } from "@/lib/i18n/translations/about";
import { asJsonInput } from "./casting";

/** Every `/about` section row key — one row per rendered section. */
export const ABOUT_SECTION_KEYS = [
  "heroSection",
  "subtitleSection",
  "brandStorySection",
  "eleganceSection",
] as const;
export type AboutSectionKey = (typeof ABOUT_SECTION_KEYS)[number];

// ---------------------------------------------------------------------------
// Per-section content shapes (each maps to one component).
// ---------------------------------------------------------------------------

/** components/about/AboutHero.tsx — `about.hero.firstLine` / `.secondLine`. */
export type AboutHeroContent = {
  firstLine: Localized;
  secondLine: Localized;
};

/** components/about/AboutHeroVideo.tsx — `about.subtitle` under the hero. */
export type AboutSubtitleContent = {
  paragraph: Localized;
};

/** components/about/BrandStory.tsx — title + intro grid + two image blocks. */
export type AboutBrandStoryContent = {
  title: Localized;
  /** `about.brandStory.intro1..4` — the four-column intro grid. */
  paragraphs: Localized[];
  /** `about.brandStory.block1Alt`. */
  block1Alt: Localized;
  /** `about.brandStory.block1.p1` / `.p2`. */
  block1Paragraphs: Localized[];
  /** `about.brandStory.block2Alt`. */
  block2Alt: Localized;
  /** `about.brandStory.block2.p1`. */
  block2Paragraph: Localized;
};

/** components/about/EleganceSection.tsx — title + `about.elegance.p1..p3`. */
export type AboutEleganceContent = {
  title: Localized;
  paragraphs: Localized[];
};

/** Everything `/about/page.tsx` fetches in one read. */
export type AboutPageContent = {
  hero: AboutHeroContent;
  subtitle: AboutSubtitleContent;
  brandStory: AboutBrandStoryContent;
  elegance: AboutEleganceContent;
};

/**
 * Content shape per section key — the type-level companion to the write
 * function below and to `lib/admin/schemas/about.ts`'s schema registry. The two
 * are kept in step by the admin actions, which only ever pass parsed values.
 */
export interface AboutSectionContentMap {
  heroSection: AboutHeroContent;
  subtitleSection: AboutSubtitleContent;
  brandStorySection: AboutBrandStoryContent;
  eleganceSection: AboutEleganceContent;
}

/**
 * Canonical render order, mirrored by prisma/seed.ts's `sortOrder` — used when
 * a save CREATES a row (a fresh database whose seed has not run yet).
 */
const ABOUT_SECTION_ORDER: Record<AboutSectionKey, number> = {
  heroSection: 0,
  subtitleSection: 1,
  brandStorySection: 2,
  eleganceSection: 3,
};

// ---------------------------------------------------------------------------
// Dictionary-derived default content — the seed's input and the missing-row
// fallback. Built from the SAME translation keys the page rendered before the
// migration, so an unseeded database renders byte-identical copy.
// ---------------------------------------------------------------------------

/** `{ en, fa }` pair, requiring the key to exist in BOTH language halves. */
const pair = (key: keyof typeof aboutEn & keyof typeof aboutFa): Localized =>
  loc(aboutEn[key], aboutFa[key]);

export const DEFAULT_ABOUT_PAGE_CONTENT: AboutPageContent = {
  hero: {
    firstLine: pair("about.hero.firstLine"),
    secondLine: pair("about.hero.secondLine"),
  },
  subtitle: {
    paragraph: pair("about.subtitle"),
  },
  brandStory: {
    title: pair("about.brandStory.title"),
    paragraphs: [
      pair("about.brandStory.intro1"),
      pair("about.brandStory.intro2"),
      pair("about.brandStory.intro3"),
      pair("about.brandStory.intro4"),
    ],
    block1Alt: pair("about.brandStory.block1Alt"),
    block1Paragraphs: [
      pair("about.brandStory.block1.p1"),
      pair("about.brandStory.block1.p2"),
    ],
    block2Alt: pair("about.brandStory.block2Alt"),
    block2Paragraph: pair("about.brandStory.block2.p1"),
  },
  elegance: {
    title: pair("about.elegance.title"),
    paragraphs: [
      pair("about.elegance.p1"),
      pair("about.elegance.p2"),
      pair("about.elegance.p3"),
    ],
  },
};

/**
 * A section row's own fields win over the dictionary default field-by-field
 * (a partial row can only be produced by a bad write — admin actions validate
 * with zod first); no row at all renders the seeded copy rather than nothing.
 */
function resolveSection<T extends object>(
  rows: ReadonlyMap<string, unknown>,
  key: AboutSectionKey,
  fallback: T,
): T {
  const raw = rows.get(key);
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }
  return { ...fallback, ...(raw as Partial<T>) } as T;
}

/**
 * Resolved `/about` content for the public page — one cached read per request
 * (React `cache`, same de-dupe as every other repository).
 */
export const getAboutPageContent = cache(
  async (): Promise<AboutPageContent> => {
    const sections = await prisma.aboutPageSection.findMany({
      orderBy: { sortOrder: "asc" },
    });
    const rows = new Map<string, unknown>(
      sections.map((section) => [section.sectionKey, section.content]),
    );

    return {
      hero: resolveSection(rows, "heroSection", DEFAULT_ABOUT_PAGE_CONTENT.hero),
      subtitle: resolveSection(
        rows,
        "subtitleSection",
        DEFAULT_ABOUT_PAGE_CONTENT.subtitle,
      ),
      brandStory: resolveSection(
        rows,
        "brandStorySection",
        DEFAULT_ABOUT_PAGE_CONTENT.brandStory,
      ),
      elegance: resolveSection(
        rows,
        "eleganceSection",
        DEFAULT_ABOUT_PAGE_CONTENT.elegance,
      ),
    };
  },
);

// ---------------------------------------------------------------------------
// Admin write (myPlan.md Part D) — the only path that mutates these rows.
// ---------------------------------------------------------------------------

/**
 * Writes one section's content.
 *
 * UPSERT: a section whose row is missing (a fresh database whose seed has not
 * run yet) is created on first save with its canonical `sortOrder`, while an
 * existing row keeps the order it already has — `sortOrder` is seed/display
 * metadata, not an admin-editable field.
 *
 * The caller re-validates the payload with the matching schema from
 * lib/admin/schemas/about.ts before this runs (see lib/admin/actions/about.ts),
 * so `content` here is always a complete section shape.
 */
export async function updateAboutPageSection<K extends AboutSectionKey>(
  sectionKey: K,
  content: AboutSectionContentMap[K],
): Promise<void> {
  await prisma.aboutPageSection.upsert({
    where: { sectionKey },
    create: {
      sectionKey,
      sortOrder: ABOUT_SECTION_ORDER[sectionKey],
      content: asJsonInput(content),
    },
    update: { content: asJsonInput(content) },
  });
}