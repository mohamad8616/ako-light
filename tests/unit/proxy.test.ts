import { isAdminPath, resolveProxyAction, shouldBypassAuth } from "@/proxy";
import { describe, expect, it } from "vitest";

describe("resolveProxyAction", () => {
  it("passes through explicit English routes", () => {
    expect(resolveProxyAction("/en")).toEqual({ type: "pass" });
    expect(resolveProxyAction("/en/about")).toEqual({ type: "pass" });
  });

  it("redirects legacy Persian paths to canonical unprefixed URLs", () => {
    expect(resolveProxyAction("/fa")).toEqual({
      type: "redirect",
      target: "/",
    });
    expect(resolveProxyAction("/fa/about")).toEqual({
      type: "redirect",
      target: "/about",
    });
  });

  it("rewrites canonical Persian routes into the locale tree", () => {
    expect(resolveProxyAction("/")).toEqual({
      type: "rewrite",
      target: "/fa",
    });
    expect(resolveProxyAction("/about")).toEqual({
      type: "rewrite",
      target: "/fa/about",
    });
  });
});

describe("shouldBypassAuth", () => {
  it("allows Better Auth and sign-in pages to remain public", () => {
    expect(shouldBypassAuth("/api/auth/login")).toBe(true);
    expect(shouldBypassAuth("/sign-in")).toBe(true);
    expect(shouldBypassAuth("/sign-in?redirectTo=%2Fabout")).toBe(true);
    expect(shouldBypassAuth("/en/sign-in?redirectTo=%2Fadmin")).toBe(true);
  });

  it("requires a session for admin and app routes", () => {
    expect(shouldBypassAuth("/about")).toBe(false);
    expect(shouldBypassAuth("/en/about")).toBe(false);
    expect(shouldBypassAuth("/admin")).toBe(false);
    expect(shouldBypassAuth("/en/admin")).toBe(false);
  });

  it("detects admin paths before locale rewrite logic", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/users")).toBe(true);
    expect(isAdminPath("/en/admin")).toBe(true);
    expect(isAdminPath("/fa/admin/users")).toBe(true);
    expect(isAdminPath("/about")).toBe(false);
  });
});
