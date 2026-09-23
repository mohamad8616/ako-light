import { describe, expect, it } from "vitest";
import { flagshipFormSchema, flagshipDetailSchema } from "@/lib/admin/schemas/flagship";

describe("flagshipFormSchema", () => {
  const validInput = {
    slug: "henge-milan",
    name: { en: "Henge Milan", fa: "هنجه میلان" },
    city: { en: "Milan", fa: "میلان" },
    image: "/images/flagship.jpg",
    detail: {
      heroImage: "/images/hero.jpg",
      heading: { en: "Heading", fa: "سرآیند" },
      description: { en: "Description", fa: "توضیحات" },
      info: {
        name: { en: "Name", fa: "نام" },
        addressLines: [{ en: "Address 1", fa: "آدرس 1" }],
        hours: [{ label: { en: "Mon-Fri", fa: "دوش-جمعه" }, value: "9-18" }],
        appointmentNote: { en: "By appointment", fa: "با وقت" },
        phone: "+39 02 1234567",
        email: "milan@henge.com",
      },
      video: { thumbnail: "/images/video-thumb.jpg", url: "https://example.com/video.mp4" },
      gallery: ["/images/gallery1.jpg", "/images/gallery2.jpg"],
    },
    sortOrder: 0,
  };

  it("accepts valid input with detail", () => {
    const result = flagshipFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input without detail (null)", () => {
    const input = { ...validInput, detail: null };
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "Henge-Milan" };
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing city", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).city;
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing image", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).image;
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid image format", () => {
    const input = { ...validInput, image: "invalid" };
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = flagshipFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("flagshipDetailSchema", () => {
  const validDetail = {
    heroImage: "/images/hero.jpg",
    heading: { en: "Heading", fa: "سرآیند" },
    description: { en: "Description", fa: "توضیحات" },
    info: {
      name: { en: "Name", fa: "نام" },
      addressLines: [{ en: "Address 1", fa: "آدرس 1" }],
      hours: [{ label: { en: "Mon-Fri", fa: "دوش-جمعه" }, value: "9-18" }],
      appointmentNote: { en: "By appointment", fa: "با وقت" },
      phone: "+39 02 1234567",
      email: "milan@henge.com",
    },
    video: { thumbnail: "/images/video-thumb.jpg", url: "https://example.com/video.mp4" },
    gallery: ["/images/gallery1.jpg", "/images/gallery2.jpg"],
  };

  it("accepts valid detail", () => {
    const result = flagshipDetailSchema.safeParse(validDetail);
    expect(result.success).toBe(true);
  });

  it("rejects missing heroImage", () => {
    const input = { ...validDetail };
    delete (input as Record<string, unknown>).heroImage;
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid heroImage format", () => {
    const input = { ...validDetail, heroImage: "invalid" };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing heading", () => {
    const input = { ...validDetail };
    delete (input as Record<string, unknown>).heading;
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing info.name", () => {
    const input = { ...validDetail, info: { ...validDetail.info, name: { en: "", fa: "نام" } } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts an empty addressLines array (the schema imposes no min length on the list)", () => {
    const input = { ...validDetail, info: { ...validDetail.info, addressLines: [] } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects an addressLines entry that is neither a Localized pair nor a non-empty string", () => {
    for (const bad of ["", 42]) {
      const input = {
        ...validDetail,
        info: { ...validDetail.info, addressLines: [bad] },
      };
      const result = flagshipDetailSchema.safeParse(input);
      expect(result.success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("rejects hours with invalid label", () => {
    const input = { ...validDetail, info: { ...validDetail.info, hours: [{ label: { en: "", fa: "دوش-جمعه" }, value: "9-18" }] } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects hours with empty value", () => {
    const input = { ...validDetail, info: { ...validDetail.info, hours: [{ label: { en: "Mon-Fri", fa: "دوش-جمعه" }, value: "" }] } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing phone", () => {
    const input = { ...validDetail, info: { ...validDetail.info, phone: "" } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const input = { ...validDetail, info: { ...validDetail.info, email: "" } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid video thumbnail format", () => {
    const input = { ...validDetail, video: { ...validDetail.video, thumbnail: "invalid" } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid video url", () => {
    const input = { ...validDetail, video: { ...validDetail.video, url: "invalid" } };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid gallery image format", () => {
    const input = { ...validDetail, gallery: ["invalid"] };
    const result = flagshipDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});