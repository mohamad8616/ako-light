import { z } from "zod";

/**
 * Shared zod primitives for the admin form schemas.
 *
 * Rules only — NO per-field prose: the server action maps each issue's zod code
 * to a translated dictionary key (see lib/admin/result.ts), so changing a rule
 * never needs a translation change and the Persian-first admin never renders
 * English validation prose.
 *
 * Numbers arrive as real numbers (forms register numeric inputs with
 * `valueAsNumber: true`); there is deliberately NO `z.coerce`, so `z.input`
 * equals `z.output` and `zodResolver` types react-hook-form exactly.
 *
 * Localized values require BOTH `en` and `fa`: the DB-backed tests enforce
 * non-empty pairs for every seeded localized column, so a half-localized row is
 * surfaced as a field error instead of silently persisting data debt (the site
 * falls back to `en` at render time anyway).
 *
 * LENGTHS ARE CAPPED. Every string primitive carries a GENEROUS `.max()` (a
 * control that cannot say "too long" accepts an unbounded payload into a jsonb
 * column and into every downstream render). The caps are ceilings, not content
 * rules: they sit far above any real value (the longest seeded localized
 * paragraph is well under 2000 characters, the longest image path is a few
 * hundred), so nothing legitimate is rejected — only the abuse case is.
 */

/**
 * Length caps, in characters, shared by the primitives below so the whole schema
 * set answers "how long may this be?" consistently.
 *
 *   - {@link TEXT_MAX} — one prose paragraph / field label.
 *   - {@link NAME_MAX} — names, titles, cities, kickers: never prose.
 *   - {@link URL_MAX} — URLs and root-relative paths (2048 covers every real
 *     CDN path/query string by an order of magnitude).
 *   - {@link ID_MAX} — opaque ids (cuid/uuid) and i18n keys.
 *   - {@link CREDIT_MAX} — a credit/attribution line (a step above a name).
 *   - {@link YEAR_MAX} — the four-digit year the data stores as a string.
 *   - {@link PHONE_MAX} / {@link EMAIL_MAX} — flagship contact details.
 *   - {@link COLOR_MAX} — "#" + 8 hex digits, with room to spare.
 *   - {@link SLUG_MAX} — route handles; the longest seeded slug is a handful
 *     of words, so a 2048-char handle is a DoS lever, not a slug.
 */
export const TEXT_MAX = 2000;
export const NAME_MAX = 300;
export const URL_MAX = 2048;
export const ID_MAX = 200;
export const CREDIT_MAX = 500;
export const YEAR_MAX = 10;
export const PHONE_MAX = 40;
export const EMAIL_MAX = 254;
export const COLOR_MAX = 16;
export const SLUG_MAX = 200;

/** { en, fa } — the exact shape every localized jsonb column stores. */
export const localizedSchema = z.object({
  en: z.string().min(1).max(TEXT_MAX),
  fa: z.string().min(1).max(TEXT_MAX),
});

/** Localized[] — bio / moreDescription style paragraph lists. */
export const localizedListSchema = z.array(localizedSchema);

/** A credit/attribution line, in either representation (`Project.credits`). */
export const creditSchema = z.string().min(1).max(CREDIT_MAX);

/** A Localized-or-plain-string entry, both halves length-capped. */
export const mixedLocalizedSchema = z.union([
  localizedSchema,
  creditSchema,
]);

/** Canonical slug: lowercase alphanumerics with single hyphens, no edges. */
export const slugSchema = z
  .string()
  .min(1)
  .max(SLUG_MAX)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * The project's link policy, as a single predicate.
 *
 * The real data mixes three forms and all of them must stay saveable: absolute
 * http(s) URLs (catalogue PDFs, designer websites), root-relative paths (the
 * designer download links), and "#" placeholders.
 *
 * This is an ALLOW-LIST: `javascript:`, `data:`, `vbscript:` and anything else
 * that is neither of the three permitted shapes is rejected by construction, so
 * there is no block-list to bypass with casing, whitespace or an alternative
 * encoding.
 */
