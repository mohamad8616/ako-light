"use client";

import {
  FieldRow,
  ListRow,
  swapAt,
} from "@/components/admin/catalog/fields/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick, type Localized } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import type { ProductOption } from "@/lib/repositories/products";
import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";

/** A denormalized `Product.related` snapshot row (see prisma `Product.related`). */
type RelatedSnapshotRow = {
  name: Localized;
  slug: string;
  category: string;
  image: string;
};

/**
 * The shared two-step product picker.
 *
 * ── Two steps, not one flat list ────────────────────────────────────────────
 *
 * A single Select over EVERY product in the catalog was unusable once the
 * catalog grew: the operator had to scroll a list of the whole shop to find one,
 * with the category visible only as a suffix on each label. The picker now
 * mirrors how the catalog is actually organised — pick a CATEGORY, then pick a
 * PRODUCT from that category. The second menu stays disabled until a category is
 * chosen, so the list the operator sees is never bigger than one category.
 *
 * The category list is DERIVED from `products` (unique `categorySlug`, in the
 * order they arrive) rather than queried separately: `getProductOptions()`
 * already orders by category `sortOrder`, so the derived order IS the nav order
 * and there is no second round-trip or second source of truth.
 *
 * Adding KEEPS the category selected, so several products from one category take
 * three clicks rather than three category re-selections; only the product draft
 * resets. Changing the category clears the product draft, so a selection from
 * the previous category can never be added by accident.
 *
 * ── Two storage shapes, ONE component ───────────────────────────────────────
 *
 * `mode` decides what a picked product is written as, so the project form
 * (`productIds` — a real join table) and the product form (`related` — a
 * denormalized jsonb snapshot, per the schema note) share every line of picker
 * UI instead of forking it:
 *
 *   - `"ids"` (default): the field holds `string[]` of Product.id, read back
 *     through `products` for its label. Rows are keyed by id.
 *   - `"snapshot"`: the field holds `RelatedSnapshotRow[]`. A pick is expanded
 *     into name/slug/category heroImage from the selected option, because the
 *     column is a snapshot by design — the public page renders it without a
 *     join.
 *
 * The label/placeholder keys are overridable too: the project form talks about
 * "products used", the product form about "related products".
 */
