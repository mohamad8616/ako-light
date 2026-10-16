import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression — the product form's `related` / `downloads` / `images` arrays
 * silently reverted to their server values on save.
 *
 * ── The bug ─────────────────────────────────────────────────────────────────
 *
 * Reported: "I added a related product, got a success toast, but nothing
 * changed on the product page." A DB round-trip proved the write path is
 * correct — `updateProduct` persists `related` and `mapProductRow` reads it
 * back — so the loss had to be CLIENT-SIDE, between the operator's pick and the
 * payload the action receives.
 *
 * Root cause: `useForm({ values })` is a REACTIVE prop. react-hook-form 7.88
 * runs, on every change to `props.values`:
 *
 *     if (props.values && !deepEqual(props.values, _values.current)) {
 *       control._reset(props.values, …);
 *     }
 *     _values.current = props.values;
 *
 * `ProductForm` passed a FRESH object literal (`values: detail ? {...detail} : {…}`)
 * on every render, so `props.values` changed identity constantly and the form
 * was repeatedly RESET. `_reset()` restores the registered/seed values and
 * DISCARDS anything written only through `setValue` — and `related`,
 * `downloads` and `images` are exactly that: they are driven by `setValue` +
 * `useWatch` (`ProductsUsedField`, `DocumentRowsField`, `useList`) and have no
 * registered `<input>` of their own. The scalar fields survived because the
 * reset re-seeded them from `detail` unchanged, which is why only the ARRAY
 * fields looked broken.
 *
 * ── The fix this test pins ──────────────────────────────────────────────────
 *
 * The seed is memoized (`React.useMemo`) so its identity is stable across
 * renders, which makes the `deepEqual` guard above pass and stops the reset.
 * `values` is deliberately kept over `defaultValues`: the form must still
 * follow server truth when the ROW ITSELF changes (create → edit navigation,
 * a `router.refresh()` after save), and only the identity churn was the bug.
 *
 * Static because the `unit` tier is node-only — there is no jsdom/React
 * renderer in this project, matching every other contract test in this
 * directory (see `product-edit-routing.test.ts`).
 */

const ROOT = process.cwd();

const FORM = readFileSync(
  join(ROOT, "components", "admin", "catalog", "products", "ProductForm.tsx"),
  "utf8",
);

const USED_FIELD = readFileSync(
  join(ROOT, "components", "admin", "catalog", "fields", "ProductsUsedField.tsx"),
  "utf8",
);

const DOCUMENT_ROWS = readFileSync(
  join(ROOT, "components", "admin", "catalog", "fields", "DocumentRowsField.tsx"),
  "utf8",
);

describe("product form seed stability", () => {
  it("memoizes the seed instead of rebuilding the literal inline", () => {
    // The seed object lives inside a useMemo…
    expect(FORM).toMatch(/const seed = React\.useMemo\(/);
    // …and the form consumes THAT, not a fresh literal.
    expect(FORM).toMatch(/values:\s*seed,/);
    // The old, buggy shape — an object literal passed straight to `values` —
    // must not come back.
    expect(FORM).not.toMatch(/values:\s*detail\s*\?/);
  });

  it("keeps `values` (reactive) rather than `defaultValues` (one-shot)", () => {
    // `defaultValues` would stop the reset too, but it would also stop the form
    // from following the row when the page navigates to a different product.
    expect(FORM).not.toMatch(/defaultValues:/);
    expect(FORM).toMatch(/values:\s*seed,/);
  });

  it("documents WHY the memo exists, so it is not 'simplified' away", () => {
    expect(FORM).toMatch(/`values`\) is a REACTIVE prop|is a REACTIVE prop/);
    expect(FORM).toMatch(/_reset|DISCARDS anything/i);
  });
});