function isLinkTarget(value: string): boolean {
  return /^https?:\/\//.test(value) || value.startsWith("/") || value === "#";
}

/** A link target — non-empty, length-capped, and matching {@link isLinkTarget}. */
export const linkSchema = z
  .string()
  .min(1)
  .max(URL_MAX)
  .refine(isLinkTarget);

/**
 * A CLEARABLE link target — the same policy as {@link linkSchema}, plus an empty
 * string meaning "not configured" (fall back to the linked entity's href).
 *
 * ── Why this is not a plain `z.union([linkSchema, z.literal("")])` ───────────
 *
 * Two things made that union unhelpful in practice:
 *
 *   1. PASTED VALUES. A URL copied out of a browser or a PDF routinely arrives
 *      with a leading/trailing space or newline. The union's refine is anchored
 *      (`/^https?:\/\//`), so `" https://…"` FAILED — and the admin, who had
 *      pasted a perfectly good address, was told the value was invalid. The
 *      value is trimmed before it is judged, so paste padding is harmless.
 *
 *   2. THE MESSAGE. A union/refine failure is reported by zod as `custom`, which
 *      the shared mapping turns into the blanket "Invalid value." That tells the
 *      admin nothing about WHICH shape is expected. Emitting a dedicated
 *      `invalidLink` code instead makes both halves of the contract specific:
 *      `zodResolver` copies a zod issue's `code` straight into the react-hook-
 *      form error `type` (verified against the installed resolver), and
 *      `zodIssuesToFieldIssues` reads the same code server-side — so the field
 *      says the same useful thing whether the check ran in the browser or in the
 *      action.
 */
export const clearableLinkSchema = z
  .string()
  .trim()
  .max(URL_MAX)
  .superRefine((value, ctx) => {
    // "" is the deliberate "not configured" value — fall back to the linked
    // entity's href. The length cap above already ran, so `tooLong` still wins
    // over `invalidLink` when a value is both long and malformed.
    if (value === "" || isLinkTarget(value)) return;
    ctx.addIssue({ code: "invalidLink" as "custom" });
  });

