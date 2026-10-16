/**
 * Document sniffing — the byte-level boundary for the catalogue's PDF/PowerPoint
 * uploads (lib/media/document-sniff.ts).
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Every rule here is a decision about bytes an operator chose, and the file that
 * results is re-served to the public by a same-origin download route that derives
 * its `Content-Type` from the stored extension. So the sniffing is the security
 * boundary, not a convenience: a `.docx` or a renamed executable accepted here
 * becomes a file the site serves under a document content type.
 *
 * The PDF rule itself is `pdf-sniff`'s and is covered there; what this file adds
 * is the PowerPoint rule and the shared filename sanitiser.
 *
 * Hermetic: pure functions, no I/O, no database.
 */
import { describe, expect, it } from "vitest";

import {
  DOCUMENT_ACCEPT,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_SERVER_MAX_BYTES,
  PPTX_MIME_TYPE,
  documentExtensionFor,
  documentMimeForExtension,
  isPptxPackage,
  isSupportedDocumentType,
  safeDocumentFilename,
  sniffDocumentType,
} from "@/lib/media/document-sniff";
import { PDF_MIME_TYPE } from "@/lib/media/pdf-sniff";

const encode = (text: string) => new TextEncoder().encode(text);

/** A minimal but structurally valid OOXML presentation package. */
function pptxBytes(parts = ["[Content_Types].xml", "ppt/presentation.xml"]) {
  const chunks: number[] = [...encode("PK\u0003\u0004")];
  for (const part of parts) chunks.push(...encode(`name="${part}"`));
  return new Uint8Array(chunks);
}

describe("sniffDocumentType — the bytes decide", () => {
  it("accepts a PDF, including one with leading junk in the header window", () => {
    expect(sniffDocumentType(encode("%PDF-1.7\n%%EOF"))).toBe(PDF_MIME_TYPE);
    expect(sniffDocumentType(encode(`${" ".repeat(900)}%PDF-1.4`))).toBe(
      PDF_MIME_TYPE,
    );
  });

  it("rejects a PDF marker that sits past the 1024-byte window", () => {
    // A file that merely CONTAINS "%PDF-" further in is not a PDF.
    expect(sniffDocumentType(encode(`${"x".repeat(1100)}%PDF-`))).toBe(null);
  });

  it("accepts an OOXML presentation package", () => {
    expect(sniffDocumentType(pptxBytes())).toBe(PPTX_MIME_TYPE);
  });

  it("rejects a ZIP that is not a presentation", () => {
    // A .docx (or any archive) is a ZIP whose parts are not a presentation.
    expect(
      sniffDocumentType(pptxBytes(["[Content_Types].xml", "word/document.xml"])),
    ).toBe(null);
    // A bare ZIP with no OPC parts at all.
    expect(sniffDocumentType(encode("PK\u0003\u0004plain"))).toBe(null);
  });

  it("rejects the legacy OLE2 container (.ppt/.doc/.xls share one magic)", () => {
    // Accepting this magic alone would also accept a Word file renamed to .ppt,
    // so the legacy format is refused outright.
    const ole2 = new Uint8Array([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00,
    ]);
    expect(sniffDocumentType(ole2)).toBe(null);
  });

  it("rejects an executable, an image and an empty buffer", () => {
    expect(sniffDocumentType(encode("MZ\u0090\u0000"))).toBe(null);
    expect(sniffDocumentType(encode("\u0089PNG\r\n\u001a\n"))).toBe(null);
    expect(sniffDocumentType(new Uint8Array(0))).toBe(null);
  });

  it("never reports a PowerPoint package as a PDF", () => {
    expect(sniffDocumentType(pptxBytes())).not.toBe(PDF_MIME_TYPE);
  });
});

describe("isPptxPackage", () => {
  it("needs the ZIP magic AND both OPC parts", () => {
    expect(isPptxPackage(encode("PK\u0003\u0004plain"))).toBe(false);
    expect(isPptxPackage(encode("[Content_Types].xml ppt/presentation.xml"))).toBe(
      false,
    );
    expect(isPptxPackage(pptxBytes())).toBe(true);
  });

  it("is false for a buffer shorter than the magic", () => {
    expect(isPptxPackage(encode("PK"))).toBe(false);
  });
});

