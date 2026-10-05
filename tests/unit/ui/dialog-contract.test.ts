import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Pass 5 — the admin modal UX contract.
 *
 * These are STATIC source assertions rather than rendered-DOM assertions: the
 * repository has no jsdom/React Testing Library environment (see vitest.config —
 * every project is `environment: "node"`), and the properties that broke are
 * properties of the Tailwind class list, not of a render tree. A grep of the
 * source is exactly as strong here and costs no new dependency.
 *
 * WHAT BROKE (Pass 5 root causes):
 *
 *   1. `DialogContent` carried `overflow-y-auto`, so the popup itself scrolled.
 *      A long form pushed the title AND the Save/Cancel row off screen and kept
 *      scrolling them, leaving an admin unable to reach the actions.
 *   2. Only `DialogHeader` had padding. Form bodies and action rows carried
 *      none, so fields and buttons touched the modal edges — inconsistently,
 *      because two call sites had patched themselves ad hoc.
 *
 * Each test below pins one of those two fixes so a future edit to the shared
 * primitive, or to any admin dialog, fails loudly here first.
 */

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const DIALOG = read("../../../components/ui/dialog.tsx");

/**
 * Strip `//` line comments before asserting on class lists.
 *
 * This matters: the fix is documented IN the source (the DialogContent comment
 * names `overflow-y-auto` to explain why it is gone). A naive slice would find
 * the words in the prose and report a false failure — so every class-list
 * assertion below runs against comment-free source.
 */
const stripLineComments = (source: string) =>
  source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");

const DIALOG_CODE = stripLineComments(DIALOG);

/** The class string of a `data-slot="..."` element, comment-free. */
function classBlockOf(source: string, slot: string): string {
  const start = source.indexOf(`data-slot="${slot}"`);
  expect(start, `no data-slot="${slot}" in source`).toBeGreaterThan(-1);
  // Up to the next data-slot= (or EOF) is enough to hold this element's classes.
  const next = source.indexOf('data-slot="', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

/**
 * The admin dialogs that must carry the shared inset + scroll region.
 *
 * AdminsTable is deliberately absent: its role-confirmation dialog has NO body
 * content at all (the title and description carry every word), so wrapping an
 * empty region in a DialogBody would be dead markup. It is asserted separately
 * below for the one thing it does need — a padded, pinned action row.
 */
const ADMIN_DIALOGS: Array<{ name: string; path: string }> = [
  {
    name: "DialogFormShell",
    path: "../../../components/admin/catalog/fields/DialogFormShell.tsx",
  },
  {
    name: "ProductEditModalShell",
    path: "../../../components/admin/catalog/products/ProductEditModalShell.tsx",
  },
  {
    name: "DeleteDialog",
    path: "../../../components/admin/catalog/DeleteDialog.tsx",
  },
  {
    name: "DesignersTable",
    path: "../../../components/admin/catalog/designers/DesignersTable.tsx",
  },
  {
    name: "ProductCategoriesTable",
    path:
      "../../../components/admin/catalog/product-categories/ProductCategoriesTable.tsx",
  },
  {
    name: "MediaUploadDialog",
    path: "../../../components/admin/media/MediaUploadDialog.tsx",
  },
  {
    name: "MediaDetailsDialog",
    path: "../../../components/admin/media/MediaDetailsDialog.tsx",
  },
  {
    name: "MediaPickerDialog",
    path: "../../../components/admin/settings/MediaPickerField.tsx",
  },
];

/** Dialogs with no scrollable content — they still need a padded action row. */
const BODYLESS_DIALOGS: Array<{ name: string; path: string }> = [
  {
    name: "AdminsTable",
    path: "../../../components/admin/catalog/admins/AdminsTable.tsx",
  },
];

const ALL_ADMIN_DIALOGS = [...ADMIN_DIALOGS, ...BODYLESS_DIALOGS];

describe("DialogContent — the popup must not own the scroll", () => {
  const popup = classBlockOf(DIALOG_CODE, "dialog-content");

  it("does not put overflow-y-auto on the popup (regression: the whole modal scrolled)", () => {
    expect(popup).not.toContain("overflow-y-auto");
    expect(popup).toContain("overflow-hidden");
  });

  it("caps height relative to the viewport, not with a hardcoded pixel height", () => {
    // dvh (not vh) so mobile browser chrome cannot hide the action row; the
    // value must be viewport-relative so no screen size is broken by it.
    expect(popup).toMatch(/max-h-\[90d?vh\]/);
    expect(popup).not.toMatch(/h-\[\d+px\]/);
  });

  it("is a flex column so pinned children and a shrinking body can coexist", () => {
    expect(popup).toContain("flex-col");
  });
});

describe("DialogBody — the one scrolling region", () => {
  const body = classBlockOf(DIALOG_CODE, "dialog-body");

  it("owns overflow-y-auto and lets itself shrink (min-h-0)", () => {
    expect(body).toContain("overflow-y-auto");
    expect(body).toContain("min-h-0");
    // The popup is capped; without min-h-0 a flex item floors at auto and the
    // column grows past the cap instead of scrolling inside it.
    expect(body).toContain("flex-1");
  });

  it("contains overscroll so the wheel cannot chain to the page behind", () => {
    expect(body).toContain("overscroll-contain");
  });

  it("is exported alongside DialogHeader so callers can compose the layout", () => {
    expect(DIALOG).toMatch(/^\s*DialogBody,\s*$/m);
    expect(DIALOG).toMatch(/^\s*DialogFooter,\s*$/m);
  });
});

describe("DialogHeader / DialogFooter stay outside the scroll", () => {
  it("DialogHeader shrinks-0 so the title cannot be scrolled away", () => {
    const header = classBlockOf(DIALOG_CODE, "dialog-header");
    expect(header).toContain("shrink-0");
    expect(header).toContain("p-6");
  });

  it("DialogHeader reserves room on the end edge for the absolutely-positioned close button", () => {
    const header = classBlockOf(DIALOG_CODE, "dialog-header");
    // Logical `pe-*`, not `pr-*`: the X sits at `right-4` in both directions
    // and an RTL admin panel must not let a long title run under it.
    expect(header).toMatch(/pe-\d+/);
  });

  it("DialogFooter shrinks-0 so the action row can never be squeezed out", () => {
    const footer = classBlockOf(DIALOG_CODE, "dialog-footer");
    expect(footer).toContain("shrink-0");
  });
});

describe("every admin dialog uses the shared body + inset", () => {
  for (const { name, path } of ADMIN_DIALOGS) {
    describe(name, () => {
      const source = read(path);

      it("renders its content inside DialogBody", () => {
        expect(source, `${name} must import DialogBody`).toMatch(
          /\bDialogBody\b/,
        );
        expect(source, `${name} must render <DialogBody`).toMatch(
          /<DialogBody[\s>]/,
        );
      });

      it("closes DialogBody", () => {
        expect(source).toMatch(/<\/DialogBody>/);
      });

      it("gives the scrolling content a horizontal inset (fields must not touch the edge)", () => {
        // Either the body itself carries px-6, or a child inside it does.
        // DialogBody className={...}  OR  a child with px-6 immediately after.
        const hasPx =
          /<DialogBody[^>]*className="[^"]*\bpx-6\b/.test(source) ||
          /<DialogBody[^>]*>[\s\S]{0,1200}?\bpx-6\b/.test(source);
        expect(hasPx, `${name} is missing the px-6 inset`).toBe(true);
      });

      it("keeps a bottom inset so the last element does not touch the edge", () => {
        expect(source, `${name} is missing pb-6`).toMatch(/\bpb-6\b/);
      });
    });
  }
});

describe("dialogs without scrollable content still get a padded, pinned action row", () => {
  for (const { name, path } of BODYLESS_DIALOGS) {
    it(`${name} pads and pins its footer`, () => {
      const source = read(path);
      expect(source, `${name} must render <DialogFooter`).toMatch(
        /<DialogFooter[\s>]/,
      );
      expect(source, `${name} footer needs px-6`).toMatch(
        /<DialogFooter[^>]*className="[^"]*\bpx-6\b/,
      );
      expect(source, `${name} footer needs pb-6`).toMatch(
        /<DialogFooter[^>]*className="[^"]*\bpb-6\b/,
      );
    });

    it(`${name} does not hand-roll a footer div (the primitive owns it)`, () => {
      // The pre-Pass-5 shape was an untagged flex div with no inset.
      const source = read(path);
      expect(source).not.toMatch(
        /<div className="flex items-center justify-end gap-2 px-6 pb-6">/,
      );
    });
  }
});

