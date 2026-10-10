/**
 * AdminText — bidirectional isolation for admin copy (Pass C, issue 1).
 *
 * Rendered for real with `react-dom/server` rather than grepped, so the
 * assertion is about the markup a browser receives.
 *
 * WHY THIS MATTERS: the admin shell is RTL for every locale (the sidebar docks
 * on the right). In an RTL paragraph the bidi algorithm gives trailing NEUTRAL
 * characters — a sentence's final period, a semicolon, a closing bracket — the
 * PARAGRAPH direction, so an English description rendered with its full stop at
 * the LEFT end. `dir="auto"` makes each element resolve direction from its own
 * first strong character, which is Unicode's own answer (UAX #9).
 */
import { AdminText } from "@/components/admin/AdminText";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const render = (props: Parameters<typeof AdminText>[0]) =>
  renderToStaticMarkup(React.createElement(AdminText, props));

describe("AdminText", () => {
  it("isolates direction with dir=auto", () => {
    expect(render({ children: "Find customers and moderate." })).toContain(
      'dir="auto"',
    );
  });

  it("defaults to a span", () => {
    expect(render({ children: "x" })).toMatch(/^<span /);
  });

  it("renders the requested element", () => {
    expect(render({ as: "p", children: "x" })).toMatch(/^<p /);
    expect(render({ as: "h2", children: "x" })).toMatch(/^<h2 /);
    expect(render({ as: "label", children: "x" })).toMatch(/^<label /);
  });

  it("keeps the supplied className alongside the isolation", () => {
    const html = render({ as: "p", className: "text-sm", children: "x" });
    expect(html).toContain('class="text-sm"');
    expect(html).toContain('dir="auto"');
  });

  it("passes an ENGLISH sentence through unchanged, so punctuation survives", () => {
    // The reported string. The fix is direction, never copy: not one character
    // of the sentence may be altered or stripped.
    const sentence =
      "Find customers and moderate their accounts. Admins may ban; only owners may change roles.";
    const html = render({ as: "p", children: sentence });

    expect(html).toContain(sentence);
    expect(html).toContain("."); // the full stop is still there
    expect(html).toContain(";");
  });

  it("passes a PERSIAN sentence through unchanged too", () => {
    const sentence =
      "یافتن مشتریان و مدیریت حساب آن‌ها. مدیران می‌توانند مسدود کنند؛ فقط مالک می‌تواند نقش‌ها را تغییر دهد.";
    expect(render({ as: "p", children: sentence })).toContain(sentence);
  });
});
