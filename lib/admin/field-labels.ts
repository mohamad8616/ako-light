/**
 * Form field path → dictionary label key — the shared vocabulary that lets a
 * validation failure NAME the fields it means.
 *
 * WHY THIS EXISTS
 *
 * A blocked save used to produce one identical toast ("check the highlighted
 * fields"), so the operator had to hunt the page for the empty input. The
 * per-field red messages answer that visually, but the TOAST still needs to
 * say which fields — and react-hook-form only knows paths ("description.p1",
 * "related"), never labels.
 *
 * This registry maps the paths the FORMS actually submit to the very same
 * `admin.*` label keys those forms render, so the toast is derived from one
 * source of truth: a label is renamed in the dictionary and the toast follows.
 *
 * Pure and Prisma-free on purpose: it is imported by `useCrudSubmit` (a client
 * hook) and must stay out of the server-only graph.
 */

/**
 * Path prefix → label key.
 *
 * Keys are matched LONGEST-FIRST, so "description.p1" resolves to "Paragraph
 * 1" before "description" resolves to "Description". Numeric segments (array
 * indices) are stripped before matching, so "images.0.url" → "images".
 *
 * Covers the collection and product forms (the two with the richest field
 * sets); every other form's fields fail the lookup and fall back to the
 * generic message — see `resolveInvalidFieldLabels`.
 */
const FIELD_LABEL_KEYS: Record<string, string> = {
  // ── Shared identity block (collection + product forms) ──
  name: "admin.product.field.name",
  slug: "admin.product.field.slug",
  image: "admin.designer.field.image",
  sortOrder: "admin.product.field.sortOrder",
  // ── Collection form ──
  year: "admin.collection.field.year",
  gallery: "admin.collection.field.gallery",
  usedProducts: "admin.collection.field.productsUsed",
  description: "admin.product.field.description",
  "description.p1": "admin.collection.field.descriptionP1",
  "description.p2": "admin.collection.field.descriptionP2",
  "description.p3": "admin.collection.field.descriptionP3",
  // ── Product form ──
  categoryId: "admin.product.field.category",
  designerId: "admin.product.field.designer",
  priceEur: "admin.product.field.priceEur",
  priceToman: "admin.product.field.priceToman",
  quantity: "admin.product.field.quantity",
  existsInStore: "admin.product.field.existsInStore",
  hoverImage: "admin.product.field.hoverImage",
  heroImage: "admin.product.field.heroImage",
  images: "admin.product.field.images",
  moreInfo: "admin.product.field.moreInfo",
  downloads: "admin.product.field.downloads",
  related: "admin.product.field.related",
};

/** The label key for a form field path, or undefined when it is not known. */
export function labelKeyForFieldPath(path: string): string | undefined {
  const segments = path.split(".").filter((segment) => !/^\d+$/.test(segment));
  for (let take = segments.length; take > 0; take -= 1) {
    const candidate = segments.slice(0, take).join(".");
    const labelKey = FIELD_LABEL_KEYS[candidate];
    if (labelKey) return labelKey;
  }
  return undefined;
}

/**
 * The codes a SCHEMA produces — an unfilled or undersized input — as opposed to
 * the server-born codes (slugTaken, notFound, inUse…) that already have a
 * specific sentence of their own and must keep it.
 */
const FORM_FILL_CODES: ReadonlySet<string> = new Set([
  "required",
  "invalid",
  "invalidLink",
  "localizedPair",
  "tooLong",
  "tooFewImages",
  "tooFewRelated",
]);

/** One structured field issue, in whichever half of the contract it arrived. */
export interface FieldIssueLike {
  field: string;
  code: string;
}

/**
 * The label keys to name in a "please complete…" toast.
 *
 * Returns an empty list when the issues are NOT plain form-fill failures —
 * then the caller shows the specific server message instead of a list. Paths
 * that resolve to no known label are skipped (their inline red message covers
 * them); when NOTHING resolves the caller falls back to the generic message.
 */
export function formFillIssueLabelKeys(
  issues: readonly FieldIssueLike[],
): string[] {
  const keys: string[] = [];
  for (const issue of issues) {
    if (!FORM_FILL_CODES.has(issue.code)) return [];
    const key = labelKeyForFieldPath(issue.field);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Every leaf path inside a react-hook-form error tree.
 *
 * A node that carries a `type` IS a leaf (that is the shape zodResolver
 * writes); anything else is walked deeper. `root` is skipped: it holds
 * form-level errors that carry no field path.
 */
export function invalidFieldPaths(errors: unknown, prefix = ""): string[] {
  if (!errors || typeof errors !== "object") return [];
  const paths: string[] = [];
  for (const [key, value] of Object.entries(
    errors as Record<string, unknown>,
  )) {
    if (key === "root") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "type" in value) {
      paths.push(path);
    } else {
      paths.push(...invalidFieldPaths(value, path));
    }
  }
  return paths;
}

/** The label keys named by a client-side (react-hook-form) error tree. */
export function labelKeysForFormErrors(errors: unknown): string[] {
  const keys: string[] = [];
  for (const path of invalidFieldPaths(errors)) {
    const key = labelKeyForFieldPath(path);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Resolved, localized labels joined for the toast message.
 *
 * The separator follows the locale (Persian uses the Arabic comma), so the
 * list reads naturally in the language the message is rendered in.
 */
export function formatFieldLabelList(
  t: (key: string) => string,
  keys: readonly string[],
  lang: string,
): string {
  const separator = lang === "fa" ? "، " : ", ";
  return keys.map((key) => t(key)).join(separator);
}
