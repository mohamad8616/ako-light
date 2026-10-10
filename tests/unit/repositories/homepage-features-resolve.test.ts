/**
 * Homepage slot resolution (Pass C + follow-up).
 *
 * HERMETIC: pure functions, no database and no Next runtime.
 *
 * The bug this pins: an admin uploaded an image and typed a paragraph on the
 * Flagship One slot, saved, and the homepage kept showing the linked flagship's
 * own image and NO paragraph. The values were persisted; resolution discarded
 * them because the slot's `mode` column said `reference`.
 */
import { describe, expect, it } from "vitest";

import { resolveField } from "@/lib/repositories/homepage-features/resolve";
import { loc, type Localized } from "@/lib/i18n/localized";

const SAVED: Localized[] = [loc("Saved copy", "متن ذخیره‌شده")];
const REFERENCE: Localized[] = [loc("Linked copy", "متن مرتبط")];

describe("resolveField — an explicit admin value always wins", () => {
  it("uses the slot's image over the linked entity's", () => {
    // THE BUG. The slot held an uploaded URL; `reference` mode used to discard
    // it in favour of the flagship's seeded placeholder.
    expect(
      resolveField(
        false,
        "https://cdn.example/saved.jpg",
        "https://picsum.photos/seed/x",
      ),
    ).toBe("https://cdn.example/saved.jpg");
  });

  it("uses the slot's image regardless of the mode flag", () => {
    for (const mode of [true, false]) {
      expect(resolveField(mode, "saved", "linked")).toBe("saved");
    }
  });

  it("uses the slot's paragraphs over the linked entity's", () => {
    expect(resolveField(false, SAVED, REFERENCE)).toEqual(SAVED);
    expect(resolveField(true, SAVED, REFERENCE)).toEqual(SAVED);
  });

  it("falls back to the linked entity for a field the admin left EMPTY (NULL)", () => {
    expect(resolveField(false, null, "linked")).toBe("linked");
    expect(resolveField(false, undefined, "linked")).toBe("linked");
    expect(resolveField(false, null, REFERENCE)).toEqual(REFERENCE);
  });

  it("honours a deliberately cleared list ([] is a value, not a gap)", () => {
    expect(resolveField(false, [], REFERENCE)).toEqual([]);
  });

  it("resolves the Flagship One shape end to end", () => {
    // The exact row: reference mode, saved image + paragraphs, linked flagship
    // with no detail page.
    const row = {
      image: "https://cdn.example/homepage/uploaded.jpg",
      paragraphs: SAVED,
      kicker: null as Localized | null,
      title: null as Localized | null,
    };
    const linked = {
      image: "https://picsum.photos/seed/henge-london/900/1000",
      city: loc("London", "لندن"),
      name: loc("Henge London", "هنژ لندن"),
      detailParagraphs: [] as Localized[],
    };

    const mode = false; // `reference`

    expect(resolveField(mode, row.image, linked.image)).toBe(row.image);
    expect(resolveField(mode, row.paragraphs, linked.detailParagraphs)).toEqual(
      SAVED,
    );
    // Empty overrides still come from the linked flagship.
    expect(resolveField(mode, row.kicker, linked.city)).toEqual(linked.city);
    expect(resolveField(mode, row.title, linked.name)).toEqual(linked.name);
  });
});
