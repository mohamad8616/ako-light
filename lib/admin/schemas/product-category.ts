import { z } from "zod";
import {
  localizedSchema,
  nonEmptySchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/** The product-category form's rules (mirrors `ProductCategoryWriteInput`). */
export const productCategoryFormSchema = z.object({
  slug: slugSchema,
  /** Translation-key prefix, e.g. "products.coffeeTables". */
  i18nKey: nonEmptySchema,
  name: localizedSchema,
  sortOrder: sortOrderSchema,
});

export type ProductCategoryFormValues = z.infer<
  typeof productCategoryFormSchema
>;
