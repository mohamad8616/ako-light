import { z } from "zod";
import {
  EMAIL_MAX,
  ID_MAX,
  PHONE_MAX,
  idSchema,
  linkSchema,
  localizedSchema,
  nameSchema,
  sortOrderSchema,
} from "./common";

/**
 * Pass 13.5D — the site-settings and social-link form rules.
 *
 * Validation lives here (never in the client): a server action is reachable by
 * direct POST, so the form is never trusted. Every rule below is what the
 * SERVER enforces.
 */

/**
 * A text field the admin may leave blank.
 *
 * The column is nullable, so "no phone number" must have exactly ONE
 * representation: `null`. A blank input is normalised to null instead of being
 * persisted as `""`, which would be a second, indistinguishable way of saying
 * the same thing.
 */
const optionalText = (max: number) =>
  z
    .union([z.string().min(1).max(max), z.literal("")])
    .nullable()
    .transform((value) => (value === "" || value === null ? null : value));

/**
 * The platform key: a machine value, not free prose.
 *
 * Restricted to a lowercase slug shape so it can be matched against the
 * frontend icon map — but NOT restricted to a fixed enumeration. An unknown
 * platform is a legitimate future state (the plan requires adding platforms
 * without a code change) and renders a fallback icon, so the shape is checked
 * and the value is not.
 */
const PLATFORM_MAX = 40;
const platformSchema = z
  .string()
  .min(1)
  .max(PLATFORM_MAX)
  .regex(/^[a-z0-9_-]+$/, "lowercase letters, digits, dash or underscore");

export const siteSettingsFormSchema = z.object({
  siteName: localizedSchema,
  siteDescription: localizedSchema,
  /**
   * Media IDs, never URLs. Nullable: "no custom logo" falls back to the text
   * wordmark, and "no custom favicon" falls back to the static one.
   */
  logoMediaId: idSchema.nullable(),
  faviconMediaId: idSchema.nullable(),
  phone: optionalText(PHONE_MAX),
  email: optionalText(EMAIL_MAX),
  address: localizedSchema.nullable(),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

export const socialLinkFormSchema = z.object({
  platform: platformSchema,
  label: nameSchema,
  /** Bounded by `linkSchema` (URL_MAX) — this is rendered as an anchor href. */
  url: linkSchema,
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

export type SocialLinkFormValues = z.infer<typeof socialLinkFormSchema>;

/** An id carried by the delete / toggle / reorder actions. */
export const socialLinkIdSchema = z.string().min(1).max(ID_MAX);