export function ProductsUsedField({
  name,
  label,
  hint,
  products,
  className,
  mode = "ids",
  required,
  optional,
  categoryPlaceholderKey = "admin.project.field.productsCategory",
  productPlaceholderKey = "admin.project.field.productsProduct",
  emptyKey = "admin.project.field.productsCategoryEmpty",
}: {
  name: string;
  label: string;
  hint?: string;
  products: ProductOption[];
  className?: string;
  /**
   * `"ids"` writes `string[]` (project form); `"snapshot"` writes
   * `RelatedSnapshotRow[]` (product form). Defaults to `"ids"`.
   */
  mode?: "ids" | "snapshot";
  required?: boolean;
  optional?: boolean;
  /** i18n key for the category step's placeholder. */
  categoryPlaceholderKey?: string;
  /** i18n key for the product step's placeholder. */
  productPlaceholderKey?: string;
  /** i18n key for the "this category has nothing left" note. */
  emptyKey?: string;
}) {
  const { t, lang } = useLanguage();
  const { control, setValue } = useFormContext();
  const watched = useWatch({ control, name }) as
    | (string | RelatedSnapshotRow)[]
    | undefined;
  const rows = watched ?? [];
  const [category, setCategory] = React.useState("");
  const [draft, setDraft] = React.useState("");

  const locale = lang as Locale;

  const byId = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  /** Unique categories, in the order `getProductOptions()` returns them. */
  const categories = React.useMemo(() => {
    const seen = new Map<string, ProductOption["categoryName"]>();
    for (const product of products) {
      if (!seen.has(product.categorySlug)) {
        seen.set(product.categorySlug, product.categoryName);
      }
    }
    return [...seen].map(([slug, name]) => ({ slug, name }));
  }, [products]);

  // Already-picked identity, in whichever shape this field stores. The
  // snapshot mode matches on slug (a snapshot has no id); the ids mode on id.
  const pickedKeys = React.useMemo(() => {
    if (mode === "snapshot") {
      return (rows as RelatedSnapshotRow[]).map((row) => row.slug);
    }
    return rows as string[];
  }, [rows, mode]);

  const available = products.filter((product) =>
    mode === "snapshot"
      ? !pickedKeys.includes(product.slug)
      : !pickedKeys.includes(product.id),
  );
  const inCategory = available.filter(
    (product) => product.categorySlug === category,
  );

  const categoryItems = Object.fromEntries(
    categories.map((entry) => [entry.slug, pick(entry.name, locale)]),
  );
  const productItems = Object.fromEntries(
    inCategory.map((product) => [product.id, pick(product.name, locale)]),
  );

  /** What a picked product becomes in the field's storage shape. */
  const toStoredRow = (product: ProductOption): string | RelatedSnapshotRow =>
    mode === "snapshot"
      ? {
          name: product.name,
          slug: product.slug,
          category: product.categorySlug,
          image: product.image,
        }
      : product.id;

  const labelForRow = (row: string | RelatedSnapshotRow): string => {
    if (typeof row === "string") {
      const product = byId.get(row);
      return product ? pick(product.name, locale) : row;
    }
    return pick(row.name, locale);
  };

  const sublabelForRow = (row: string | RelatedSnapshotRow): string | null => {
    if (typeof row === "string") {
      const product = byId.get(row);
      return product
        ? `${pick(product.categoryName, locale)} · ${product.slug}`
        : null;
    }
    return row.category ? `${row.category} · ${row.slug}` : row.slug;
  };

  return (
    <FieldRow
      label={label}
      hint={hint}
      className={className}
      required={required}
      optional={optional}
    >
      <ul className="space-y-2">
        {rows.map((row, index) => {
          const sublabel = sublabelForRow(row);
          return (
            <ListRow
              key={typeof row === "string" ? row : row.slug}
              index={index}
              onRemove={() =>
                setValue(
                  name,
                  rows.filter((_, i) => i !== index),
                  { shouldValidate: false },
                )
              }
              onMoveUp={
                index > 0
                  ? () =>
                      setValue(name, swapAt(rows, index, -1), {
                        shouldValidate: false,
                      })
                  : undefined
              }
              onMoveDown={
                index < rows.length - 1
                  ? () =>
                      setValue(name, swapAt(rows, index, 1), {
                        shouldValidate: false,
                      })
                  : undefined
              }
            >
              <p className="text-foreground truncate text-sm">
                {labelForRow(row)}
              </p>
              {sublabel ? (
                <p className="text-muted-foreground truncate text-[11px]">
                  {sublabel}
                </p>
              ) : null}
            </ListRow>
          );
        })}
      </ul>

      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {/* Step 1 — the category. Always available. */}
          <Select
            items={categoryItems}
            value={category}
            onValueChange={(value) => {
              setCategory(typeof value === "string" ? value : "");
              // A product picked from the PREVIOUS category must not survive the
              // switch — otherwise "Add" would link something the operator is no
              // longer looking at.
              setDraft("");
            }}
          >
            <SelectTrigger className="w-full" aria-label={t(categoryPlaceholderKey)}>
              <SelectValue placeholder={t(categoryPlaceholderKey)} />
            </SelectTrigger>
            <SelectContent dir={ADMIN_SHELL_DIR}>
              {categories.map((entry) => (
                <SelectItem key={entry.slug} value={entry.slug}>
                  {pick(entry.name, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Step 2 — the product, scoped to that category. */}
          <Select
            items={productItems}
            value={draft}
            onValueChange={(value) =>
              setDraft(typeof value === "string" ? value : "")
            }
            disabled={!category}
          >
            <SelectTrigger className="w-full" aria-label={t(productPlaceholderKey)}>
              <SelectValue placeholder={t(productPlaceholderKey)} />
            </SelectTrigger>
            <SelectContent dir={ADMIN_SHELL_DIR}>
              {inCategory.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {pick(product.name, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={!draft}
            onClick={() => {
              const product = byId.get(draft);
              if (product) {
                setValue(name, [...rows, toStoredRow(product)], {
                  shouldValidate: false,
                });
              }
              // Keep the category: adding a second product from the same
              // category is the common case.
              setDraft("");
            }}
          >
            {t("admin.crud.add")}
          </Button>
          {category && inCategory.length === 0 ? (
            <p className="text-muted-foreground text-[11px]">{t(emptyKey)}</p>
          ) : null}
        </div>
      </div>
    </FieldRow>
  );
}
