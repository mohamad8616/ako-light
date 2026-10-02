/**
 * Public entry point for the repeatable list fields (`fields/`).
 *
 * Usage — one import path for all three, unchanged by the split:
 *
 *   import { StringListField, MixedListField } from "@/components/admin/catalog/fields/ListFields";
 *
 * Why a barrel: the three entity forms that use these (`FlagshipForm`,
 * `ProductForm`, `ProjectForm`) keep one stable specifier even if a field is
 * renamed or split further, and each field stays importable on its own.
 *
 * Instructions:
 *   - Do NOT add `"use client"` to this file. Every re-exported module already
 *     carries its own directive, which is what keeps the client boundary at the
 *     field rather than at the form. A directive here would drag anything a
 *     future importer adds into the client bundle.
 *   - The shared row chrome lives in `./ListFieldShell` and is NOT re-exported:
 *     it is an implementation detail of the three fields, not part of their API.
 *   - Adding a field to this folder means one new file plus one line below.
 */
export { StringListField } from "./StringListField";
export { MixedListField } from "./MixedListField";
export { LocalizedLabeledRowsField } from "./LocalizedLabeledRowsField";
