/**
 * Flagship reads — Prisma-backed replacement for `flagships`,
 * `getFlagship()`, `getFlagshipDetail()` and `flagshipDetails` in
 * `lib/data/flagships.ts`.
 *
 * The summary fields live in columns; the per-slug detail block (`FlagshipDetail`)
 * lives in the nullable `detail` jsonb column, so a flagship can still exist as
 * a summary card without a detail page.
 */
import { cache } from "react";
import {
  Prisma,
  type Flagship as FlagshipRow,
} from "@/generated/prisma/client";
import type {
  Flagship,
  FlagshipDetail,
  FlagshipWithDetail,
} from "@/lib/data/flagships";
import type { Localized } from "@/lib/i18n/localized";
import { prisma } from "@/lib/db/prisma";
import { asJson, asLocalized } from "./casting";

function mapFlagshipRow(row: FlagshipRow): Flagship {
  return {
    name: asLocalized(row.name),
    slug: row.slug,
    city: asLocalized(row.city),
    image: row.image,
  };
}

/** `detail` is NULL for flagships whose detail page is not built out yet. */
function mapFlagshipDetail(value: unknown): FlagshipDetail | null {
  return value == null ? null : asJson<FlagshipDetail>(value);
}

/** One flagship summary by slug. */
export const getFlagship = cache(
  async (slug: string): Promise<Flagship | null> => {
    const row = await prisma.flagship.findUnique({ where: { slug } });
    return row ? mapFlagshipRow(row) : null;
  },
);

/**
 * Every flagship summary — including the ones without detail content, so they
 * still render as cards — in the curated source-array order.
 */
export const getFlagships = cache(async (): Promise<Flagship[]> => {
  const rows = await prisma.flagship.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapFlagshipRow);
});

/** One flagship's detail content, or `null` when it has none. */
export const getFlagshipDetail = cache(
  async (slug: string): Promise<FlagshipDetail | null> => {
    const row = await prisma.flagship.findUnique({
      where: { slug },
      select: { detail: true },
    });

    return row ? mapFlagshipDetail(row.detail) : null;
  },
);

/**
 * Summary merged with detail content — the `FlagshipWithDetail` shape the
 * `/flagship/[slug]` sections expect. Flagships without detail are skipped,
 * which is exactly the set `generateStaticParams` pre-renders.
 */
export const getFlagshipsWithDetail = cache(
  async (): Promise<FlagshipWithDetail[]> => {
    const rows = await prisma.flagship.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return rows.flatMap((row) => {
      const detail = mapFlagshipDetail(row.detail);
      return detail ? [{ ...mapFlagshipRow(row), ...detail }] : [];
    });
  },
);

export type FlagshipWriteInput = {
  slug: string;
  name: Localized;
  city: Localized;
  image: string;
  /** SQL NULL when the flagship has no built-out detail page yet. */
  detail: FlagshipDetail | null;
  sortOrder: number;
};

export const createFlagship = async (
  input: FlagshipWriteInput,
): Promise<string> => {
  const row = await prisma.flagship.create({
    data: {
      id: input.slug,
      slug: input.slug,
      name: asJson(input.name),
      city: asJson(input.city),
      image: input.image,
      // `detail` stays SQL NULL when the detail page is not built out yet
      // (same convention as prisma/seed.ts: Prisma.DbNull on create + update).
      detail: input.detail ? asJson(input.detail) : Prisma.DbNull,
      sortOrder: input.sortOrder,
    },
  });

  return row.id;
};

export const updateFlagship = async (
  id: string,
  input: FlagshipWriteInput,
): Promise<void> => {
  await prisma.flagship.update({
    where: { id },
    data: {
      slug: input.slug,
      name: asJson(input.name),
      city: asJson(input.city),
      image: input.image,
      detail: input.detail ? asJson(input.detail) : Prisma.DbNull,
      sortOrder: input.sortOrder,
    },
  });
};

export const deleteFlagship = async (id: string): Promise<void> => {
  await prisma.flagship.delete({ where: { id } });
};