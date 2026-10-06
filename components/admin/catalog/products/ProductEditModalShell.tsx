"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ADMIN_SHELL_DIR } from "@/lib/admin/sections";
import { useRouter } from "next/navigation";
import * as React from "react";

/**
 * Publishes the modal's close action to the form it renders.
 *
 * The intercepted page is a SERVER component, so it cannot pass a client
 * callback down to the client ProductForm. The shell owns the close logic
 * (router.back) and shares it here; ProductForm reads it with
 * `useOptionalProductModalClose`, which is undefined on the dedicated [id]
 * page, where an inline save correctly stays put instead of navigating.
 */
const ProductModalCloseContext = React.createContext<(() => void) | undefined>(
  undefined,
);

/** The modal's close action, or undefined when not rendered inside the modal. */
export function useOptionalProductModalClose(): (() => void) | undefined {
  return React.useContext(ProductModalCloseContext);
}

/**
 * The URL-backed product edit modal shell.
 *
 * This is the "chrome" half of the parallel/intercepting-route modal (the
 * @modal/(.)[id] page passes the form through as children, so the form itself
 * stays exactly the ProductForm the dedicated edit page renders).
 *
 * Closing is a history navigation on purpose: the modal is a route, so Back /
 * the X button / clicking the overlay all return to the Products list URL and
 * the browser's Back stack behaves the way a URL-backed modal must.
 *
 * `dir` is restated like DialogFormShell does — the content portals into
 * document.body, outside the admin shell's RTL wrapper.
 */
export function ProductEditModalShell({
  title,
  children,
}: {
  /** Already-translated dialog title. */
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  // Stable across renders: the dialog's onOpenChange only ever fires with
  // `false` here (open is always true while the route is mounted).
  const onClose = React.useCallback(() => router.back(), [router]);

  return (
    <ProductModalCloseContext.Provider value={onClose}>
      <Dialog open onOpenChange={onClose}>
        <DialogContent dir={ADMIN_SHELL_DIR} className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {/* The body is the ONLY scrolling region — the header above stays
              pinned while the long ProductForm scrolls under it. px-6 pb-6
              supplies the shared inset (the header already carries its own). */}
          <DialogBody className="px-6 pb-6">{children}</DialogBody>
        </DialogContent>
      </Dialog>
    </ProductModalCloseContext.Provider>
  );
}
