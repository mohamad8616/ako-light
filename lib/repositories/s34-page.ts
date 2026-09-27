/**
 * `/s34` page sections — Prisma-backed replacement for the `s34.*` copy in
 * lib/i18n/translations/s34.ts (myPlan.md Part C).
 *
 * Each `S34PageSection` row holds ONE section's content in a single `jsonb`
 * column (AGENTS.md data-storage policy): hero title/subtitle, or a kicker
 * heading over a paragraph list — the shape that section actually renders, not
 * one rigid shared shape.
 *
 * `Localized` values are picked per language inside the client components
 * (`pick(value, lang)`), exactly like the homepage feature slots. The
 * translation dictionary is both the SEED SOURCE and the fallback for a section
 * row that does not exist yet (fresh DB), so the page never renders empty copy
 * mid-deploy; once a row exists its fields win, so admin edits always ship.
 * Gallery photos are NOT here — they stay in lib/data/s34.ts (not translation
 * content; myPlan.md Part A/C scope).
 */
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { loc, type Localized } from "@/lib/i18n/localized";
import { s34En, s34Fa } from "@/lib/i18n/translations/s34";
import { asJsonInput } from "./casting";

/** Every `/s34` section row key — one row per rendered section. */
export const S34_SECTION_KEYS = [
  "heroSection",
  "conceptSection",
  "gallerySection",
  "harmonySection",
] as const;
export type S34SectionKey = (typeof S34_SECTION_KEYS)[number];

// ---------------------------------------------------------------------------
// Per-section content shapes (each maps to one component).
// ---------------------------------------------------------------------------

/** components/s34/S34Hero.tsx — `s34.hero.title` / `.subtitle`. */
export type S34HeroContent = {
  title: Localized;
  subtitle: Localized;
};

/**
 * components/s34/S34Concept.tsx, Secuence.tsx, S34Harmony.tsx — a kicker
 * heading over a paragraph list (`s34.concept.*`, `s34.gallery.*`,
 * `s34.harmony.*`).
 */
export type S34KickerSectionContent = {
  kicker: Localized;
  paragraphs: Localized[];
};

/** Everything `/s34/page.tsx` fetches in one read. */
export type S34PageContent = {
  hero: S34HeroContent;
  concept: S34KickerSectionContent;
  gallery: S34KickerSectionContent;
  harmony: S34KickerSectionContent;
};

/**
 * The three kicker-over-paragraphs sections (same shape, one distinct row each).
 * The hero is the exception — it carries a title/subtitle pair instead.
 */
export type S34KickerSectionKey = Exclude<S34SectionKey, "heroSection">;

/**
 * Content shape per section key — the type-level companion to the write
 * function below and to `lib/admin/schemas/s34.ts`'s schema registry. The two
 * are kept in step by the admin actions, which only ever pass parsed values.
 */
export interface S34SectionContentMap {
  heroSection: S34HeroContent;
  conceptSection: S34KickerSectionContent;
  gallerySection: S34KickerSectionContent;
  harmonySection: S34KickerSectionContent;
}

/**
 * Canonical render order, mirrored by prisma/seed.ts's `sortOrder` — used when
 * a save CREATES a row (a fresh database whose seed has not run yet).
 */
const S34_SECTION_ORDER: Record<S34SectionKey, number> = {
  heroSection: 0,
  conceptSection: 1,
  gallerySection: 2,
  harmonySection: 3,
};

// ---------------------------------------------------------------------------
// Dictionary-derived default content — the seed's input and the missing-row
// fallback. Built from the SAME translation keys the page rendered before the
// migration, so an unseeded database renders byte-identical copy.
// ---------------------------------------------------------------------------

/** `{ en, fa }` pair, requiring the key to exist in BOTH language halves. */
const pair = (key: keyof typeof s34En & keyof typeof s34Fa): Localized =>
  loc(s34En[key], s34Fa[key]);

export const DEFAULT_S34_PAGE_CONTENT: S34PageContent = {
  hero: {
    title: pair("s34.hero.title"),
    subtitle: pair("s34.hero.subtitle"),
  },
  concept: {
    kicker: pair("s34.concept.kicker"),
    paragraphs: [
      pair("s34.concept.p1"),
      pair("s34.concept.p2"),
      pair("s34.concept.p3"),
      pair("s34.concept.p4"),
      pair("s34.concept.p5"),
    ],
  },
  gallery: {
    kicker: pair("s34.gallery.kicker"),
    paragraphs: [pair("s34.gallery.p1"), pair("s34.gallery.p2")],
  },
  harmony: {
    kicker: pair("s34.harmony.kicker"),
    paragraphs: [pair("s34.harmony.p1"), pair("s34.harmony.p2")],
  },
};

/**
 * A section row's own fields win over the dictionary default field-by-field
 * (a partial row can only be produced by a bad write — admin actions validate
 * with zod first); no row at all renders the seeded copy rather than nothing.
 */
function resolveSection<T extends object>(
  rows: ReadonlyMap<string, unknown>,
  key: S34SectionKey,
  fallback: T,
): T {
  const raw = rows.get(key);
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }
  return { ...fallback, ...(raw as Partial<T>) } as T;
}

/**
 * Resolved `/s34` content for the public page — one cached read per request
 * (React `cache`, same de-dupe as every other repository).
 */
export const getS34PageContent = cache(async (): Promise<S34PageContent> => {
  const sections = await prisma.s34PageSection.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const rows = new Map<string, unknown>(
    sections.map((section) => [section.sectionKey, section.content]),
  );

  return {
    hero: resolveSection(rows, "heroSection", DEFAULT_S34_PAGE_CONTENT.hero),
    concept: resolveSection(
      rows,
      "conceptSection",
      DEFAULT_S34_PAGE_CONTENT.concept,
    ),
    gallery: resolveSection(
      rows,
      "gallerySection",
      DEFAULT_S34_PAGE_CONTENT.gallery,
    ),
    harmony: resolveSection(
      rows,
      "harmonySection",
      DEFAULT_S34_PAGE_CONTENT.harmony,
    ),
  };
});

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
 * lib/admin/schemas/s34.ts before this runs (see lib/admin/actions/s34.ts), so
 * `content` here is always a complete section shape.
 */
export async function updateS34PageSection<K extends S34SectionKey>(
  sectionKey: K,
  content: S34SectionContentMap[K],
): Promise<void> {
  await prisma.s34PageSection.upsert({
    where: { sectionKey },
    create: {
      sectionKey,
      sortOrder: S34_SECTION_ORDER[sectionKey],
      content: asJsonInput(content),
    },
    update: { content: asJsonInput(content) },
  });
}