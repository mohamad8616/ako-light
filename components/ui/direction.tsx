"use client";

import { DirectionProvider as DirectionProviderPrimitive } from "@base-ui/react/direction-provider";
import * as React from "react";

/**
 * Reading direction for Base UI's portalled primitives.
 *
 * Why this exists: Base UI renders dialog / select / menu popups into
 * `document.body`, i.e. OUTSIDE whatever `dir`-carrying wrapper the page
 * renders. On a route whose document direction differs from the shell's — the
 * admin shell is RTL while `/en/admin` sits under `html dir="ltr"` — those
 * popups would silently flip to LTR. `DirectionProvider` is a context-only
 * component (it renders no DOM), so wrapping a subtree here costs nothing and
 * makes every Base UI primitive inside it follow the shell's direction.
 *
 * `dir` is accepted as an alias of Base UI's own `direction` prop so call sites
 * can share one constant (see ADMIN_SHELL_DIR) without re-naming it.
 */
function DirectionProvider({
  dir,
  direction,
  ...props
}: Omit<React.ComponentProps<typeof DirectionProviderPrimitive>, "direction"> & {
  /** Alias for Base UI's `direction`. */
  dir?: "ltr" | "rtl";
  direction?: "ltr" | "rtl";
}) {
  return (
    <DirectionProviderPrimitive direction={direction ?? dir} {...props} />
  );
}

export { DirectionProvider };
