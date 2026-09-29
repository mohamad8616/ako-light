# Home Form | هوم فرم

**فروشگاه آنلاین و لندینگ‌پیج مبلمان و روشنایی لوکس**
*Online store and landing pages for luxury furniture & lighting.*

Home Form یک وب‌سایت فروشگاهی و معرفی‌محصول است که روی Next.js ساخته شده؛ شامل صفحه اصلی (لندینگ)، catalog محصولات، کالکشن‌ها، طراحان (designers)، پروژه‌ها، متریال‌ها، فروشگاه‌های flagship، کاتالوگ‌ها، جست‌وجو و سبد خرید.

Home Form is a storefront and product-showcase website built with Next.js — featuring a home landing page, product catalogue, collections, designers, projects, materials, flagship stores, catalogues, search and a shopping cart.

---

## ویژگی‌های کلیدی | Key Features

- **صفحه اصلی (لندینگ)** — هیرو، بنرهای کالکشن، بخش ویدیو، کاتالوگ و معرفی مجموعه‌ها
  **Home landing** — hero, collection banners, video section, catalogue and collection highlights
- **کاتالوگ محصولات** — دسته‌بندی محصولات، صفحه جزئیات محصول و گالری تصاویر
  **Product catalogue** — product categories, product detail pages and image galleries
- **کالکشن‌ها** — صفحات کالکشن و جزئیات هر کالکشن
  **Collections** — collection listing and detail pages
- **طراحان، پروژه‌ها و متریال‌ها** — صفحات معرفی طراح، نمونه‌پروژه‌ها و متریال‌ها
  **Designers, projects & materials** — designer profiles, project showcases and material pages
- **فروشگاه‌های Flagship و صفحه S34** — صفحات اختصاصی برند/شعبه و لندینگ ویژه
  **Flagship stores & S34 page** — dedicated brand/branch pages and a special landing page
- **جست‌وجو و سبد خرید** — جست‌وجوی محصولات و سبد خرید (Zustand) با فلو تسویه‌حساب
  **Search & cart** — product search and cart (Zustand) with a checkout flow
- **دوزبانه (فارسی/انگلیسی)** — سیستم ترجمه داخلی با پشتیبانی از `en` و `fa`
  **Bilingual (Persian/English)** — built-in i18n system supporting `en` and `fa`
- **انیمیشن و تجربه کاربری** — اسکرول نرم (Lenis)، ترنزیشن صفحات، پری‌لودر و انیمیشن‌های GSAP/Framer Motion
  **Motion & UX** — smooth scrolling (Lenis), page transitions, preloader and GSAP/Framer Motion animations
- **دیتابیس و مدیریت محتوا** — PostgreSQL + Prisma با مدل‌های Product، Collection، Designer، Project، Material، FabricItem، CatalogueItem و ProductImage
  **Database & content management** — PostgreSQL + Prisma with models for Product, Collection, Designer, Project, Material, FabricItem, CatalogueItem and ProductImage
- **احراز هویت و دسترسی** — better-auth با ایمیل/رمز و OTP پیامکی (sms.ir)، نقش‌های `user` / `admin` / `owner`، و گارد‌های سمت سرور/مدله
  **Authentication & access** — better-auth with email/password and phone OTP (sms.ir), roles `user` / `admin` / `owner`, server + edge guards
- **داشبورد ادمین کامل** — CRUD برای محصولات، کالکشن‌ها، طراحان، پروژه‌ها، متریال‌ها، فبریک‌ها، کاتالوگ‌ها، فلگ‌شیپ‌ها، دسته‌بندی‌ها + مدیریت اسلات‌های صفحه اصلی (Flagship One، Project Banner، Project Dark Background، Home Collection، Catalogue) و مدیریت محتوای صفحات About و S34
  **Full admin dashboard** — CRUD for products, collections, designers, projects, materials, fabrics, catalogues, flagships, categories + homepage feature-slot management (Flagship One, Project Banner, Project Dark Background, Home Collection, Catalogue) + About/S34 page content management
- **تسویه‌حساب و پرداخت** — زارین‌پال (Sandbox/Production)، قیمت‌گذاری دو واحد EUR (نمایشی en) / تومان (واحد واقعی پرداخت)، تبدیل تومان→ریال در لایه گیت‌وی
  **Checkout & payment** — ZarinPal (Sandbox/Production), dual EUR (display-only) / Toman (charged unit) pricing, Toman→Rial conversion at gateway boundary

