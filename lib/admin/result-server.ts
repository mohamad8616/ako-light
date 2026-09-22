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
export function toActionResult(error: unknown): ActionResult<never> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const column =
        Array.isArray(target) && typeof target[0] === "string"
          ? target[0]
          : undefined;
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
