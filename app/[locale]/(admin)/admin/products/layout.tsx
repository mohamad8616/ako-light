import * as React from "react";

/**
 * The products segment's layout — a pure passthrough.
 *
 * HISTORY: this segment used to declare a `@modal` parallel-route slot, so a
 * soft navigation to `/admin/products/<id>` rendered the edit form as a MODAL
 * over the list. The edit screen is now a real PAGE: the modal slot, its
 * intercepted `(.)[id]` route and the `ProductEditModalShell` are gone, which
 * is why this layout no longer takes a `modal` prop.
 *
 * It is kept (rather than deleted) because the segment may want a shared
 * layout again, and an explicit passthrough documents that there is
 * deliberately no chrome here.
 */
export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