describe("setValue-driven fields are the ones the reset would lose", () => {
  it("ProductsUsedField writes the array through setValue, not an input", () => {
    // If this ever gains a registered <input>, the reasoning above changes.
    expect(USED_FIELD).toMatch(/setValue\(\s*name,/);
  });

  it("DocumentRowsField drives its rows through the same list helper", () => {
    expect(DOCUMENT_ROWS).toMatch(/useList<DocumentRow>/);
  });
});

describe("edit is a PAGE, not an intercepted modal", () => {
  it("the @modal parallel route is gone", () => {
    // The modal slot, its intercepted page and the shell were deleted; the
    // edit screen is the dedicated `[id]/page.tsx`.
    expect(FORM).not.toMatch(/useOptionalProductModalClose/);
    expect(FORM).not.toMatch(/ProductEditModalShell/);
  });

  it("a save on the dedicated page refreshes rather than closing a modal", () => {
    expect(FORM).toMatch(/router\.refresh\(\)/);
    expect(FORM).not.toMatch(/closeModal/);
  });

  it("the products layout no longer takes a modal slot prop", () => {
    const layout = readFileSync(
      join(ROOT, "app", "[locale]", "(admin)", "admin", "products", "layout.tsx"),
      "utf8",
    );
    // The HISTORY prose in the doc-comment still names the modal on purpose —
    // so assert on the CODE: the signature takes only `children`.
    const code = layout
      .replace(/\r\n/g, "\n")
      .replace(/\/\*\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*/g, "");
    expect(code).not.toMatch(/modal/);
    expect(code).toMatch(/children/);
    expect(code).toMatch(/return <>\{children\}<\/>;/);
  });
});

/**
 * The same `values`-identity bug existed in every OTHER admin form that seeds
 * an object literal and stores an array through `setValue`. Each one is pinned
 * here so a future edit cannot reintroduce the churn in one place.
 *
 * `paragraphs` (`LocalizedListField`) and the project/product arrays
 * (`ImageListField`, `ProductsUsedField`) are all `setValue`-driven, so all of
 * them were silently reverted on save.
 */
const OTHER_FORMS: Array<{ name: string; path: string[] }> = [
  {
    name: "ProjectForm",
    path: ["components", "admin", "catalog", "projects", "ProjectForm.tsx"],
  },
  {
    name: "FlagshipForm",
    path: ["components", "admin", "catalog", "flagships", "FlagshipForm.tsx"],
  },
  {
    name: "CatalogueFeatureForm",
    path: [
      "components",
      "admin",
      "catalog",
      "homepage",
      "CatalogueFeatureForm.tsx",
    ],
  },
  {
    name: "FlagshipOneFeatureForm",
    path: [
      "components",
      "admin",
      "catalog",
      "homepage",
      "FlagshipOneFeatureForm.tsx",
    ],
  },
  {
    name: "ProjectDarkBackgroundFeatureForm",
    path: [
      "components",
      "admin",
      "catalog",
      "homepage",
      "ProjectDarkBackgroundFeatureForm.tsx",
    ],
  },
];

describe("every admin form with a setValue-driven field memoizes its seed", () => {
  for (const { name, path } of OTHER_FORMS) {
    describe(name, () => {
      const source = readFileSync(join(ROOT, ...path), "utf8");

      it("builds the seed inside a useMemo", () => {
        expect(source, `${name} has no memoized seed`).toMatch(
          /const seed = React\.useMemo</,
        );
      });

      it("passes the memoized seed to useForm", () => {
        expect(source, `${name} does not consume the seed`).toMatch(
          /values:\s*seed,/,
        );
      });

      it("does not pass an inline literal to `values` (the bug shape)", () => {
        // `values: {…}` or `values: detail ?? {…}` — both change identity per
        // render and reset the form.
        expect(source, `${name} still builds values inline`).not.toMatch(
          /values:\s*(\{|detail\s*\?)/,
        );
      });

      it("does not fall back to defaultValues", () => {
        // defaultValues would also stop the reset, but it would stop the form
        // from following the row too — the memo is the intended fix.
        expect(source).not.toMatch(/defaultValues:/);
      });
    });
  }
});
