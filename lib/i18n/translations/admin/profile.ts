/**
 * Admin-only translations — the `admin.profile.*` namespace (Pass C.2).
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 *
 * Both locales must carry the SAME key set — tests/unit/i18n/translations.test.ts
 * fails the suite if they diverge.
 */
export const profileEn = {
  "admin.profile.title": "My profile",
  "admin.profile.description":
    "Your account details and the password you sign in with.",

  "admin.profile.account.card": "Account",
  "admin.profile.field.name": "Name",
  "admin.profile.field.email": "Email",
  "admin.profile.field.role": "Role",
  "admin.profile.field.createdAt": "Member since",
  "admin.profile.field.emailVerified": "Email verified",
  "admin.profile.verified.yes": "Verified",
  "admin.profile.verified.no": "Not verified",

  "admin.profile.password.card": "Change password",
  "admin.profile.password.hint":
    "At least 12 characters. You will stay signed in on this device; every other device is signed out.",
  "admin.profile.password.current": "Current password",
  "admin.profile.password.new": "New password",
  "admin.profile.password.confirm": "Confirm new password",
  "admin.profile.password.submit": "Change password",
  "admin.profile.password.saving": "Changing…",
  "admin.profile.passwordChanged": "Password changed.",
} as const;

export const profileFa = {
  "admin.profile.title": "پروفایل من",
  "admin.profile.description":
    "اطلاعات حساب شما و گذرواژه‌ای که با آن وارد می‌شوید.",

  "admin.profile.account.card": "حساب کاربری",
  "admin.profile.field.name": "نام",
  "admin.profile.field.email": "ایمیل",
  "admin.profile.field.role": "نقش",
  "admin.profile.field.createdAt": "تاریخ عضویت",
  "admin.profile.field.emailVerified": "تأیید ایمیل",
  "admin.profile.verified.yes": "تأییدشده",
  "admin.profile.verified.no": "تأییدنشده",

  "admin.profile.password.card": "تغییر گذرواژه",
  "admin.profile.password.hint":
    "حداقل ۱۲ نویسه. در این دستگاه وارد حساب می‌مانید؛ سایر دستگاه‌ها خارج می‌شوند.",
  "admin.profile.password.current": "گذرواژه فعلی",
  "admin.profile.password.new": "گذرواژه جدید",
  "admin.profile.password.confirm": "تکرار گذرواژه جدید",
  "admin.profile.password.submit": "تغییر گذرواژه",
  "admin.profile.password.saving": "در حال تغییر…",
  "admin.profile.passwordChanged": "گذرواژه تغییر کرد.",
} as const;
