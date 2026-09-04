import { loc, type Localized } from "@/lib/i18n/localized";

// Contact-page content, previously hardcoded inside the contact components.

export const contactHero = {
  heroImage: "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_41_C-3.jpg",
  title: loc("Send a message", "پیامی بفرستید"),
  description: loc(
    "Please send your request for information and assistance to one of the addresses listed below and we will get back to you in the shortest time possible.",
    "لطفاً درخواست اطلاعات و پشتیبانی خود را به یکی از نشانی‌های زیر بفرستید تا در کوتاه‌ترین زمان ممکن پاسخ دهیم.",
  ),
};

export interface ContactCard {
  title: Localized;
  lines: (Localized | string)[];
  email: string;
  phone: string;
}

export const contactCards: ContactCard[] = [
  {
    title: loc("Showroom", "شوروم"),
    lines: [
      loc(
        "Via della Spiga, 34 20121, Milano - Italy",
        "ویا دلا اسپیگا ۳۴، ۲۰۱۲۱ میلان - ایتالیا",
      ),
      loc("Open by appointment.", "با وقت قبلی باز است."),
    ],
    email: "sales@henge07.com",
    phone: "+39 327 812 7661",
  },
  {
    title: loc(
      "Press office and marketing requests",
      "دفتر مطبوعاتی و درخواست‌های بازاریابی",
    ),
    lines: [],
    email: "marketing@henge07.com",
    phone: "+39 0438 171 0600",
  },
  {
    title: loc("Headquarters", "دفتر مرکزی"),
    lines: [
      loc(
        "Via Fossa 1 31051, Follina (TV) - Italy",
        "ویا فوسا ۱، ۳۱۰۵۱ فولینا (TV) - ایتالیا",
      ),
    ],
    email: "atelier@henge07.com",
    phone: "+39 0438 171 0600",
  },
];

export const contactInfoHeading = {
  line1: loc("Via della Spiga 34", "ویا دلا اسپیگا ۳۴"),
  line2: loc(
    "20121 Milano (MI) \u2013 Italy",
    "۲۰۱۲۱ میلان (MI) \u2013 ایتالیا",
  ),
};

// Only "Generic requests" is visible in the reference \u2014 the extra options
// are a placeholder set, swap for the real list. `value` stays stable for the
// form payload; `label` is what the user sees.
export const subjectOptions: { value: string; label: Localized }[] = [
  {
    value: "Generic requests",
    label: loc("Generic requests", "درخواست‌های عمومی"),
  },
  {
    value: "Press & marketing",
    label: loc("Press & marketing", "مطبوعات و بازاریابی"),
  },
  {
    value: "Trade / dealer enquiry",
    label: loc("Trade / dealer enquiry", "استعلام عمده‌فروش / نمایندگی"),
  },
  {
    value: "Job application",
    label: loc("Job application", "درخواست همکاری"),
  },
];
