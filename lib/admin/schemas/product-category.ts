import { z } from "zod";
import {
  i18nKeySchema,
  localizedSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/** The product-category form's rules (mirrors `ProductCategoryWriteInput`). */
export const productCategoryFormSchema = z.object({
  slug: slugSchema,
  /** Translation-key prefix, e.g. "products.coffeeTables". */
  i18nKey: i18nKeySchema,
  name: localizedSchema,
  sortOrder: sortOrderSchema,
});

export type ProductCategoryFormValues = z.infer<
  typeof productCategoryFormSchema
>;
