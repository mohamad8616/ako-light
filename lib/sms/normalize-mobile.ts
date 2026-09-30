/**
 * Iranian mobile normalisation shared by every sms.ir caller.
 *
 * Extracted from lib/auth/sms.ts so the OTP path and the order-receipt path
 * cannot drift: sms.ir rejects a number with the trunk prefix, and a
 * second copy of this rule would be a silent delivery failure the day one of
 * them changed.
 *
 * sms.ir expects a 10-digit national number: digits only, no "+", no leading
 * "0", no country-code prefix. Examples:
 *   "0919xxxx904"   → "919xxxx904"
 *   "+98919xxxx904" → "919xxxx904"
 *   "0098919xxxx904"→ "919xxxx904"
 *   "919xxxx904"    → "919xxxx904"
 */
export function normalizeIranianMobile(phoneNumber: string): string {
  let digits = phoneNumber.replace(/[^0-9]/g, "");

  // Country code, in the forms it actually arrives in. `+98…` keeps its
  // digits as "98…" once the "+" is stripped, and the international access
  // prefix shows up as "0098…". Both MUST be removed: a number still carrying
  // "98" is 12 digits, which sms.ir rejects outright — and better-auth stores
  // phone-account numbers in E.164 form, so this is the common case, not an
  // edge case.
  //
  // The `98…` branch requires exactly 12 digits (98 + a 10-digit national
  // number) so a genuine 10-digit national number is never mistaken for one
  // with a country code.
  if (digits.startsWith("0098")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("98") && digits.length === 12) {
    digits = digits.slice(2);
  }

  // Iranian mobiles are 11 digits with a leading 0 (09xxxxxxxxx).
  if (digits.startsWith("0") && digits.length === 11) {
    return digits.slice(1); // drop the leading 0 → 10 digits
  }
  // Already 10 digits, no leading zero → pass through.
  if (digits.length === 10) {
    return digits;
  }
  // Fallback: return whatever digits we have and let sms.ir reject if needed.
  return digits;
}
