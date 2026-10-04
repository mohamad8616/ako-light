import {
  isAdminPath,
  proxy,
  resolveProxyAction,
  shouldBypassAuth,
} from "@/proxy";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

describe("resolveProxyAction", () => {
  it("passes through the canonical Persian tree", () => {
    expect(resolveProxyAction("/fa")).toEqual({ type: "pass" });
    expect(resolveProxyAction("/fa/about")).toEqual({ type: "pass" });
    expect(resolveProxyAction("/fa/admin/products")).toEqual({ type: "pass" });
  });

  it("redirects the legacy English prefix to the canonical unprefixed URL", () => {
    expect(resolveProxyAction("/en")).toEqual({
      type: "redirect",
      target: "/",
    });
    expect(resolveProxyAction("/en/about")).toEqual({
      type: "redirect",
      target: "/about",
    });
    expect(resolveProxyAction("/en/admin/products")).toEqual({
      type: "redirect",
      target: "/admin/products",
    });
  });

  it("rewrites canonical English routes into the locale tree", () => {
    expect(resolveProxyAction("/")).toEqual({
      type: "rewrite",
      target: "/en",
    });
    expect(resolveProxyAction("/about")).toEqual({
      type: "rewrite",
      target: "/en/about",
    });
    expect(resolveProxyAction("/admin/products")).toEqual({
      type: "rewrite",
      target: "/en/admin/products",
    });
  });

  it("never chains redirects (a redirect target is never itself a redirect)", () => {
    // A 308 to a path that 308s again would be an avoidable extra hop; the
    // canonical target must be terminal (pass or rewrite).
    for (const p of ["/en", "/en/about", "/en/admin/products"]) {
      const action = resolveProxyAction(p);
      expect(action.type).toBe("redirect");
      if (action.type !== "redirect") continue;
      expect(resolveProxyAction(action.target).type).not.toBe("redirect");
    }
  });
});

describe("shouldBypassAuth", () => {
  it("allows Better Auth and sign-in pages to remain public", () => {
    expect(shouldBypassAuth("/api/auth/login")).toBe(true);
    expect(shouldBypassAuth("/sign-in")).toBe(true);
    expect(shouldBypassAuth("/sign-in?redirectTo=%2Fabout")).toBe(true);
    expect(shouldBypassAuth("/en/sign-in?redirectTo=%2Fadmin")).toBe(true);
    expect(shouldBypassAuth("/fa/sign-in?redirectTo=%2Ffa%2Fadmin")).toBe(true);
  });

  it("requires a session for admin and app routes", () => {
    expect(shouldBypassAuth("/about")).toBe(false);
    expect(shouldBypassAuth("/en/about")).toBe(false);
    expect(shouldBypassAuth("/admin")).toBe(false);
    expect(shouldBypassAuth("/fa/admin")).toBe(false);
  });

  it("detects admin paths before locale rewrite logic", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/users")).toBe(true);
    expect(isAdminPath("/fa/admin")).toBe(true);
    expect(isAdminPath("/fa/admin/users")).toBe(true);
    expect(isAdminPath("/en/admin")).toBe(true);
    expect(isAdminPath("/about")).toBe(false);
  });
});

describe("proxy admin guard", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("redirects signed-in users without an admin-level role to the homepage", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "user" } });

    const response = await proxy(
      new NextRequest("http://localhost/admin?tab=overview"),
    );

    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("keeps the Persian tree when bouncing a non-admin", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "user" } });

    const response = await proxy(
      new NextRequest("http://localhost/fa/admin"),
    );

    expect(response.headers.get("location")).toBe("http://localhost/fa");
  });

  it("redirects unauthenticated users to the sign-in page with redirectTo", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(
      new NextRequest("http://localhost/admin/products"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/sign-in?redirectTo=%2Fadmin%2Fproducts",
    );
  });

  it("sends an unauthenticated Persian admin to the Persian sign-in page", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(new NextRequest("http://localhost/fa/admin"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/fa/sign-in?redirectTo=%2Ffa%2Fadmin",
    );
  });

  it("allows admin and owner roles through the admin route", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });

    const response = await proxy(new NextRequest("http://localhost/admin"));

    expect(response.headers.get("location")).toBeNull();

    mockGetSession.mockResolvedValue({ user: { role: "owner" } });
    const ownerResponse = await proxy(
      new NextRequest("http://localhost/admin"),
    );

    expect(ownerResponse.headers.get("location")).toBeNull();
  });

  it("allows admin roles through the Persian admin route", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });

    const response = await proxy(new NextRequest("http://localhost/fa/admin"));

    expect(response.headers.get("location")).toBeNull();
  });
});