---

## تکنولوژی‌ها | Tech Stack

| تکنولوژی / Technology | کاربرد / Usage |
|---|---|
| Next.js 16 (App Router) | فریم‌ورک اصلی، روتینگ و رندرینگ / Core framework, routing & rendering |
| React 19 | کتابخانه رابط کاربری / UI library |
| Tailwind CSS 4 | استایل‌دهی / Styling |
| shadcn/ui + Base UI | کامپوننت‌های رابط کاربری / UI components |
| Zustand | مدیریت state سبد خرید و استورها / Cart & store state management |
| Prisma + PostgreSQL (`pg`) | لایه دیتابیس / Database layer |
| better-auth | احراز هویت / Authentication |
| Zod (+ React Hook Form) | اعتبارسنجی و فرم‌ها / Validation & forms |
| Framer Motion, GSAP, Lenis, Embla | انیمیشن، اسکرول نرم و کاروسل / Animation, smooth scroll & carousels |
| TypeScript, ESLint, Prettier | کیفیت و یکدستی کد / Code quality & consistency |

---

## ساختار پروژه | Project Structure

```text
home-form/
├── app/                              # روت‌ها (App Router): صفحه اصلی، محصولات، کالکشن‌ها، ...
│   ├── api/                          # API routes: auth (better-auth)
│   │   └── auth/[...all]/            # better-auth endpoint
│   ├── [locale]/                     # Locale-prefixed routes
│   │   ├── (site)/                   # Public site route group
│   │   │   ├── about/                # About page + sections
│   │   │   ├── catalogue/            # Catalogue page
│   │   │   ├── checkout/             # Checkout flow (shipping → ZarinPal callback)
│   │   │   ├── collections/          # Collections listing + detail
│   │   │   ├── contact/              # Contact page
│   │   │   ├── designers/            # Designers listing + detail
│   │   │   ├── flagship/             # Flagship stores listing + detail
│   │   │   ├── materials/            # Materials listing + detail
│   │   │   ├── products/             # Products listing + detail
│   │   │   ├── projects/             # Projects listing + detail
│   │   │   ├── s34/                  # Special S34 landing page
│   │   │   ├── search/               # Search page
│   │   │   └── sign-in/              # Sign-in page (email/password + phone OTP)
│   │   └── (admin)/                  # Private admin route group (guarded)
│   │       └── admin/                # Admin dashboard
│   │           ├── page.tsx          # Dashboard home (stats cards, chart, data table)
│   │           ├── about/            # About page sections editor
│   │           ├── catalogue/        # Catalogue items CRUD
│   │           ├── categories/       # Product categories CRUD
│   │           ├── collections/      # Collections CRUD
│   │           ├── designers/        # Designers CRUD
│   │           ├── fabrics/          # Fabric items CRUD
│   │           ├── flagships/        # Flagship stores CRUD
│   │           ├── homepage/         # Homepage feature slots editor
│   │           ├── materials/        # Materials CRUD
│   │           ├── products/         # Products CRUD
│   │           ├── projects/         # Projects CRUD
│   │           └── s34/              # S34 page sections editor
│   ├── layout.tsx                    # Root layout (fonts, providers)
│   ├── globals.css                   # Global styles + CSS variables
│   ├── robots.ts                     # robots.txt generation
│   └── sitemap.ts                    # sitemap.xml generation
├── components/
│   ├── admin/                        # Admin dashboard components
│   │   ├── app-sidebar.tsx           # Sidebar navigation
│   │   ├── site-header.tsx           # Top bar (user menu, locale switch)
│   │   ├── nav-user.tsx              # User dropdown
│   │   ├── AdminPageHeader.tsx       # Page header with breadcrumb
│   │   ├── AdminPlaceholderPage.tsx  # Placeholder for empty states
│   │   ├── catalog/                  # Catalog CRUD components
│   │   │   ├── fields/               # Reusable form fields (SlugField, SelectField, etc.)
│   │   │   ├── fields/form.tsx       # Form primitives (FieldRow, useFieldMessage)
│   │   │   ├── fields/DialogFormShell.tsx # Dialog wrapper for create/edit
│   │   │   ├── columns.tsx           # Data table columns + formatters
│   │   │   ├── useCrudSubmit.ts      # Server action + toast submit hook
│   │   │   ├── RowActions.tsx        # Edit/Delete/View actions
│   │   │   ├── DeleteDialog.tsx      # Confirm delete dialog
│   │   │   ├── BackLink.tsx          # Back to list link
│   │   │   ├── products/             # Products table + form
│   │   │   ├── collections/          # Collections table + form
│   │   │   ├── designers/            # Designers table + form
│   │   │   ├── projects/             # Projects table + form
│   │   │   ├── materials/            # Materials table + form
│   │   │   ├── fabrics/              # Fabrics table + form
│   │   │   ├── flagships/            # Flagships table + form
│   │   │   ├── catalogue/            # Catalogue table + form
│   │   │   ├── product-categories/   # Categories table + form
│   │   │   ├── homepage/             # Homepage feature slot forms
│   │   │   └── page-sections/        # About/S34 section forms
│   │   └── dashboard/                # Dashboard widgets
│   │       ├── data-table.tsx        # Orders/recent items table
│   │       ├── chart-area-interactive.tsx # Real time-series chart
│   │       └── section-cards.tsx     # Stat cards (counts from DB)
│   ├── home/                         # سکشن‌های صفحه اصلی / Home page sections
│   │   ├── HeroSection.tsx           # Hero with video background
│   │   ├── flagshipOne.tsx           # Flagship One banner (ref/override)
│   │   ├── projectBanner.tsx         # Project banner (H Istra)
│   │   ├── projectWithDarkBackground.tsx # Vocla 2026 banner
│   │   ├── HomeCollectionBanner.tsx  # Home collection banner
│   │   ├── CatalogueSection.tsx      # Catalogue download section
│   │   ├── SplitBanner.tsx           # Shared split image/text banner
│   │   └── VideoSection.tsx          # Video section
│   ├── products/ collections/ designers/ projects/ materials/ flagship/ catalogue/  # Per-domain components
│   ├── cart/                         # Cart drawer + button
│   ├── checkout/                     # CheckoutForm, PaymentCallbackState
│   ├── ui/                           # Shared UI components (shadcn + custom)
│   ├── navbar/ footer/               # Public site navigation & footer
│   └── smoothScroll.tsx              # Lenis smooth scroll
├── lib/
│   ├── actions/                      # Server actions
│   │   └── checkout.ts               # createPendingOrder (validates stock, creates order, calls ZarinPal)
│   ├── admin/                        # Admin helpers
│   │   ├── access.ts                 # requireAdminAccess / requireOwnerAccess
│   │   ├── homepage.ts               # Homepage slot metadata + routing
│   │   └── sections.ts               # Admin shell direction (RTL always)
│   ├── auth/                         # Authentication
│   │   ├── auth.ts                   # betterAuth config (email/password + phone OTP via sms.ir)
│   │   ├── permissions.ts            # Role definitions (user/admin/owner) + access control
│   │   └── sms.ts                    # sms.ir Verify integration (OTP delivery)
│   ├── cart/                         # Zustand cart store (dual price: priceEur + priceToman)
│   ├── db/prisma.ts                  # Prisma client singleton
│   ├── i18n/                         # Internationalization
│   │   ├── routing.ts                # Locale detection + URL helpers
│   │   ├── localized.ts              # Localized type + pick() helper
│   │   ├── translations/             # Translation dictionaries (en/fa)
│   │   └── price.ts                  # Dual-currency formatting (EUR for en, Toman for fa)
│   ├── payments/zarinpal.ts          # ZarinPal v4 API (request + verify, Toman→Rial)
│   ├── repositories/                 # Data access layer (server components)
│   │   ├── homepage-features.ts      # getHomepageFeaturesOverview + slot editors
│   │   ├── about-page.ts             # About page sections
│   │   ├── s34-page.ts               # S34 page sections
│   │   ├── slug-history.ts           # Slug rename redirect history
│   │   └── casting.ts                # Prisma Json input helpers
│   └── utils.ts                      # cn() className utility
├── public/                           # Fonts + static assets
├── prisma/
│   ├── schema.prisma                 # Full DB schema (catalog + orders + homepage features + About/S34)
│   └── seed.ts                       # Idempotent seed from lib/data/*
├── tests/                            # Vitest unit/integration tests
├── utility/                          # Shared utilities (HomepageSection, Paragraph, SectionTitle, etc.)
└── scripts/                          # Utility scripts
```

