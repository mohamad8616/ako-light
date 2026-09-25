import { z } from "zod";
import {
  imageRefSchema,
  localizedSchema,
  nameSchema,
  slugSchema,
  sortOrderSchema,
} from "./common";

/**
 * The app-level union lib/data/materials.ts uses. The Prisma enum member
 * `stone_composite` is stored as "stone-composite" (@map) — forms only ever see
 * the hyphenated value, the repository maps both ways.
 */
export const MATERIAL_TYPE_VALUES = [
  "stone",
  "metal",
  "glass",
  "wood",
  "fabric",
  "leather",
  "marble",
  "stone-composite",
] as const;

/** The material form's rules (mirrors `MaterialWriteInput`). */
export const materialFormSchema = z.object({
  slug: slugSchema,
  name: localizedSchema,
  /** Free-form display group; the public page groups by it. */
  category: nameSchema,
  type: z.enum(MATERIAL_TYPE_VALUES),
  image: imageRefSchema,
  description: localizedSchema,
  sortOrder: sortOrderSchema,
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;
