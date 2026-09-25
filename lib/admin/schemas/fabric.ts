import { z } from "zod";
import {
  hexColorSchema,
  nameSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/**
 * The fabric form's rules (mirrors `FabricItemWriteInput`).
 *
 * There is NO slug column: `id` IS the route handle, so the editor supplies it
 * and it obeys the same character rules as a slug.
 */
export const fabricFormSchema = z.object({
  id: slugSchema,
  name: nameSchema,
  code: nameSchema,
  category: nameSchema,
  /** Swatch colour from the static data, e.g. "#726A50". */
  swatchColor: hexColorSchema,
  sortOrder: sortOrderSchema,
});

export type FabricFormValues = z.infer<typeof fabricFormSchema>;
