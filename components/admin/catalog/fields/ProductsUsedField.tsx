"use client";

import {
  FieldRow,
  ListRow,
  swapAt
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
 * One ordered row per linked product (reorder/remove like every list field),
 * plus an add-select that only offers products not already linked. Options come
 * from `getProductOptions()` — id/slug/localized-name — and are labeled with
 * the ACTIVE locale's name plus the category group.
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
  const { t } = useLanguage();
  const { lang } = useLanguage();
  const { control, setValue } = useFormContext();
  const ids = (useWatch({ control, name }) as string[] | undefined) ?? [];
  const [draft, setDraft] = React.useState("");

  const byId = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const available = products.filter((product) => !ids.includes(product.id));
  const items = Object.fromEntries(
    available.map((product) => [
      product.id,
      `${pick(product.name, lang as Locale)} — ${product.categorySlug}`,
    ]),
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
                {product ? pick(product.name, lang as Locale) : (id ?? "")}
              </p>
              {product ? (
                <p className="text-muted-foreground truncate font-mono text-[11px]">
                  {product.slug} · {product.categorySlug}
                </p>
              ) : null}
            </ListRow>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <Select
          items={items}
          value={draft}
          onValueChange={(value) =>
            setDraft(typeof value === "string" ? value : "")
          }
        >
          <SelectTrigger className="flex-1" aria-label={label}>
            <SelectValue placeholder={t("admin.crud.add")} />
          </SelectTrigger>
          <SelectContent dir={ADMIN_SHELL_DIR}>
            {available.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {`${pick(product.name, lang as Locale)} — ${product.categorySlug}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={!draft}
          onClick={() => {
            setValue(name, [...ids, draft], { shouldValidate: false });
            setDraft("");
          }}
        >
          {t("admin.crud.add")}
        </Button>
      </div>
    </FieldRow>
  );
}
