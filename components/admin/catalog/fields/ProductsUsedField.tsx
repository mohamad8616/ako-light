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
import { pick } from "@/lib/i18n/localized";
import type { Locale } from "@/lib/i18n/routing";
import type { ProductOption } from "@/lib/repositories/products";
import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";

/**
 * The project form's ordered "products used" picker, writing `productIds`.
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
 * Options come from `getProductOptions()` — id/slug/localized name — and rows
 * are labeled with the ACTIVE locale's name plus the category group.
 */
export function ProductsUsedField({
  name,
  label,
  hint,
  products,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  products: ProductOption[];
  className?: string;
}) {
  const { t, lang } = useLanguage();
  const { control, setValue } = useFormContext();
  const ids = (useWatch({ control, name }) as string[] | undefined) ?? [];
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

  const available = products.filter((product) => !ids.includes(product.id));
  const inCategory = available.filter(
    (product) => product.categorySlug === category,
  );

  const categoryItems = Object.fromEntries(
    categories.map((entry) => [entry.slug, pick(entry.name, locale)]),
  );
  const productItems = Object.fromEntries(
    inCategory.map((product) => [product.id, pick(product.name, locale)]),
  );

  return (
    <FieldRow label={label} hint={hint} className={className}>
      <ul className="space-y-2">
        {ids.map((id, index) => {
          const product = byId.get(id);
          return (
            <ListRow
              key={id}
              index={index}
              onRemove={() =>
                setValue(
                  name,
                  ids.filter((_, i) => i !== index),
                  { shouldValidate: false },
                )
              }
              onMoveUp={
                index > 0
                  ? () =>
                      setValue(name, swapAt(ids, index, -1), {
                        shouldValidate: false,
                      })
                  : undefined
              }
              onMoveDown={
                index < ids.length - 1
                  ? () =>
                      setValue(name, swapAt(ids, index, 1), {
                        shouldValidate: false,
                      })
                  : undefined
              }
            >
              <p className="text-foreground truncate text-sm">
                {product ? pick(product.name, locale) : (id ?? "")}
              </p>
              {product ? (
                <p className="text-muted-foreground truncate text-[11px]">
                  {pick(product.categoryName, locale)} · {product.slug}
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
            <SelectTrigger
              className="w-full"
              aria-label={t("admin.project.field.productsCategory")}
            >
              <SelectValue
                placeholder={t("admin.project.field.productsCategory")}
              />
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
            <SelectTrigger
              className="w-full"
              aria-label={t("admin.project.field.productsProduct")}
            >
              <SelectValue
                placeholder={t("admin.project.field.productsProduct")}
              />
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
              setValue(name, [...ids, draft], { shouldValidate: false });
              // Keep the category: adding a second product from the same
              // category is the common case.
              setDraft("");
            }}
          >
            {t("admin.crud.add")}
          </Button>
          {category && inCategory.length === 0 ? (
            <p className="text-muted-foreground text-[11px]">
              {t("admin.project.field.productsCategoryEmpty")}
            </p>
          ) : null}
        </div>
      </div>
    </FieldRow>
  );
}
