/**
 * Catalogue CTA — URL validation and form rules (Pass C.3).
 *
 * HERMETIC: pure schema assertions, no server and no database.
 *
 * The policy is `linkSchema` — the project's EXISTING link rule — wrapped in
 * `clearableLinkSchema` so "" means "not configured". It works by ALLOW-LISTING
 * three shapes (absolute http(s), root-relative, "#"), which is why no
 * dangerous scheme can slip through: nothing is accepted unless it matches one
 * of them, so there is no block-list to bypass with casing, whitespace, or an
 * alternative encoding.
 */
import { describe, expect, it } from "vitest";

import {
  errorCodeForType,
  zodIssuesToFieldIssues,
} from "@/lib/admin/result";
import { clearableLinkSchema } from "@/lib/admin/schemas/common";
import { catalogueFeatureFormSchema } from "@/lib/admin/schemas/homepage";

/** A complete, otherwise-valid catalogue submission. */
const base = {
  enabled: true,
  catalogueItemId: "s34-5",
  image: "/images/catalogue.jpg",
  paragraphs: [],
  ctaLabel: { en: "", fa: "" },
  ctaHref: "",
  // Pass C.4 — the uploaded PDF and its presentable name.
  ctaPdfUrl: "",
  ctaPdfName: "",
};

/** Does the CTA link accept this value? */
const acceptsLink = (value: string) =>
  clearableLinkSchema.safeParse(value).success;

/** The value the schema would STORE for this input (trimmed), or null. */
const storedLink = (value: string): string | null => {
  const parsed = clearableLinkSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

/** The dictionary code a rejection produces, client-side and server-side. */
const rejectionCodes = (value: string): { client: string; server: string[] } => {
  const parsed = clearableLinkSchema.safeParse(value);
  if (parsed.success) return { client: "(accepted)", server: [] };
  const code = (parsed.error.issues[0] as { code?: string }).code;
  return {
    client: errorCodeForType(code),
    server: zodIssuesToFieldIssues(parsed.error).map((issue) => issue.code),
  };
};

/** Does the whole catalogue form accept this CTA href? */
const acceptsForm = (ctaHref: string) =>
  catalogueFeatureFormSchema.safeParse({ ...base, ctaHref }).success;

/** What the whole catalogue form would STORE for this CTA href. */
const formStores = (ctaHref: string): string | null => {
  const parsed = catalogueFeatureFormSchema.safeParse({ ...base, ctaHref });
  return parsed.success ? parsed.data.ctaHref : null;
};

describe("clearableLinkSchema — accepted shapes", () => {
  it("accepts an empty string (not configured)", () => {
    expect(acceptsLink("")).toBe(true);
  });

  it("accepts root-relative paths", () => {
    for (const value of [
      "/catalogue/s34-5.pdf",
      "/files/2026/catalogue.pdf",
      "/",
    ]) {
      expect(acceptsLink(value), value).toBe(true);
    }
  });

  it("accepts absolute http(s) URLs", () => {
    for (const value of [
      "https://example.com/catalogue.pdf",
      "http://example.com/catalogue.pdf",
      "https://cdn.example.com/a/b/c.pdf?x=1#page=2",
    ]) {
      expect(acceptsLink(value), value).toBe(true);
    }
  });

  it("accepts the '#' placeholder, as the existing data does", () => {
    expect(acceptsLink("#")).toBe(true);
  });
});

describe("clearableLinkSchema — rejected values", () => {
  it("rejects dangerous protocols", () => {
    for (const value of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://example.com/x",
    ]) {
      expect(acceptsLink(value), value).toBe(false);
    }
  });

  it("rejects protocol smuggling through whitespace or casing", () => {
    for (const value of [
      " javascript:alert(1)",
      "\tjavascript:alert(1)",
      "\njavascript:alert(1)",
      "java\tscript:alert(1)",
      "https:/example.com",
    ]) {
      expect(acceptsLink(value), value).toBe(false);
    }
  });

  it("trims a padded protocol-relative value into the form the policy already allows", () => {
    // `//example.com/x` is ACCEPTED by the project's policy (it satisfies
    // `startsWith("/")`) — see the dedicated test below. Trimming therefore
    // cannot turn `" //example.com/x"` into a rejection: it normalises it into
    // a shape that was already permitted, so no new value becomes reachable.
    expect(acceptsLink(" //example.com/x")).toBe(true);
    expect(storedLink(" //example.com/x")).toBe("//example.com/x");
  });

  it("rejects malformed URLs", () => {
    for (const value of [
      "not a url",
      "example.com/no-scheme",
      "https:/example.com",
    ]) {
      expect(acceptsLink(value), value).toBe(false);
    }
  });

  it("names the rule — `invalidLink`, not the blanket `invalid`", () => {
    // The whole point of the dedicated code: "Invalid value." tells the admin
    // nothing, whereas this one renders "Enter a full web address starting with
    // https://, or a path on this site starting with /." Both halves of the
    // contract must agree, or the browser and the action would say different
    // things about the same value.
    for (const value of [
      "www.example.com/a.pdf",
      "javascript:alert(1)",
      "data:text/html,x",
      "not a url",
    ]) {
      expect(rejectionCodes(value), value).toEqual({
        client: "invalidLink",
        server: ["invalidLink"],
      });
    }
  });

  it("still reports an over-long value as `tooLong`, not `invalidLink`", () => {
    // Length is its own, more actionable message — and the cap runs before the
    // shape check so a long value cannot be misreported as a malformed one.
    expect(rejectionCodes(`/${"a".repeat(3000)}`)).toEqual({
      client: "tooLong",
      server: ["tooLong"],
    });
  });

  it("accepts anything root-relative, including a path with spaces", () => {
    // `startsWith("/")` is the whole rule for internal paths, so a space is
    // permitted. That is safe: the browser percent-encodes it, the value is
    // admin-authored rather than visitor-supplied, and the scheme cannot become
    // `javascript:` — it is still a same-origin path. Pinned so a future change
    // to the shared `linkSchema` shows up here.
    expect(acceptsLink("/path with spaces")).toBe(true);
  });

  it("accepts protocol-relative paths — documented, not an oversight", () => {
    // `//example.com/x` satisfies `startsWith("/")`, so the project's existing
    // policy permits it. That is NOT a new risk introduced here: the same field
    // already accepts `https://example.com/x`, so an admin who wants to point
    // the button off-site can do so either way. It is also not an injection —
    // the scheme is inherited, never `javascript:`. Tightening this would mean
    // changing `linkSchema`, which other screens share and existing rows may
    // already rely on, so the policy is left alone and pinned here instead.
    expect(acceptsLink("//example.com/x")).toBe(true);
  });

  it("rejects an over-long value", () => {
    expect(acceptsLink(`/${"a".repeat(3000)}`)).toBe(false);
  });
});