/** An image/file reference — absolute https or a root-relative path. */
export const imageRefSchema = z
  .string()
  .min(1)
  .max(URL_MAX)
  .refine((value) => /^https?:\/\//.test(value) || value.startsWith("/"));

/**
 * A denormalized product snapshot row — the shape BOTH `Product.related` (the
 * product form's related products) and `Collection.usedProducts` (the
 * collection form's products used) store as jsonb. One schema because it is
 * one shape: a pick through the shared `ProductsUsedField` is expanded into
 * name/slug/category/image on add, and the public page renders it without a
 * join.
 */
export const relatedProductSnapshotSchema = z.object({
  name: localizedSchema,
  slug: slugSchema,
  /** The related product's category slug. */
  category: slugSchema,
  image: imageRefSchema,
});

/** The minimum number of gallery photos a collection is saved with. */
export const COLLECTION_GALLERY_MIN = 5;

/**
 * The collection gallery — `ImageListField` output (a plain `string[]`) with a
 * FLOOR. Its own issue code, like `invalidLink`: a bare `.min(5)` degrades to
 * the blanket "Invalid value.", while "add at least five photos" is the one
 * thing the operator needs to hear. The floor lives here (not in the form) so
 * the server action re-validates it too.
 */
export const collectionGallerySchema = z
  .array(imageRefSchema)
  .superRefine((value, ctx) => {
    if (value.length < COLLECTION_GALLERY_MIN) {
      ctx.addIssue({ code: "tooFewImages" as "custom" });
    }
  });

/**
 * The product form's related products — the same snapshot list, floored at
 * ONE so a saved product always has at least one related product, per the
 * admin convention that a required section is a required section.
 */
export const relatedProductsSchema = z
  .array(relatedProductSnapshotSchema)
  .superRefine((value, ctx) => {
    if (value.length < 1) {
      ctx.addIssue({ code: "tooFewRelated" as "custom" });
    }
  });

/**
 * A document reference — a PDF or PowerPoint URL, clearable.
 *
 * The catalogue's downloadable cards hold one of these, and the operator does
 * not type it: the value is whatever the upload action stored. So the policy
 * inherits {@link imageRefSchema}'s (absolute http(s) or root-relative, `""` =
 * not configured) and adds ONE rule the upload path cannot guarantee on its
 * own — the URL must end in a document extension. A row whose URL names an
 * `.exe`, or nothing at all, is either corruption or a value that did not come
 * from the upload action, and the download proxy would then re-serve bytes
 * under a `Content-Type` derived from that name. Refusing it here means the
 * public route can trust the column by construction.
 *
 * The extension is allowed to carry a query string or a fragment: a CDN link
 * with an access parameter is still the same document.
 */
export const documentRefSchema = z
  .string()
  .trim()
  .max(URL_MAX)
  .superRefine((value, ctx) => {
    if (value === "" || imageRefSchema.safeParse(value).success) {
      // "" is the deliberate "not configured" value; a plain media URL is
      // further constrained by the extension check below.
    } else {
      ctx.addIssue({ code: "invalidLink" as "custom" });
      return;
    }
    if (value === "") return;
    if (!/\.(pdf|pptx)(\?|#|$)/i.test(value)) {
      ctx.addIssue({ code: "unsupportedType" as "custom" });
    }
  });

/** The clearable form: an empty string means "not configured". */
export const clearableDocumentRefSchema = z.union([
  documentRefSchema,
  z.literal(""),
]);

/**
 * The presentable filename of a stored document.
 *
 * It travels to `Content-Disposition`, which is a HEADER — so the length is
 * capped (a header is not a place for an essay) and the characters that would
 * break a quoted value are refused outright rather than stripped: a name that
 * still contains a quote, a backslash or a control character did not come from
 * the upload action and is not worth guessing at.
 *
 * A blank value is legal — `""` means "derive it from the storage key", which
 * is what a legacy row or a hand-written migration produces.
 */
export const documentFilenameSchema = z
  .string()
  .max(NAME_MAX)
  .refine((value) => value === "" || !isHeaderUnsafeName(value));

/**
 * Whether a value carries a character that cannot reach a
 * `Content-Disposition` header: NUL through US (every control character, and
 * therefore the whole header-injection class), DEL, the double quote that would
 * close the value, and the backslash that would escape inside it.
 *
 * A codepoint loop rather than a regex class so the source carries no literal
 * control characters - see the same rule in lib/media/document-sniff.ts.
 */
function isHeaderUnsafeName(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      codePoint <= 0x1f ||
      codePoint === 0x7f ||
      codePoint === 0x22 ||
      codePoint === 0x5c
    ) {
      return true;
    }
  }
  return false;
}

/**
 * An override pair the admin can also CLEAR: both languages filled, or neither.
 *
 * ── Why "both or neither" and not `.nullable()` ─────────────────────────────
 *
 * A react-hook-form input always yields a value, so "not overridden" cannot be
 * spelled as `null` — it is spelled as an empty pair, which the owning action
 * maps to SQL NULL. Half a pair, though, is a mistake rather than a partial
 * override: `pick()` resolves a language with `value[lang] ?? value.en`, and an
 * empty string is NOT nullish — so `{ en: "X", fa: "" }` would render a BLANK
 * line on the Persian page instead of falling back to English.
 *
 * The issue lands on the half that is MISSING (so the operator sees it beside
 * the input they still have to fill) and carries its own code, so the field
 * says "fill in both languages" instead of the blanket "Invalid value." that a
 * bare refine produces — which is what made a blocked Save look like a dead
 * button.
 *
 * Lives here rather than in the homepage slot schemas because it is the shared
 * "optional override" shape: the homepage hero's headline and the project's two
 * portfolio-section captions are the same rule.
 */
