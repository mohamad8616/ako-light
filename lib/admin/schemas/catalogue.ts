import { z } from "zod";
import {
  hexColorSchema,
  linkSchema,
  nameSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/**
 * The catalogue form's rules (mirrors `CatalogueItemWriteInput`).
 *
 * There is NO slug column: `id` IS the route handle, so the editor supplies it.
 * `href` accepts "#" because several seeded catalogue cards are placeholders.
 */
export const catalogueFormSchema = z.object({
  id: slugSchema,
  title: nameSchema,
  href: linkSchema,
  coverColor: hexColorSchema,
  coverTextColor: hexColorSchema.nullable(),
  sortOrder: sortOrderSchema,
});

export type CatalogueFormValues = z.infer<typeof catalogueFormSchema>;
