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
├── app/                    # روت‌ها (App Router): صفحه اصلی، محصولات، کالکشن‌ها، ...
│   ├── page.tsx            # لندینگ اصلی / Home landing
│   ├── products/           # کاتالوگ و جزئیات محصول / Catalogue & product details
│   ├── collections/        # کالکشن‌ها / Collections
│   ├── designers/          # طراحان / Designers
│   ├── projects/           # پروژه‌ها / Projects
│   ├── materials/          # متریال‌ها / Materials
│   ├── flagship/           # فروشگاه‌های flagship / Flagship stores
│   ├── catalogue/          # کاتالوگ‌ها / Catalogues
│   ├── about/ contact/     # درباره ما و تماس / About & contact
│   ├── search/             # جست‌وجو / Search
│   └── s34/                # لندینگ ویژه S34 / Special S34 landing
├── components/
│   ├── home/               # سکشن‌های صفحه اصلی / Home page sections
│   ├── products/ collections/ designers/ ...  # کامپوننت هر دامنه / Per-domain components
│   ├── cart/               # سبد خرید / Cart
│   ├── ui/                 # کامپوننت‌های مشترک (shadcn) / Shared UI components
│   ├── navbar/ footer/     # ناوبری و فوتر / Navigation & footer
│   └── smoothScroll.tsx    # اسکرول نرم / Smooth scroll
├── lib/
│   ├── data/               # داده‌های تایپ‌شده (پیش‌درآمد مهاجرت به Postgres) / Typed data modules
│   ├── cart/               # استور و منطق سبد خرید / Cart store & logic
│   ├── i18n/               # ترجمه‌ها و LanguageProvider / Translations & provider
│   └── hooks/              # هوک‌های مشترک / Shared hooks
├── public/                 # فونت‌ها و فایل‌های استاتیک / Fonts & static assets
└── prisma/                 # اسکیمای دیتابیس (در صورت وجود) / DB schema (if present)
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

# بیلد و اجرای production ـ/ Build & production run
npm run build
npm run start

# لینت / Lint
npm run lint
```

سپس مرورگر را روی آدرس زیر باز کنید / Then open:
[http://localhost:3000](http://localhost:3000)

> اگر از دیتابیس استفاده می‌کنید، متغیرهای اتصال Postgres را در `.env` تنظیم کنید.
> If you use the database, set the Postgres connection variables in `.env`.

---

## نقشه راه | Roadmap

- اتصال کامل داده‌ها به PostgreSQL (مهاجرت از `lib/data`)
  Full data migration from `lib/data` to PostgreSQL
- تکمیل فلو پرداخت سبد خرید
  Complete cart checkout/payment flow
- سئو و بهینه‌سازی تصاویر/فونت‌ها
  SEO and image/font optimization

---

## لایسنس | License

پروژه خصوصی — تمامی حقوق محفوظ است.
Private project — all rights reserved.