export const clearableLocalizedSchema = z
  .object({ en: z.string().max(TEXT_MAX), fa: z.string().max(TEXT_MAX) })
  .superRefine((value, ctx) => {
    if (value.en === "" && value.fa !== "") {
      ctx.addIssue({ code: "localizedPair" as "custom", path: ["en"] });
    }
    if (value.fa === "" && value.en !== "") {
      ctx.addIssue({ code: "localizedPair" as "custom", path: ["fa"] });
    }
  });

/**
 * `Localized[]` override (paragraphs): rows are added and removed, and an empty
 * list means "cleared". Rows themselves must be complete — the form seeds a new
 * row empty on purpose, so a forgotten row surfaces as a field error instead of
 * silently becoming a NULL override.
 */
export const clearableLocalizedListSchema = z.array(localizedSchema);

/** Image override: an empty string means "cleared" (read the entity's image). */
export const clearableImageRefSchema = z.union([
  imageRefSchema,
  z.literal(""),
]);

/**
 * A clearable MEDIA reference — an image OR a video.
 *
 * Named for its original use, and reused verbatim for the hero's video and
 * poster rather than growing a parallel `clearableVideoRefSchema`: the rule is
 * "absolute http(s) URL, or a root-relative path", which is exactly the same
 * policy for both kinds, and a second copy of it would be a second thing to
 * keep in step. `""` still means "not configured".
 *
 * The policy is deliberately NOT "must be our storage host": a project's image
 * fields have always accepted any https URL (a designer's own site, a seeded
 * external asset), and the only place that needed a trusted-host check is the
 * catalogue PDF PROXY route, which re-serves the bytes and therefore refuses any
 * host that is not `isLiaraStorageHost`. A `<video src>` renders the URL
 * directly, so it carries no more authority than an `<img src>` and inherits
 * exactly the same rule as every other media field.
 */
export const clearableMediaRefSchema = clearableImageRefSchema;

/** Hex colour with a leading "#", 3/6/8 digits (swatches, catalogue covers). */
export const hexColorSchema = z
  .string()
  .min(1)
  .max(COLOR_MAX)
  .regex(/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?$/);

/** An opaque row id (cuid/uuid) — e.g. a product id inside a join list. */
export const idSchema = z.string().min(1).max(ID_MAX);

/**
 * A translation-key prefix, e.g. "products.coffeeTables".
 *
 * Retained even though no form schema consumes it any more: `Project.i18nKey`
 * and `ProductCategory.i18nKey` are both NOT NULL columns, and both values are
 * now DERIVED by their server actions rather than typed (see
 * `withI18nKey` in lib/admin/actions/{projects,product-categories}.ts). It
 * documents the shape those columns hold, so a future caller that does need to
 * validate one has the rule to hand instead of re-inventing it.
 */
export const i18nKeySchema = z.string().min(1).max(ID_MAX);

/** A display name / short label (names, titles, cities, categories, codes). */
export const nameSchema = z.string().min(1).max(NAME_MAX);

/** A contact phone number as stored by the flagship detail block. */
export const phoneSchema = z.string().min(1).max(PHONE_MAX);

/** A contact e-mail address as stored by the flagship detail block. */
export const emailSchema = z.string().min(1).max(EMAIL_MAX);

/** A four-digit year stored as a string ("2026"), never a number. */
export const yearSchema = z.string().min(1).max(YEAR_MAX);

/** Zero-based display position. */
export const sortOrderSchema = z.number().int().min(0);

/**
 * Any non-empty plain string (names, codes, ids, i18n keys, phone/email).
 *
 * Kept as the lenient fallback for genuinely free-form values so it can never
 * reject real data; prefer a narrower primitive above when the field's shape is
 * known ({@link nameSchema}, {@link idSchema}, {@link phoneSchema}, …).
 */
export const nonEmptySchema = z.string().min(1).max(TEXT_MAX);
