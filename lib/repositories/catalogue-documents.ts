import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * The uploaded-document registry (PDF/PowerPoint).
 *
 * SERVER-ONLY, and deliberately separate from `lib/repositories/media.ts`:
 * documents are not Media rows. See the `CatalogueDocument` note in
 * prisma/schema.prisma for why the two are distinct species.
 *
 * The row is a REGISTRY, not an owner. Nothing here deletes stored objects or
 * cascades on delete — the URL columns that reference a document
 * (`CatalogueItem.pdfUrl`, `Product.downloads[].href`) remain the source of
 * truth for what a page renders. This table answers two questions those columns
 * cannot: "what documents have we uploaded?" and "is this one already here?".
 */

/** One registered document, as the admin picker and the guard need it. */
export interface CatalogueDocumentDto {
  id: string;
  filename: string;
  size: number;
  url: string;
  storageKey: string;
  extension: string;
  createdAt: string;
}

const DOCUMENT_SELECT = {
  id: true,
  filename: true,
  size: true,
  url: true,
  storageKey: true,
  extension: true,
  createdAt: true,
} satisfies Prisma.CatalogueDocumentSelect;

type CatalogueDocumentRow = Prisma.CatalogueDocumentGetPayload<{
  select: typeof DOCUMENT_SELECT;
}>;

function toDocumentDto(row: CatalogueDocumentRow): CatalogueDocumentDto {
  return {
    id: row.id,
    filename: row.filename,
    size: row.size,
    url: row.url,
    storageKey: row.storageKey,
    extension: row.extension,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface ListDocumentsOptions {
  /** Case-insensitive filename search, applied in the DATABASE. */
  search?: string;
  take?: number;
  skip?: number;
}

export interface DocumentPage {
  items: CatalogueDocumentDto[];
  total: number;
}

/** Default page size for the picker dialog. */
export const DEFAULT_DOCUMENT_PAGE_SIZE = 30;

/**
 * One page of registered documents, newest first, with a DB-side search.
 *
 * Paged in the database rather than filtered client-side, for the same reason
 * the media picker is: a client-side filter over one page would show a grid
 * that lies about what exists.
 */
export async function listCatalogueDocuments({
  search,
  take = DEFAULT_DOCUMENT_PAGE_SIZE,
  skip = 0,
}: ListDocumentsOptions = {}): Promise<DocumentPage> {
  const where: Prisma.CatalogueDocumentWhereInput = search?.trim()
    ? { filename: { contains: search.trim(), mode: "insensitive" } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.catalogueDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: DOCUMENT_SELECT,
    }),
    prisma.catalogueDocument.count({ where }),
  ]);

  return { items: rows.map(toDocumentDto), total };
}

/**
 * The oldest registry row matching this filename AND byte size, or null.
 *
 * The duplicate guard. Both must match: the same NAME with a different size is
 * a genuinely different file (two revisions both called `catalogue.pdf`), and
 * the same size under a different name is what a deliberate rename looks like —
 * and a rename is the documented way past this check, exactly as in the image
 * library. Mirrors `findMediaByFilenameAndSize`.
 */
export async function findDocumentByFilenameAndSize(
  filename: string,
  size: number,
  db: Prisma.TransactionClient = prisma,
): Promise<CatalogueDocumentDto | null> {
  if (!filename || !Number.isFinite(size) || size <= 0) return null;

  const row = await db.catalogueDocument.findFirst({
    where: { filename, size },
    select: DOCUMENT_SELECT,
    orderBy: { createdAt: "asc" },
  });

  return row ? toDocumentDto(row) : null;
}

export interface RegisterDocumentInput {
  filename: string;
  size: number;
  url: string;
  storageKey: string;
  extension: string;
}

/**
 * Records an uploaded document, tolerating a re-registration.
 *
 * Idempotent on `storageKey` (unique): if the object is already registered, the
 * existing row is returned rather than throwing. A browser retry or a
 * double-submit therefore cannot create a second row for one stored object, and
 * the caller never has to distinguish "created" from "already there" — both
 * mean "this document is registered".
 */
export async function registerCatalogueDocument(
  input: RegisterDocumentInput,
  db: Prisma.TransactionClient = prisma,
): Promise<CatalogueDocumentDto> {
  const row = await db.catalogueDocument.upsert({
    where: { storageKey: input.storageKey },
    create: {
      filename: input.filename,
      size: input.size,
      url: input.url,
      storageKey: input.storageKey,
      extension: input.extension,
    },
    // Nothing to change: the stored object and its metadata are identical. An
    // empty update keeps the original `createdAt`, so re-registering does not
    // reshuffle the picker's newest-first order.
    update: {},
    select: DOCUMENT_SELECT,
  });

  return toDocumentDto(row);
}

/** One document by id — used by the picker's "select" confirmation. */
export const getCatalogueDocument = cache(
  async (id: string): Promise<CatalogueDocumentDto | null> => {
    const row = await prisma.catalogueDocument.findUnique({
      where: { id },
      select: DOCUMENT_SELECT,
    });
    return row ? toDocumentDto(row) : null;
  },
);
