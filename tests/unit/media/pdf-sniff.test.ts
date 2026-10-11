/**
 * Pass C.4 — PDF sniffing and download filenames.
 *
 * HERMETIC: pure functions, no server, no database, no storage.
 *
 * These two functions are the security-relevant halves of the catalogue CTA's
 * upload path:
 *
 *   - `sniffPdfType` decides whether bytes really ARE a PDF, and it is the
 *     ONLY thing standing between a visitor-supplied upload and an object in
 *     the bucket. The client's `File.type` is a claim, so every test below
 *     passes bytes, never a declared type.
 *   - `safePdfFilename` produces a value that is written into a
 *     `Content-Disposition` HEADER, so it must be incapable of injecting a
 *     header or smuggling a path.
 */
import { describe, expect, it } from "vitest";

import {
  PDF_MAX_BYTES,
  PDF_MIME_TYPE,
  isSupportedPdfType,
  safePdfFilename,
  sniffPdfType,
} from "@/lib/media/pdf-sniff";

/** Builds a byte buffer from a string, optionally prefixed with junk. */
const bytesOf = (text: string, junk = ""): Uint8Array => {
  const encoder = new TextEncoder();
  return encoder.encode(`${junk}${text}`);
};

/** A minimal but structurally plausible PDF header. */
const PDF_HEAD = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n";

describe("sniffPdfType — the bytes decide", () => {
  it("accepts a PDF header", () => {
    expect(sniffPdfType(bytesOf(PDF_HEAD))).toBe(PDF_MIME_TYPE);
  });

  it("accepts a header preceded by junk within the spec's 1024-byte window", () => {
    // The PDF specification allows leading bytes before `%PDF-`, so a strict
    // offset-0 check would reject real files produced by some tools.
    expect(sniffPdfType(bytesOf(PDF_HEAD, " ".repeat(900)))).toBe(PDF_MIME_TYPE);
  });

  it("rejects a marker that appears AFTER the window", () => {
    // A file that merely CONTAINS the string further in is not a PDF.
    expect(sniffPdfType(bytesOf("nothing to see", "x".repeat(1100)))).toBe(null);
    const smuggled = new TextEncoder().encode(
      `${"x".repeat(1100)}${PDF_HEAD}`,
    );
    expect(sniffPdfType(smuggled)).toBe(null);
  });

  it("rejects anything that is not a PDF", () => {
    for (const text of [
      "GIF89a",
      "\x89PNG\r\n\x1a\n",
      "not a document at all",
      "<html><body>hi</body></html>",
      // A ZIP (so a renamed .docx or .xlsx is refused too).
      "PK\x03\x04",
    ]) {
      expect(sniffPdfType(bytesOf(text)), text.slice(0, 12)).toBe(null);
    }
  });

  it("rejects empty and too-short input without throwing", () => {
    expect(sniffPdfType(new Uint8Array(0))).toBe(null);
    expect(sniffPdfType(bytesOf("%PD"))).toBe(null);
    expect(sniffPdfType(bytesOf("%PDF"))).toBe(null);
  });

  it("is case-SENSITIVE, as the spec is", () => {
    // `%pdf-` is not a valid header; accepting it would mean accepting a file
    // no PDF reader would open.
    expect(sniffPdfType(bytesOf("%pdf-1.7"))).toBe(null);
  });

  it("recognises only the one MIME type", () => {
    expect(isSupportedPdfType(PDF_MIME_TYPE)).toBe(true);
    expect(isSupportedPdfType("image/png")).toBe(false);
    expect(isSupportedPdfType("application/octet-stream")).toBe(false);
    expect(isSupportedPdfType("")).toBe(false);
  });

  it("publishes a ceiling the Server Action can actually honour", () => {
    // The action body limit is 6 MB (next.config.ts). A ceiling above it would
    // be silently truncated by the framework before this check ever ran.
    expect(PDF_MAX_BYTES).toBeLessThan(6 * 1024 * 1024);
    expect(PDF_MAX_BYTES).toBeGreaterThan(0);
  });
});

describe("safePdfFilename — safe in a header, sensible on disk", () => {
  it("keeps an ordinary name and guarantees the .pdf suffix", () => {
    expect(safePdfFilename("Henge Catalogue S34-5.pdf")).toBe(
      "Henge Catalogue S34-5.pdf",
    );
    // A name with no suffix still ends up downloadable as a PDF.
    expect(safePdfFilename("catalogue")).toBe("catalogue.pdf");
    expect(safePdfFilename("catalogue.PDF")).toBe("catalogue.pdf");
  });

  it("strips a path, so a filename can never become a path", () => {
    expect(safePdfFilename("/etc/passwd")).toBe("passwd.pdf");
    expect(safePdfFilename("C:\\Users\\x\\cat.pdf")).toBe("cat.pdf");
    expect(safePdfFilename("../../escape.pdf")).toBe("escape.pdf");
  });

  it("removes anything that could break out of a quoted header value", () => {
    // A quote or a newline in `Content-Disposition` is header injection.
    const nasty = 'cat"\r\nSet-Cookie: a=b\\x.pdf';
    const safe = safePdfFilename(nasty);

    expect(safe).not.toMatch(/["\\]/);
    expect(safe).not.toMatch(/[\r\n]/);
    expect(safe.endsWith(".pdf")).toBe(true);
  });

  it("collapses whitespace and drops control characters", () => {
    expect(safePdfFilename("  a\t\t b \n c.pdf ")).toBe("a b c.pdf");
    expect(safePdfFilename("a\u0000b.pdf")).toBe("ab.pdf");
  });

  it("falls back to a neutral name rather than an empty header", () => {
    for (const input of ["", "   ", ".pdf", '"""', undefined, null, 42]) {
      expect(safePdfFilename(input), String(input)).toBe("catalogue.pdf");
    }
  });

  it("caps a pathologically long name", () => {
    const safe = safePdfFilename(`${"a".repeat(5000)}.pdf`);
    expect(safe.endsWith(".pdf")).toBe(true);
    expect(safe.length).toBeLessThanOrEqual(125);
  });

  it("preserves a Persian name", () => {
    // The download is served to Persian visitors too; only the characters that
    // are unsafe in a header are removed.
    expect(safePdfFilename("کاتالوگ هنژ.pdf")).toBe("کاتالوگ هنژ.pdf");
  });
});
