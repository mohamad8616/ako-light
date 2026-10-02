/**
 * Admin-only translations — the `admin.settings.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const settingsEn = {
  "admin.settings.branding": "Branding",
  "admin.settings.contact": "Contact information",
  "admin.settings.social": "Social links",
  "admin.settings.socialHint":
    "Only active links appear in the footer. Order controls display position.",
  "admin.settings.socialEmpty": "No social links yet.",
  "admin.settings.socialAdd": "Add a link",
  "admin.settings.socialPlatform": "Platform key",
  "admin.settings.socialLabel": "Label",
  "admin.settings.socialUrl": "URL",
  "admin.settings.socialActive": "Visible in the footer",
  "admin.settings.socialEnabled": "Link shown",
  "admin.settings.socialDisabled": "Link hidden",
  "admin.settings.field.logo": "Logo",
  "admin.settings.field.logoHint": "Shown in the navbar and footer.",
  "admin.settings.field.logoFallback":
    "No custom logo — the site name is shown as text.",
  "admin.settings.field.favicon": "Favicon",
  "admin.settings.field.faviconHint": "Shown in the browser tab.",
  "admin.settings.field.faviconFallback":
    "No custom favicon — the built-in one is used.",
  "admin.settings.field.siteName": "Site name",
  "admin.settings.field.siteDescription": "Site description",
  "admin.settings.field.phone": "Phone",
  "admin.settings.field.email": "Email",
  "admin.settings.field.address": "Address",
  "admin.settings.selectMedia": "Select from library",
  "admin.settings.changeMedia": "Change image",
  "admin.settings.clearMedia": "Clear",
  "admin.settings.pickerTitle": "Select media",
  "admin.settings.pickerDescription":
    "Choose an image from the media library.",
  "admin.settings.pickerSelect": "Select",
  "admin.settings.pickerLoading": "Loading media…",

} as const;

export const settingsFa = {
  "admin.settings.branding": "برندینگ",
  "admin.settings.contact": "اطلاعات تماس",
  "admin.settings.social": "شبکه‌های اجتماعی",
  "admin.settings.socialHint":
    "فقط پیوندهای فعال در فوتر نمایش داده می‌شوند. ترتیب، جایگاه نمایش را تعیین می‌کند.",
  "admin.settings.socialEmpty": "هنوز پیوندی ثبت نشده است.",
  "admin.settings.socialAdd": "افزودن پیوند",
  "admin.settings.socialPlatform": "کلید پلتفرم",
  "admin.settings.socialLabel": "برچسب",
  "admin.settings.socialUrl": "نشانی",
  "admin.settings.socialActive": "نمایش در فوتر",
  "admin.settings.socialEnabled": "پیوند نمایش داده می‌شود",
  "admin.settings.socialDisabled": "پیوند پنهان شد",
  "admin.settings.field.logo": "لوگو",
  "admin.settings.field.logoHint": "در نوار بالا و فوتر نمایش داده می‌شود.",
  "admin.settings.field.logoFallback":
    "لوگوی اختصاصی وجود ندارد — نام سایت به‌صورت متنی نمایش داده می‌شود.",
  "admin.settings.field.favicon": "فاوآیکون",
  "admin.settings.field.faviconHint": "در زبانه مرورگر نمایش داده می‌شود.",
  "admin.settings.field.faviconFallback":
    "فاوآیکون اختصاصی وجود ندارد — نسخه پیش‌فرض استفاده می‌شود.",
  "admin.settings.field.siteName": "نام سایت",
  "admin.settings.field.siteDescription": "توضیح سایت",
  "admin.settings.field.phone": "تلفن",
  "admin.settings.field.email": "ایمیل",
  "admin.settings.field.address": "نشانی",
  "admin.settings.selectMedia": "انتخاب از کتابخانه",
  "admin.settings.changeMedia": "تغییر تصویر",
  "admin.settings.clearMedia": "پاک کردن",
  "admin.settings.pickerTitle": "انتخاب رسانه",
  "admin.settings.pickerDescription": "تصویری از کتابخانه رسانه انتخاب کنید.",
  "admin.settings.pickerSelect": "انتخاب",
  "admin.settings.pickerLoading": "در حال بارگذاری رسانه…",

} as const;
