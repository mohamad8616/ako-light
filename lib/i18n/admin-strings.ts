import { adminEn, adminFa } from "./translations/admin";
import type { Language, TranslationKey } from "./translations";

/**
 * The admin-only dictionary — CLIENT-SAFE.
 *
 * This module deliberately imports NOTHING but the admin dictionary itself.
 * It is the counterpart to `./shell-translations` and `./translations`: the
 * client (`components/admin/AdminLanguageProvider.tsx`) imports this file, so
 * anything reachable from here lands in the admin client chunk.
 *
 * WHY IT IS SEPARATE FROM `./admin-translations`
 *
 * `admin-translations` also owns `getAdminDictionary()`, which merges the admin
 * dictionary ON TOP of the public one and is used by admin SERVER components.
 * That merge needs the public `translations` object — and while it lived in the
 * same module, the client import pulled the whole public dictionary into the
 * admin chunk. Measured: admin routes carried 47,123 gz of dictionary (public
 * en+fa AND admin en+fa) to render an admin screen that resolves only `admin.*`
 * keys.
 *
 * Splitting the client-safe half out is what lets the public dictionary stay on
 * the server for admin routes. Verified before the split: of the keys admin
 * components actually resolve, 297 are admin keys and **0** are public keys —
 * including every dynamic lookup (`t(\`admin.error.${code}\`)`, `t(item.labelKey)`,
 * the `labelKey`/`hintKey` metadata in lib/admin/*).
 */
export const adminTranslations: Record<Language, Record<string, string>> = {
  en: adminEn,
  fa: adminFa,
};

/** Keys that exist ONLY in the admin dictionary. */
export type AdminOnlyKey = keyof typeof adminEn;

/**
 * Every key an admin screen may render.
 *
 * Admin screens resolve only `admin.*` keys in practice (see above), but the
 * union is kept so the type stays honest if a public key is ever needed.
 */
export type AdminTranslationKey = TranslationKey | AdminOnlyKey;
