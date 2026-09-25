import { Prisma } from "@/generated/prisma/client";
import { actionFail, type ActionResult } from "@/lib/admin/result";

/**
 * Server-only half of the admin result contract.
 *
 * `toActionResult` needs the RUNTIME `Prisma` namespace (for the
 * `instanceof Prisma.PrismaClientKnownRequestError` check), and the generated
 * client's client.ts pulls node:process/node:path at module top level — so
 * this module must NEVER be imported, transitively or otherwise, from a client
 * component. The shared contract (`AdminErrorCode`, `ActionResult`,
 * `actionOk`, `actionFail`, the zod helpers) lives in the Prisma-free
 * `lib/admin/result.ts`, which client code may import freely.
 *
 * Only `lib/admin/actions/*` (server actions, proxied — never bundled into
 * client chunks) may import this file.
 */
/**
 * The unique column a driver-adapter P2002 collided on, or undefined.
 *
 * Two meta shapes must be handled because the shape moved with Prisma 7's
 * driver adapters:
 *   - classic engines: `meta.target` is `["slug"]` (or a constraint string).
 *   - driver adapters (pg, as configured here): `meta.target` is ABSENT and the
 *     column lives at
 *     `meta.driverAdapterError.cause.constraint.fields` — without this branch
 *     every collision degrades to a form-level error with no field, so the
 *     admin form cannot mark the offending input.
 * Nested column names ("Product.slug") are reduced to their leaf.
 */
function uniqueCollisionColumn(meta: unknown): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;

  const asLeaf = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const leaf = value.split(".").pop();
    return leaf && leaf.length > 0 ? leaf.trim() : undefined;
  };

  const target = (meta as { target?: unknown }).target;
  if (typeof target === "string") return asLeaf(target);
  if (Array.isArray(target)) {
    for (const entry of target) {
      const leaf = asLeaf(entry);
      if (leaf) return leaf;
    }
  }

  const fields = (
    meta as {
      driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
    }
  ).driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(fields)) {
    for (const entry of fields) {
      const leaf = asLeaf(entry);
      if (leaf) return leaf;
    }
  }

  return undefined;
}

export function toActionResult(error: unknown): ActionResult<never> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const column = uniqueCollisionColumn(error.meta);
      // The unique columns the forms submit are slug and id; anything else
      // still fails safely as a form-level error rather than a thrown one.
      const field = column === "slug" || column === "id" ? column : undefined;
      return actionFail("invalid", field ? [{ field, code: "slugTaken" }] : []);
    }
    if (error.code === "P2025") return actionFail("notFound");
    if (error.code === "P2003") return actionFail("relationViolation");
  }
  throw error;
}