describe("clearableLinkSchema — paste padding is trimmed", () => {
  it("accepts a URL that arrived with surrounding whitespace, and stores it trimmed", () => {
    // A URL copied out of a browser or a PDF routinely carries a leading or
    // trailing space/newline. The rule is anchored, so before the trim these
    // were REJECTED — a perfectly good address reported as invalid, which is
    // indistinguishable from "the save button does not work".
    for (const [input, expected] of [
      ["  https://example.com/a.pdf  ", "https://example.com/a.pdf"],
      ["https://example.com/a.pdf\n", "https://example.com/a.pdf"],
      ["\t/media/homepage/a.pdf ", "/media/homepage/a.pdf"],
    ] as const) {
      expect(acceptsLink(input), input).toBe(true);
      expect(storedLink(input), input).toBe(expected);
    }
  });

  it("treats whitespace-only input as `not configured`", () => {
    // "   " means the admin cleared the field — same as "". Storing it verbatim
    // would write a value that is neither empty nor a link.
    expect(storedLink("   ")).toBe("");
    expect(acceptsLink("   ")).toBe(true);
  });

  it("does NOT let the trim rescue a padded dangerous scheme", () => {
    // Trimming must never turn a rejected value into an accepted one.
    for (const value of [
      "  javascript:alert(1)  ",
      "  data:text/html,x  ",
      "  vbscript:msgbox(1)  ",
    ]) {
      expect(rejectionCodes(value).server, value).toEqual(["invalidLink"]);
    }
  });

  it("carries the trim through the FORM schema, so the stored URL is clean", () => {
    expect(acceptsForm("  https://example.com/s34.pdf  ")).toBe(true);
    expect(formStores("  https://example.com/s34.pdf  ")).toBe(
      "https://example.com/s34.pdf",
    );
  });
});

describe("catalogueFeatureFormSchema — the CTA fields", () => {
  it("accepts a submission with no CTA configured", () => {
    expect(catalogueFeatureFormSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a localized label and a custom destination", () => {
    const result = catalogueFeatureFormSchema.safeParse({
      ...base,
      ctaLabel: { en: "Download the S34 catalogue", fa: "دانلود کاتالوگ S34" },
      ctaHref: "https://example.com/s34.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unsafe destination through the FORM schema too", () => {
    // The point of the pass: the server action validates with this schema, so a
    // forged POST cannot store a `javascript:` link even though the form's
    // client-side check never ran.
    expect(acceptsForm("javascript:alert(1)")).toBe(false);
    expect(acceptsForm("data:text/html,x")).toBe(false);
  });

  it("rejects a HALF-translated label pair", () => {
    // A one-sided pair is a mistake, not a partial override — the empty half
    // carries its own issue so the field shows "required".
    expect(
      catalogueFeatureFormSchema.safeParse({
        ...base,
        ctaLabel: { en: "Only English", fa: "" },
      }).success,
    ).toBe(false);
  });

  it("accepts a fully-cleared label pair", () => {
    expect(
      catalogueFeatureFormSchema.safeParse({
        ...base,
        ctaLabel: { en: "", fa: "" },
      }).success,
    ).toBe(true);
  });

  it("accepts an UPLOADED pdf alongside its name", () => {
    const result = catalogueFeatureFormSchema.safeParse({
      ...base,
      ctaPdfUrl: "https://bucket.example.test/media/catalogue/1-catalogue.pdf",
      ctaPdfName: "Henge Catalogue S34-5.pdf",
    });
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("accepts a pdf with NO name, and a cleared pdf", () => {
    // The name is presentational; the URL is what the button uses. Neither
    // field may require the other, or clearing one would trap the admin.
    expect(
      catalogueFeatureFormSchema.safeParse({ ...base, ctaPdfUrl: "/x.pdf" })
        .success,
    ).toBe(true);
    expect(
      catalogueFeatureFormSchema.safeParse({ ...base, ctaPdfUrl: "" }).success,
    ).toBe(true);
  });

  it("refuses a pdf url that is not an https address or a site path", () => {
    // The upload action is the only intended writer, but the schema is the
    // boundary — a forged POST gets the same treatment.
    for (const ctaPdfUrl of [
      "javascript:alert(1)",
      "not a url",
      "file:///etc/passwd",
    ]) {
      expect(
        catalogueFeatureFormSchema.safeParse({ ...base, ctaPdfUrl }).success,
        ctaPdfUrl,
      ).toBe(false);
    }
  });
});
