import * as React from "react";

/**
 * The products segment's parallel-route layout.
 *
 * Adding the @modal slot here is what turns the intercepted
 * /admin/products/<id> soft navigation into a modal OVER the list: on a soft
 * navigation the list (children) stays mounted and the intercepted page
 * renders into this slot; on a hard navigation default.tsx renders instead, so
 * the modal never appears on its own.
 *
 * The layout deliberately renders nothing itself — it is a pure passthrough
 * whose only job is to accept the slot.
 */
export default function ProductsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
