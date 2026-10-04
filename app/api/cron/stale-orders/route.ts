export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron calls this GET daily (see vercel.json). The API subtree is
 * deliberately excluded from proxy.ts's locale/auth matcher, so this route
 * MUST authenticate on its own, before importing or touching the database.
 * Vercel supplies `Authorization: Bearer <CRON_SECRET>` automatically.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    secret.length < 16 ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return Response.json({ error: "unauthorized" }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    // Import only AFTER authentication. Even an unauthenticated request must
    // never start a DB query or reveal whether stale orders exist.
    const { cleanupStalePendingOrders } = await import(
      "@/lib/orders/stale-cleanup"
    );
    const result = await cleanupStalePendingOrders();
    return Response.json(result, {
      status: result.errors ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Do not return raw driver/config errors; production logs get a category,
    // not SQL parameters or customer/payment details.
    console.error("[orders-cleanup] run failed", {
      category: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "cleanup_failed" }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
