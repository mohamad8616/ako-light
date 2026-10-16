"use server";

/**
 * Server actions for the reusable DOCUMENT picker.
 *
 * Same contract as every admin action module: `requireAdminAccess()` FIRST
 * (server functions are reachable by direct POST, so the client dialog is never
 * the authorization), then validate, then read through the repository.
 *
 * Kept separate from `lib/admin/actions/media.ts` on purpose: that module
 * serves the IMAGE/VIDEO library, and documents are not Media rows (see the
 * `CatalogueDocument` note in prisma/schema.prisma). Sharing one action would
 * mean one endpoint whose shape depends on a `kind` flag, and the two list
 * sources have nothing in common beyond paging.
 */
import { requireAdminAccess } from "@/lib/admin/access";
import { actionOk, type ActionResult } from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import {
  DEFAULT_DOCUMENT_PAGE_SIZE,
  listCatalogueDocuments,
  type CatalogueDocumentDto,
} from "@/lib/repositories/catalogue-documents";

/** What the picker dialog renders per row. */
export interface DocumentPickerItem {
  id: string;
  url: string;
  filename: string;
  size: number;
  extension: string;
}

/**
 * One page of registered documents for the picker dialog.
 *
 * Search and paging run in the DATABASE, mirroring `listMediaForPickerAction`:
 * the dialog is handed one page, never the whole table, and the filter is
 * applied to the same query so the total stays truthful.
 */
export async function listDocumentsForPickerAction(input: {
  search?: string;
  page?: number;
}): Promise<
  ActionResult<{ items: DocumentPickerItem[]; total: number; page: number }>
> {
  await requireAdminAccess();

  const page = Math.max(1, Math.floor(input.page ?? 1));
  const search = input.search?.trim() || undefined;

  try {
    const { items, total } = await listCatalogueDocuments({
      search,
      take: DEFAULT_DOCUMENT_PAGE_SIZE,
      skip: (page - 1) * DEFAULT_DOCUMENT_PAGE_SIZE,
    });

    return actionOk({
      items: items.map(toPickerItem),
      total,
      page,
    });
  } catch (error) {
    return toActionResult(error);
  }
}

function toPickerItem(row: CatalogueDocumentDto): DocumentPickerItem {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    size: row.size,
    extension: row.extension,
  };
}
