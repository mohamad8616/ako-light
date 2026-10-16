"use server";

/**
 * Server actions for the catalogue admin section.
 *
 * CatalogueItem has NO slug column — its `id` IS the route handle, so the form
 * supplies it. There is no SlugHistory coverage for catalogue items (they are
 * not part of CatalogModelType).
 *
 * A catalogue card's downloadable file is a real uploaded PDF/PPTX, never an
 * admin-pasted link. The legacy `href` column stays in the database and is left
 * untouched while an existing row has no uploaded replacement; new rows use
 * `"#"` until their file is uploaded. All document URLs are re-checked as OUR
 * Liara `media/` objects before persistence, even though the upload action
 * already issued them — a forged Server Action payload must not turn the public
 * download route into a proxy for arbitrary URLs.
 */
import { requireAdminAccess } from "@/lib/admin/access";
import { deleteStorageUrls, removedUrls, storageKeyFromUrl } from "@/lib/admin/storage-cleanup";
import { revalidateCatalog } from "@/lib/admin/revalidate";
import {
  actionFail,
  actionOk,
  zodIssuesToFieldIssues,
  type ActionResult,
  type AdminErrorCode,
} from "@/lib/admin/result";
import { toActionResult } from "@/lib/admin/result-server";
import {
  catalogueCreateFormSchema,
  catalogueFormSchema,
  type CatalogueFormValues,
} from "@/lib/admin/schemas/catalogue";
import { isLiaraStorageHost } from "@/lib/media/storage";
import {
  createCatalogueItem,
  deleteCatalogueItem,
  getCatalogueItemAdminDetail,
  updateCatalogueItem,
} from "@/lib/repositories/catalogue";

/** A submitted document must be an app-owned Liara object under `media/`. */
function isOwnedDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      isLiaraStorageHost(url.hostname) &&
      storageKeyFromUrl(value) !== null
    );
  } catch {
    return false;
  }
}

function validateOwnedDocument(pdfUrl: string): AdminErrorCode | null {
  if (!pdfUrl) return null;
  return isOwnedDocumentUrl(pdfUrl) ? null : "unsupportedType";
}

/** Create a catalogue card. A new card must have an uploaded document. */
export async function createCatalogueAction(
  input: CatalogueFormValues,
): Promise<ActionResult<string>> {
  await requireAdminAccess();

  const parsed = catalogueCreateFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  const ownershipFailure = validateOwnedDocument(parsed.data.pdfUrl);
  if (ownershipFailure) return actionFail(ownershipFailure);

  try {
    const id = await createCatalogueItem({
      ...parsed.data,
      pdfUrl: parsed.data.pdfUrl,
      pdfName: parsed.data.pdfName,
    });
    revalidateCatalog("catalogue", { id });
    revalidateCatalog("homepage");
    return actionOk(id);
  } catch (error) {
    return toActionResult(error);
  }
}

/** Update a card; blank document means clear a saved upload, or retain legacy href. */
export async function updateCatalogueAction(
  id: string,
  input: CatalogueFormValues,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  const parsed = catalogueFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail("invalid", zodIssuesToFieldIssues(parsed.error));
  }

  const ownershipFailure = validateOwnedDocument(parsed.data.pdfUrl);
  if (ownershipFailure) return actionFail(ownershipFailure);

  try {
    const before = await getCatalogueItemAdminDetail(id);
    if (!before) return actionFail("notFound");

    const pdfUrl = parsed.data.pdfUrl || null;
    const pdfName = pdfUrl ? parsed.data.pdfName || null : null;
    // If an uploaded file is removed, make that deliberate choice stick: do not
    // resurrect a stale legacy href on the public page. If this is a legacy row
    // with no uploaded file, blank is simply "no replacement yet" and its
    // existing href remains as a compatibility fallback.
    const href = before.pdfUrl && !pdfUrl ? "#" : undefined;

    await updateCatalogueItem(id, {
      ...parsed.data,
      href,
      pdfUrl,
      pdfName,
    });

    // Sweep only after the DB no longer points at the object. External legacy
    // links fail the `media/` ownership filter and are never deleted.
    await deleteStorageUrls(removedUrls([before.pdfUrl], [pdfUrl]));

    revalidateCatalog("catalogue", { id });
    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}

/** Delete a card and its uploaded object, without touching external legacy URLs. */
export async function destroyCatalogueAction(
  id: string,
): Promise<ActionResult<undefined>> {
  await requireAdminAccess();

  try {
    const before = await getCatalogueItemAdminDetail(id);
    if (!before) return actionFail("notFound");

    await deleteCatalogueItem(id);
    await deleteStorageUrls([before.pdfUrl].filter((url): url is string => Boolean(url)));

    revalidateCatalog("catalogue");
    revalidateCatalog("homepage");
    return actionOk(undefined);
  } catch (error) {
    return toActionResult(error);
  }
}