describe("type helpers", () => {
  it("knows exactly the two document types", () => {
    expect(Object.keys(DOCUMENT_EXTENSIONS).sort()).toEqual([
      PDF_MIME_TYPE,
      PPTX_MIME_TYPE,
    ]);
    expect(isSupportedDocumentType(PDF_MIME_TYPE)).toBe(true);
    expect(isSupportedDocumentType(PPTX_MIME_TYPE)).toBe(true);
    expect(isSupportedDocumentType("image/png")).toBe(false);
  });

  it("maps types to extensions and back, case-insensitively", () => {
    expect(documentExtensionFor(PDF_MIME_TYPE)).toBe("pdf");
    expect(documentExtensionFor(PPTX_MIME_TYPE)).toBe("pptx");
    expect(documentExtensionFor("image/png")).toBe(null);

    expect(documentMimeForExtension("PDF")).toBe(PDF_MIME_TYPE);
    expect(documentMimeForExtension(".pptx")).toBe(PPTX_MIME_TYPE);
    expect(documentMimeForExtension("docx")).toBe(null);
  });

  it("lists both types in the input's accept value", () => {
    expect(DOCUMENT_ACCEPT).toContain(PDF_MIME_TYPE);
    expect(DOCUMENT_ACCEPT).toContain(PPTX_MIME_TYPE);
    expect(DOCUMENT_ACCEPT).toContain(".pptx");
  });

  it("keeps the Server Action ceiling below the overall ceiling", () => {
    // `next.config.ts` caps an action body at 6 MB, so the action path must sit
    // comfortably under it; anything larger takes the direct-upload path.
    expect(DOCUMENT_SERVER_MAX_BYTES).toBeLessThan(6 * 1024 * 1024);
    expect(DOCUMENT_SERVER_MAX_BYTES).toBeLessThan(DOCUMENT_MAX_BYTES);
    expect(DOCUMENT_MAX_BYTES).toBeGreaterThan(0);
  });
});

describe("safeDocumentFilename — safe in a header, sensible on disk", () => {
  it("normalises the suffix to the SNIFFED type", () => {
    expect(safeDocumentFilename("deck.pdf", "pptx")).toBe("deck.pptx");
    expect(safeDocumentFilename("deck.pptx", "pdf")).toBe("deck.pdf");
    expect(safeDocumentFilename("deck.PPTX", "pptx")).toBe("deck.pptx");
    expect(safeDocumentFilename("no-extension", "pptx")).toBe(
      "no-extension.pptx",
    );
  });

  it("strips a path down to its last segment", () => {
    expect(safeDocumentFilename("/etc/passwd", "pdf")).toBe("passwd.pdf");
    expect(safeDocumentFilename("C:\\Users\\x\\cat.pdf", "pdf")).toBe("cat.pdf");
    expect(safeDocumentFilename("../../escape.pdf", "pdf")).toBe("escape.pdf");
  });

  it("removes every character a Content-Disposition header cannot carry", () => {
    // NUL..US (including CR/LF — the header-injection class), DEL and the quote
    // that would close the value.
    const safe = safeDocumentFilename('a"b\u0000c\rd\ne\u007ff.pdf', "pdf");
    expect(safe).toBe("abcdef.pdf");
    expect(safe).not.toMatch(/[\u0000-\u001f\u007f"\\]/);
  });

  it("treats a backslash as a path separator, not as a character to keep", () => {
    // The last segment wins, so a Windows path cannot smuggle a directory into
    // the header — and the separator itself never survives.
    expect(safeDocumentFilename("C:\\tmp\\a\\b.pdf", "pdf")).toBe("b.pdf");
    expect(safeDocumentFilename('a"b\\c.pdf', "pdf")).toBe("c.pdf");
  });

  it("collapses whitespace so the name stays one line", () => {
    expect(safeDocumentFilename("  a\t\t b \n c.pdf ", "pdf")).toBe("a b c.pdf");
  });

  it("caps the length and never returns an empty base", () => {
    const long = safeDocumentFilename(`${"x".repeat(300)}.pdf`, "pdf");
    expect(long.length).toBeLessThanOrEqual(124);
    expect(long.endsWith(".pdf")).toBe(true);
    expect(safeDocumentFilename("", "pdf")).toBe("catalogue.pdf");
    expect(safeDocumentFilename("   ", "pptx")).toBe("catalogue.pptx");
  });

  it("degrades an unrecognised extension instead of echoing it", () => {
    // Defence in depth: a caller that sniffs its own bytes never reaches this,
    // and a caller that does cannot make the browser act on `evil.exe`.
    expect(safeDocumentFilename("x", "exe")).toBe("x.bin");
  });

  it("survives a non-string name", () => {
    expect(safeDocumentFilename(null, "pdf")).toBe("catalogue.pdf");
    expect(safeDocumentFilename(42, "pptx")).toBe("catalogue.pptx");
  });
});
