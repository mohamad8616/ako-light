import { z } from "zod";
import {
  clearableDocumentRefSchema,
  documentFilenameSchema,
  documentRefSchema,
  hexColorSchema,
  nameSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/**
 * Shared fields for the catalogue form.
 *
 * There is NO slug column: `id` IS the route handle, so the editor supplies it.
 * `href` is deliberately absent: new catalogue cards use an uploaded PDF or
 * PowerPoint file, not a pasted link. The database's old `href` column stays
 * untouched for legacy/external rows — editing their other fields does not
 * erase their existing download until a file is uploaded.
 */
const catalogueFormFields = z.object({
  id: slugSchema,
  title: nameSchema,
  pdfUrl: clearableDocumentRefSchema,
  pdfName: documentFilenameSchema,
  coverColor: hexColorSchema,
  coverTextColor: hexColorSchema.nullable(),
  sortOrder: sortOrderSchema,
});

/** Edit allows an older row with no uploaded file until the operator replaces it. */
export const catalogueFormSchema = catalogueFormFields;

/** A new catalogue card must have a real uploaded document. */
export const catalogueCreateFormSchema = catalogueFormFields.extend({
  pdfUrl: documentRefSchema.pipe(z.string().min(1)),
  pdfName: documentFilenameSchema.pipe(z.string().min(1)),
});

export type CatalogueFormValues = z.infer<typeof catalogueFormSchema>;