describe("action-button semantics", () => {
  it("delete/destroy actions use the destructive variant", () => {
    const deleteDialog = read(
      "../../../components/admin/catalog/DeleteDialog.tsx",
    );
    // The confirm button is the destructive one; Cancel is outline.
    expect(deleteDialog).toMatch(/variant="destructive"/);
    expect(deleteDialog).toMatch(/variant="outline"/);

    const details = read(
      "../../../components/admin/media/MediaDetailsDialog.tsx",
    );
    expect(details).toMatch(/variant="destructive"/);

    const admins = read(
      "../../../components/admin/catalog/admins/AdminsTable.tsx",
    );
    // Demoting an admin to `user` is destructive; promoting is not.
    expect(admins).toMatch(/"user" \? "destructive" : "default"/);
  });

  it("no admin dialog submits a form with a destructive button", () => {
    // A destructive-styled submit would read as "this deletes" while it saves.
    // Every `type="submit"` button in the audited dialogs is non-destructive.
    for (const { name, path } of ALL_ADMIN_DIALOGS) {
      const source = read(path);
      const submits =
        source.match(/<Button[^>]*type="submit"[\s\S]{0,200}?>/g) ?? [];
      for (const submit of submits) {
        expect(
          submit.includes('variant="destructive"'),
          `${name} has a destructive submit button`,
        ).toBe(false);
      }
    }
  });

  it("dialogs carry a title (the accessible name Radix derives from it)", () => {
    for (const { name, path } of ALL_ADMIN_DIALOGS) {
      const source = read(path);
      expect(source, `${name} has no DialogTitle`).toMatch(/<DialogTitle[\s>]/);
    }
  });
});
