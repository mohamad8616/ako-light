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

  it("redirects unauthenticated users to the sign-in page with redirectTo", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await proxy(
      new NextRequest("http://localhost/admin/products"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/sign-in?redirectTo=%2Fadmin%2Fproducts",
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
});