> قرارداد داده‌ها: هر موجودیت `id` (کلید اصلی) و `slug` (کلید روتینگ) دارد؛ جزئیات در `AGENTS.md`.
> Data convention: every entity has an `id` (primary key) and a `slug` (routing key); see `AGENTS.md`.

---

## اجرا و توسعه | Getting Started

پیش‌نیاز / Prerequisites: Node.js 20+ و یک Package Manager (npm / pnpm / yarn).

```bash
# نصب وابستگی‌ها / Install dependencies
npm install

# اجرای محیط توسعه / Run dev server
npm run dev

# بیلد و اجرای production / Build & production run
npm run build
npm run start

# لینت / Lint
npm run lint

# تست / Test
npm run test
```

سپس مرورگر را روی آدرس زیر باز کنید / Then open:
[http://localhost:3000](http://localhost:3000)

> اگر از دیتابیس استفاده می‌کنید، متغیرهای اتصال Postgres را در `.env` تنظیم کنید.
> If you use the database, set the Postgres connection variables in `.env`.

### متغیرهای محیطی مورد نیاز | Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth (better-auth)
BETTER_AUTH_URL="https://your-domain.com"          # or http://localhost:3000
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# sms.ir OTP (phone authentication)
SMSIR_API_KEY="your-smsir-api-key"
SMSIR_VERIFY_TEMPLATE_ID="your-verify-template-id" # "123456" for sandbox

# ZarinPal (payment)
ZARINPAL_MERCHANT_ID="your-merchant-id"
ZARINPAL_MODE="sandbox"   # or "production"

# Vercel Blob (admin image uploads)
# Provisioned automatically once Blob storage is connected to the Vercel
# project — confirm it exists for Production/Preview/Development before
# relying on uploads.
BLOB_READ_WRITE_TOKEN="your-blob-read-write-token"
```

---

## معماری احراز هویت | Auth Architecture

### better-auth + Plugins
- **emailAndPassword**: کلاسیک ایمیل/رمز
- **phoneNumber**: OTP ۶ رقمی، ۵ دقیقه اعتبار، ۳ تلاش، ثبت‌نام/ورود یکپارچه
- **admin**: داشبورد ادمین با نقش‌های `user` / `admin` / `owner`
- **nextCookies**: کوکی‌های HttpOnly امن برای جلسه

### نقش‌ها و دسترسی | Roles & Access
| Role | توضیح / Description |
|---|---|
| `user` | مشتری عادی — دسترسی به سایت عمومی، سبد خرید، تسویه‌حساب |
| `admin` | مدیر محتوا — دسترسی کامل به `/admin/*` CRUD، نه impersonate |
| `owner` | مالک — تمام دسترسی‌های `admin` + `impersonate-admins` |

**دو لایه محافظت:**
1. **Edge (`middleware.ts` / `proxy.ts`)** — مسدود کردن قبل از رندر
2. **React Tree (`lib/admin/access.ts`)** — `requireAdminAccess()` در layout، `requireOwnerAccess()` در روت‌های حساس

### SMS (sms.ir)
- **Sandbox**: کلید API پیش‌فرض، تمپلیت `123456`، پیامک واقعی ارسال نمی‌شود — کد در کنسول لاگ می‌شود (`[DEV OTP]`)
- **Production**: نیاز به تمپلیت Verify واقعی، کلید Production، و `NODE_ENV=production`
- Sicherheitschecks در `lib/auth/sms.ts` جلوگیری از استقرار با تنظیمات Sandbox می‌کنند

---

## فلو تسویه‌حساب و پرداخت | Checkout & Payment Flow

```
Cart (Zustand, dual price: priceEur / priceToman)
    ↓
Shipping form (CheckoutForm.tsx)
    ↓
createPendingOrder (server action)
    ├── Validate stock & priceToman > 0
    ├── Create Order + OrderItem (currency: TOMAN, snapshot priceToman)
    └── Call ZarinPal request(amountToman × 10 = Rial)
    ↓
Redirect to ZarinPal StartPay
    ↓
Callback (/checkout/callback?orderId&Authority&Status)
    ├── Verify with ZarinPal (amountToman × 10)
    └── Update Order status → paid / failed
    ↓
Confirmation page (PaymentCallbackState)
```

### قیمت‌گذاری دو واحد | Dual-Currency Pricing
| Locale | Displayed Price | Charged Amount |
|---|---|---|
| `en` | `priceEur` (EUR, informational) | `priceToman` × 10 Rial via ZarinPal |
| `fa` | `priceToman` (Toman, raw) | `priceToman` × 10 Rial via ZarinPal |

**نکته کلیدی:** `priceEur` هرگز شارژ نمی‌شود. تبدیل تومان→ریال (×۱۰) **فقط** در `lib/payments/zarinpal.ts` در لایه گیت‌وی اتفاق می‌افتد. در نمایش قیمت (کاتالوگ، سبد، چک‌اوت) همیشه تومان خام نمایش داده می‌شود.

---

## داشبورد ادمین | Admin Dashboard

### CRUD موجودیت‌ها | Entity CRUD
- **Products**: جداول، فرم، مدیریت تصاویر، قیمت دو واحد، موجودی، دانلودها
- **Collections**: مدیریت سال، تصاویر، توضیحات محلی
- **Designers**: بیوگرافی، وب‌سایت، تصاویر
- **Projects**: محصولات استفاده‌شده، پورتفولیو، توضیحات غنی
- **Materials**: انواع (stone/metal/glass/...), دسته‌بندی، توضیحات
- **Fabrics**: کد، رنگ سوچ، دسته‌بندی
- **Catalogues**: عنوان، PDF href، رنگ کاور
- **Flagships**: جزئیات کامل (آدرس، ساعت، ویدیو، گالری، الحاق قرار ملاقات)
- **Categories**: سرتایپ، ترتیب نمایش

### مدیریت اسلات‌های صفحه اصلی | Homepage Feature Slots
خمسة اسلات سینگلتون در `/admin/homepage`:
| Slot | Component | Mode | Referenced Entity |
|---|---|---|---|
| `flagship-one` | `FlagshipOneFeature` | reference / override | Flagship |
| `project-banner` | `ProjectBannerFeature` | reference / override | Project |
| `project-dark-background` | `ProjectDarkBackgroundFeature` | reference / override | Project |
| `home-collection` | `HomeCollectionFeature` | standalone (no FK) | — |
| `catalogue` | `CatalogueFeature` | reference (image in slot) | CatalogueItem |

- **Reference mode**: kicker/title/paragraphs/image از موجودیت ارجاع‌داده می‌شوند
- **Override mode**: فیلدهای nullable روی سطر فیچر اولویت دارند، اما **CTA همیشه به روت قانون‌اندازه موجودیت ارجاع می‌رود**

### مدیریت محتوای صفحات About و S34
- اسلاس‌های ساختاریافته (`heroSection`, `brandStorySection`, `conceptSection`، …) در دیتابیس
- محتوای `Localized { en, fa }` برای تیتر، کیکر، پاراگراف‌ها، تصاویر
- ویرایش از `/admin/about` و `/admin/s34`

### ویجت‌های داشبورد
- **Stat Cards** (`section-cards.tsx`): شمارش‌های واقعی از دیتابیس (تعداد محصولات، سفارش‌ها، کاربران، …)
- **Chart** (`chart-area-interactive.tsx`): نمودار سری زمانی واقعی (سفارشات در طول زمان)
- **Data Table** (`data-table.tsx`): آخرین سفارش‌ها/آیتم‌ها با داده‌های واقعی

---

## نقشه راه | Roadmap

- [x] اتصال کامل داده‌ها به PostgreSQL (مهاجرت از `lib/data`)
- [x] احراز هویت (credentials + phone OTP via sms.ir)
- [x] داشبورد ادمین مبتنی بر نقش (owner/admin/user)
- [x] CRUD کامل کاتالوگ (محصولات، کالکشن‌ها، طراحان، پروژه‌ها، متریال‌ها، فبریک‌ها، کاتالوگ‌ها، فلگ‌شیپ‌ها، دسته‌بندی‌ها)
- [x] مدیریت اسلات‌های ویژگی صفحه اصلی
- [x] مدیریت محتوای صفحات About و S34
- [x] فلو تسویه‌حساب و پرداخت (ZarinPal، قیمت‌گذاری دو واحد EUR/Toman-Rial)
- [ ] سئو و بهینه‌سازی تصاویر/فونت‌ها
- [ ] SlugHistory redirect در روت‌های پویا (unblock inbound links after slug rename)
- [ ] تست‌های E2E برای فلوهای حیاتی (auth، checkout، admin CRUD)

---

## لایسنس | License

پروژه خصوصی — تمامی حقوق محفوظ است.
Private project — all rights reserved.

---

## SEO & Technical SEO

Home Form uses a structured SEO architecture designed for a multilingual Next.js 16 App Router application.

### SEO Architecture

The project includes:

* Localized page metadata
* Canonical URLs
* `hreflang` / locale alternates
* Open Graph metadata
* Twitter metadata
* Dynamic metadata for content-driven pages
* XML sitemap generation
* `robots.txt` generation
* Structured data using Schema.org / JSON-LD
* Breadcrumb structured data
* Product structured data
* Collection structured data
* Project structured data
* Organization / website structured data
* LocalBusiness structured data for applicable flagship locations
* Localized structured data for Persian and English pages
* Search-page indexing controls
* SEO-friendly internal linking
* Image `alt` text auditing
* Canonical URL normalization
* Protection against duplicate locale URLs

### Multilingual SEO

Persian (`fa`) is the primary language and uses unprefixed canonical URLs:

```text
/
/about
/products
/collections
/projects
/designers
/materials
/flagship
/contact
/search
/catalogue
/s34
```

English (`en`) uses the `/en` prefix:

```text
/en
/en/about
/en/products
/en/collections
/en/projects
/en/designers
/en/materials
/en/flagship
/en/contact
/en/search
/en/catalogue
/en/s34
```

The `/fa/...` URL form is non-canonical and is redirected to the corresponding unprefixed Persian route.

The URL is authoritative for the active locale. Cookies and local storage may remember the user's language preference, but they do not override an explicitly requested locale URL.

### SEO-Related Files

Important SEO and localization infrastructure includes:

```text
app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── about/
│   ├── products/
│   ├── collections/
│   ├── projects/
│   ├── designers/
│   ├── materials/
│   ├── flagship/
│   ├── contact/
│   ├── search/
│   ├── catalogue/
│   └── s34/
│
├── robots.ts
└── sitemap.ts

lib/
└── i18n/
    ├── routing.ts
    ├── localized.ts
    └── translations/
```

### Canonical URLs & Locale Routing

The localization routing system centralizes locale-aware URL generation and canonicalization.

Important helpers include:

```text
getLocalizedPath()
stripLocalePrefix()
toCanonicalPath()
```

These helpers are used to prevent inconsistent URLs between Persian and English pages.

Canonical URLs should always use:

```text
Persian → /...
English → /en/...
```

and never:

```text
/fa/...
```

### Structured Data

The website uses Schema.org structured data where appropriate to help search engines understand the site's content and entities.

Depending on the page type, structured data can represent:

* Home Form as an organization
* The website itself
* Individual web pages
* Products
* Collections
* Projects
* Designers
* Flagship locations
* Breadcrumb navigation

Structured data must be generated from real project data. Fake prices, reviews, ratings, availability, addresses, or other business information must not be invented for SEO purposes.

### SEO Content Principles

SEO implementation follows these principles:

* Home Form is the current public brand.
* The website is positioned primarily around decorative, architectural, and premium lighting.
* Metadata should accurately describe the actual page content.
* Titles and descriptions are localized.
* Existing content should not be rewritten solely to insert keywords.
* Keywords must remain natural and relevant.
* H1 headings should accurately represent page content.
* Images should have meaningful `alt` text where appropriate.
* Internal links should use meaningful destinations and anchor text.
* Search result pages should not create unnecessary indexable duplicate URLs.
* Query parameters should not create uncontrolled duplicate pages.
* SEO metadata must not contain fabricated information.

### SEO and Rendering

SEO-critical metadata and structured data should be generated server-side whenever possible so that search engines can discover them without depending on client-side JavaScript execution.

The SEO system is designed to work with the existing:

* Next.js App Router
* Persian RTL / English LTR architecture
* locale-aware routing
* static and dynamic routes
* future PostgreSQL/Prisma data layer

The SEO architecture should remain compatible with the future transition from static content to database-driven content and the future admin dashboard.