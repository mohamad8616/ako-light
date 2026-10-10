import * as React from "react";

/**
 * Admin text, rendered with bidirectional isolation.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * The admin shell is RTL for every locale (see ADMIN_SHELL_DIR). That is
 * deliberate — the sidebar docks on the right — but it has a consequence for
 * TEXT: in an RTL paragraph the Unicode bidi algorithm assigns trailing NEUTRAL
 * characters (a sentence's final period, a semicolon, a closing bracket, a
 * slash) the PARAGRAPH direction. So an English description rendered inside the
 * RTL shell put its full stop at the LEFT end of the line:
 *
 *     ".Find customers and moderate their accounts. Admins may ban"
 *
 * — punctuation on the wrong side, clauses looking reversed. The same thing
 * happens to a Persian sentence containing a Latin word (an email, an ID, a
 * product code).
 *
 * `dir="auto"` fixes it at the smallest possible scope: each element resolves
 * its direction from its OWN first strong character, so English renders LTR and
 * Persian renders RTL, with punctuation on the correct side in both. It does
 * NOT change the shell's direction, so the sidebar stays where it belongs.
 *
 * This is Unicode's own mechanism for exactly this problem (UAX #9 "first
 * strong character" heuristic) — not a CSS hack and not a copy change.
 *
 * ── When NOT to use it ──────────────────────────────────────────────────────
 *
 * Values whose direction is fixed regardless of context — an email address, a
 * UUID, a price, a phone number — should use an explicit `dir="ltr"` instead,
 * so they cannot be flipped by a neighbouring RTL word.
 */
export function AdminText({
  as: Tag = "span",
  className,
  children,
}: {
  /** The element to render. Defaults to `span`. */
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "label";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag dir="auto" className={className}>
      {children}
    </Tag>
  );
}
