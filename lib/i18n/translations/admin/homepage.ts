/**
 * Admin-only translations — the `admin.homepage.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const homepageEn = {
  "admin.homepage.edit": "Configure",
  "admin.homepage.card.content": "Content",
  "admin.homepage.card.override": "Override content",
  "admin.homepage.card.overrideHint":
    "Anything you fill in here is shown on the homepage. Leave a field empty to use the linked entity's own value.",
  "admin.homepage.field.enabled": "Enabled",
  "admin.homepage.field.enabledHint": "Render this banner on the homepage.",
  "admin.homepage.field.mode": "Content mode",
  "admin.homepage.field.modeHint":
    "Reference shows the linked entity's own copy and image; override uses the fields below.",
  "admin.homepage.mode.reference": "Reference",
  "admin.homepage.mode.override": "Override",
  "admin.homepage.field.flagship": "Flagship",
  "admin.homepage.field.project": "Project",
  "admin.homepage.field.catalogueItem": "Catalogue item",
  "admin.homepage.field.catalogueItemHint":
    "The section's title and download link come from this item.",
  "admin.homepage.card.catalogueCopy": "Section paragraph",
  "admin.homepage.card.catalogueCopyHint":
    "Shown under the section title. Leave it empty to use the built-in default text.",
  "admin.homepage.card.catalogueCta": "Call to action",
  "admin.homepage.card.catalogueCtaHint":
    "The button under the section. Upload a PDF and the button downloads it; a link is the alternative. Leave everything empty to keep the built-in label and the linked catalogue's own PDF.",
  "admin.homepage.field.ctaPdf": "Catalogue PDF",
  "admin.homepage.field.ctaLabel": "Button label",
  "admin.homepage.field.ctaHref": "Button link",
  "admin.homepage.field.ctaHrefHint":
    "Used only when no PDF is uploaded. An https:// address, or a path on this site starting with /. Anything else is rejected.",
  "admin.homepage.field.ctaHint":
    "The call to action always links to this entity's public page.",
  "admin.homepage.field.kicker": "Kicker",
  "admin.homepage.field.label": "Section label",
  "admin.homepage.field.labelHint":
    "The word printed above the photo, e.g. “H-Life”. Leave it empty to keep the built-in word.",
  "admin.homepage.field.title": "Title",
  "admin.homepage.field.paragraphs": "Paragraphs",
  "admin.homepage.field.text": "Text",
  "admin.homepage.field.image": "Image",
  "admin.homepage.status.enabled": "Live",
  "admin.homepage.status.disabled": "Hidden",
  "admin.homepage.status.notConfigured": "Not configured",
  "admin.homepage.updatedAt": "Last saved",
  "admin.homepage.slot.flagship-one": "Flagship banner",
  "admin.homepage.slot.flagship-one.description":
    "The large flagship banner near the top of the homepage.",
  "admin.homepage.slot.project-banner": "Project banner",
  "admin.homepage.slot.project-banner.description":
    "The featured project banner.",
  "admin.homepage.slot.project-dark-background": "Project (dark background)",
  "admin.homepage.slot.project-dark-background.description":
    "The full-width dark project section.",
  "admin.homepage.slot.home-collection": "Home Collection banner",
  "admin.homepage.slot.home-collection.description":
    "Standalone banner linking to the collections index.",
  "admin.homepage.slot.catalogue": "Catalogue section",
  "admin.homepage.slot.catalogue.description":
    "The catalogue download section.",

  // Pass D.1 — the hero and the video section. Both are standalone content with
  // no linked entity, so their cards read as "is it overridden, and with what".
  "admin.homepage.slot.hero": "Hero",
  "admin.homepage.slot.hero.description":
    "The full-screen video hero at the top of the homepage.",
  "admin.homepage.slot.video": "Video section",
  "admin.homepage.slot.video.description":
    "The full-width video section further down the homepage.",
  "admin.homepage.card.heroMedia": "Media",
  "admin.homepage.card.heroMediaHint":
    "There is no built-in hero video: whatever you upload here is what the homepage plays.",
  "admin.homepage.card.heroCopy": "Headline",
  "admin.homepage.card.heroCopyHint":
    "Leave a field empty to keep the built-in text for that line.",
  "admin.homepage.card.heroCta": "Button",
  "admin.homepage.card.heroCtaHint":
    "Leave a field empty to keep the built-in label and destination.",
  "admin.homepage.field.heroVideo": "Hero video",
  "admin.homepage.field.heroVideoHint":
    "Shown on the homepage hero. Leave empty for no video.",
  "admin.homepage.field.heroPoster": "Poster image",
  "admin.homepage.field.heroPosterHint":
    "Shown before the video loads. Leave empty for no poster.",
  "admin.homepage.field.firstLine": "First line",
  "admin.homepage.field.secondLine": "Second line",
  "admin.homepage.field.heroLineHint":
    "Both languages are needed, or leave the whole field empty for the built-in text.",
  "admin.homepage.field.videoUrl": "Section video",
  "admin.homepage.field.videoUrlHint":
    "There is no built-in video. Leave empty and the section is not shown.",
  "admin.homepage.field.videoPoster": "Poster image",
  "admin.homepage.field.videoPosterHint":
    "Shown while the video buffers. Leave empty to keep the HOME FORM placeholder.",
  "admin.homepage.card.videoMedia": "Video",
  "admin.homepage.card.videoMediaHint":
    "Only the video and its poster are yours to set. The section's layout and playback behaviour are unchanged. With no video the section is hidden.",

  // Page-content sections (app/[locale]/(admin)/admin/about + .../s34) — the
  // prose sections of the About and S34 pages (myPlan.md Part D). Card titles
  // are addressed by section key so a form reads its own row's label.
} as const;

export const homepageFa = {
  "admin.homepage.edit": "تنظیم",
  "admin.homepage.card.content": "محتوا",
  "admin.homepage.card.override": "بازنویسی محتوا",
  "admin.homepage.card.overrideHint":
    "هر چه در این بخش وارد کنید در صفحه اصلی نمایش داده می‌شود. برای استفاده از مقدار خود موجودیت مرتبط، فیلد را خالی بگذارید.",
  "admin.homepage.field.enabled": "فعال",
  "admin.homepage.field.enabledHint": "نمایش این بنر در صفحه اصلی.",
  "admin.homepage.field.mode": "حالت محتوا",
  "admin.homepage.field.modeHint":
    "حالت ارجاع متن و تصویر موجودیت مرتبط را نشان می‌دهد؛ حالت بازنویسی از فیلدهای زیر استفاده می‌کند.",
  "admin.homepage.mode.reference": "ارجاع",
  "admin.homepage.mode.override": "بازنویسی",
  "admin.homepage.field.flagship": "فروشگاه شاخص",
  "admin.homepage.field.project": "پروژه",
  "admin.homepage.field.catalogueItem": "ورودی کاتالوگ",
  "admin.homepage.field.catalogueItemHint":
    "عنوان و پیوند دانلود این بخش از همین ورودی خوانده می‌شود.",
  "admin.homepage.card.catalogueCopy": "پاراگراف بخش",
  "admin.homepage.card.catalogueCopyHint":
    "زیر عنوان بخش نمایش داده می‌شود. اگر خالی بماند، متن پیش‌فرض داخلی استفاده می‌شود.",
  "admin.homepage.card.catalogueCta": "دکمه فراخوان",
  "admin.homepage.card.catalogueCtaHint":
    "دکمه زیر این بخش. یک فایل PDF آپلود کنید تا دکمه همان را دانلود کند؛ پیوند، گزینهٔ جایگزین است. اگر همه خالی بمانند، برچسب پیش‌فرض و فایل PDF خود کاتالوگ استفاده می‌شود.",
  "admin.homepage.field.ctaPdf": "فایل PDF کاتالوگ",
  "admin.homepage.field.ctaLabel": "برچسب دکمه",
  "admin.homepage.field.ctaHref": "پیوند دکمه",
  "admin.homepage.field.ctaHrefHint":
    "فقط زمانی استفاده می‌شود که فایل PDF آپلود نشده باشد. یک نشانی https:// یا مسیری از همین سایت که با / شروع شود. هر چیز دیگری رد می‌شود.",
  "admin.homepage.field.ctaHint":
    "دکمهٔ فراخوان همیشه به صفحهٔ عمومی این موجودیت پیوند می‌خورد.",
  "admin.homepage.field.kicker": "پیش‌عنوان",
  "admin.homepage.field.label": "برچسب بخش",
  "admin.homepage.field.labelHint":
    "واژه‌ای که بالای تصویر چاپ می‌شود، مانند «H-Life». خالی بماند، واژهٔ پیش‌فرض استفاده می‌شود.",
  "admin.homepage.field.title": "عنوان",
  "admin.homepage.field.paragraphs": "پاراگراف‌ها",
  "admin.homepage.field.text": "متن",
  "admin.homepage.field.image": "تصویر",
  "admin.homepage.status.enabled": "فعال",
  "admin.homepage.status.disabled": "پنهان",
  "admin.homepage.status.notConfigured": "تنظیم‌نشده",
  "admin.homepage.updatedAt": "آخرین ذخیره",
  "admin.homepage.slot.flagship-one": "بنر فروشگاه شاخص",
  "admin.homepage.slot.flagship-one.description":
    "بنر بزرگ فروشگاه شاخص در بالای صفحه اصلی.",
  "admin.homepage.slot.project-banner": "بنر پروژه",
  "admin.homepage.slot.project-banner.description": "بنر پروژهٔ شاخص.",
  "admin.homepage.slot.project-dark-background": "پروژه (پس‌زمینهٔ تیره)",
  "admin.homepage.slot.project-dark-background.description":
    "بخش تیره و تمام‌عرض پروژه.",
  "admin.homepage.slot.home-collection": "بنر مجموعهٔ خانه",
  "admin.homepage.slot.home-collection.description":
    "بنر مستقل با پیوند به فهرست مجموعه‌ها.",
  "admin.homepage.slot.catalogue": "بخش کاتالوگ",
  "admin.homepage.slot.catalogue.description": "بخش دانلود کاتالوگ.",

  // پاس D.1 — هیرو و بخش ویدیو
  "admin.homepage.slot.hero": "هیرو",
  "admin.homepage.slot.hero.description":
    "ویدیوی تمام‌صفحهٔ ابتدای صفحه اصلی.",
  "admin.homepage.slot.video": "بخش ویدیو",
  "admin.homepage.slot.video.description":
    "بخش ویدیوی تمام‌عرض در ادامهٔ صفحه اصلی.",
  "admin.homepage.card.heroMedia": "رسانه",
  "admin.homepage.card.heroMediaHint":
    "ویدیوی داخلی وجود ندارد؛ هر فایلی که اینجا آپلود کنید همان در صفحه اصلی پخش می‌شود.",
  "admin.homepage.card.heroCopy": "تیتر",
  "admin.homepage.card.heroCopyHint":
    "هر خط را خالی بگذارید، متن داخلی همان خط حفظ می‌شود.",
  "admin.homepage.card.heroCta": "دکمه",
  "admin.homepage.card.heroCtaHint":
    "هر فیلدی را خالی بگذارید، برچسب و مقصد داخلی حفظ می‌شود.",
  "admin.homepage.field.heroVideo": "ویدیوی هیرو",
  "admin.homepage.field.heroVideoHint":
    "در هیروی صفحه اصلی نمایش داده می‌شود. برای نبود ویدیو خالی بگذارید.",
  "admin.homepage.field.heroPoster": "تصویر پوستر",
  "admin.homepage.field.heroPosterHint":
    "پیش از بارگذاری ویدیو نمایش داده می‌شود. برای نبود پوستر خالی بگذارید.",
  "admin.homepage.field.firstLine": "خط اول",
  "admin.homepage.field.secondLine": "خط دوم",
  "admin.homepage.field.heroLineHint":
    "هر دو زبان لازم است؛ یا کل فیلد را خالی بگذارید تا متن داخلی بماند.",
  "admin.homepage.field.videoUrl": "ویدیوی بخش",
  "admin.homepage.field.videoUrlHint":
    "ویدیوی داخلی وجود ندارد. اگر خالی بماند، این بخش نمایش داده نمی‌شود.",
  "admin.homepage.field.videoPoster": "تصویر پوستر",
  "admin.homepage.field.videoPosterHint":
    "هنگام بافر شدن ویدیو نمایش داده می‌شود. برای ماندن متن جانگهدار HOME FORM، خالی بگذارید.",
  "admin.homepage.card.videoMedia": "ویدیو",
  "admin.homepage.card.videoMediaHint":
    "تنها ویدیو و پوستر آن از سوی شما تنظیم می‌شود. چیدمان و رفتار پخش این بخش تغییر نمی‌کند. بدون ویدیو، این بخش پنهان می‌ماند.",

  // بخش‌های محتوایی صفحه‌ها (admin/about و admin/s34) — بخش‌های متنی صفحه‌های
  // درباره ما و اس ۳۴ (myPlan.md بخش D). عنوان هر کارت با کلید بخش خوانده می‌شود.
} as const;
