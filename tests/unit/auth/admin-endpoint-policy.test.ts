/**
 * The better-auth admin-endpoint policy (lib/auth/admin-endpoint-policy.ts).
 *
 * HERMETIC — no server, no database, no better-auth runtime. That is the point
 * of the module: the `auth` tier drives a real Next server against a remote
 * pooler and is subject to its flakiness, so the rules that decide whether an
 * `admin` can take over an `owner` must be checkable without it.
 *
 * The endpoint-level proof (real sessions over HTTP) lives in
 * tests/integration/auth/admin-endpoint-authorization.test.ts. This file pins
 * the DECISION TABLE those requests exercise.
 */
import { describe, expect, it } from "vitest";

import {
  ADMIN_TARGET_FIELD,
  ROLE_RANK,
  actorOutranksTarget,
  adminTargetField,
  checkAdminActor,
} from "@/lib/auth/admin-endpoint-policy";

describe("adminTargetField", () => {
  it("names the target field for every guarded endpoint", () => {
    for (const [path, field] of Object.entries(ADMIN_TARGET_FIELD)) {
      expect(adminTargetField(path), path).toBe(field);
    }
  });

  it("guards the escalation-critical endpoints", () => {
    // A regression here is not a style problem. `/admin/set-user-password` in
    // particular: an `admin` HOLDS `user: ["set-password"]` (1.7.7's `adminAc`
    // grants it, and the admin role drops only `set-role`), so if this entry
    // ever disappears an admin can set an OWNER's password, sign in as that
    // owner, and the whole hierarchy is bypassed.
    for (const path of [
      "/admin/set-role",
      "/admin/update-user",
      "/admin/set-user-password",
      "/admin/ban-user",
      "/admin/unban-user",
      "/admin/remove-user",
      "/admin/revoke-user-sessions",
      "/admin/list-user-sessions",
      "/admin/impersonate-user",
    ]) {
      expect(adminTargetField(path), `${path} must be guarded`).toBe("userId");
    }
  });

  it("ignores endpoints that take no target", () => {
    for (const path of [
      "/admin/list-users",
      "/admin/has-permission",
      "/admin/stop-impersonating",
      "/sign-in/email",
      "/ok",
    ]) {
      expect(adminTargetField(path), path).toBeNull();
    }
  });

  it("tolerates a path that still carries the mount prefix", () => {
    // Defensive: `ctx.path` is plugin-relative in 1.7.7, but a future version
    // changing that must not silently disable every rule.
    expect(adminTargetField("/api/auth/admin/set-user-password")).toBe("userId");
  });
});

describe("checkAdminActor", () => {
  const args = {
    actorRole: "admin" as const,
    actorId: "actor",
    targetId: "target",
  };

  it("refuses an actor that is not admin-level", () => {
    expect(checkAdminActor({ ...args, actorRole: "user" })).toBe("not-admin");
    expect(checkAdminActor({ ...args, actorRole: undefined })).toBe(
      "not-admin",
    );
  });

  it("accepts both admin-level actors", () => {
    expect(checkAdminActor({ ...args, actorRole: "admin" })).toBe("ok");
    expect(checkAdminActor({ ...args, actorRole: "owner" })).toBe("ok");
  });

  it("refuses self-targeting for EVERY admin-level actor", () => {
    // An owner demoting or banning itself is the case better-auth's own
    // endpoints do not cover.
    expect(
      checkAdminActor({ actorRole: "owner", actorId: "me", targetId: "me" }),
    ).toBe("self");
    expect(
      checkAdminActor({ actorRole: "admin", actorId: "me", targetId: "me" }),
    ).toBe("self");
  });

  it("reports 'not-admin' ahead of 'self'", () => {
    // Order matters: an unauthorised caller must not learn anything about the
    // target, not even that it is itself.
    expect(
      checkAdminActor({ actorRole: "user", actorId: "me", targetId: "me" }),
    ).toBe("not-admin");
  });
});

describe("actorOutranksTarget", () => {
  it("ranks the hierarchy user < admin < owner", () => {
    expect(ROLE_RANK).toEqual({ user: 0, admin: 1, owner: 2 });
  });

  it("allows strictly lower targets only", () => {
    expect(actorOutranksTarget("admin", "user")).toBe(true);
    expect(actorOutranksTarget("owner", "admin")).toBe(true);
    expect(actorOutranksTarget("owner", "user")).toBe(true);
  });

  it("refuses equal and higher targets", () => {
    // The two rules the dashboard already enforced and the HTTP surface did not.
    expect(actorOutranksTarget("admin", "admin")).toBe(false);
    expect(actorOutranksTarget("admin", "owner")).toBe(false);
    expect(actorOutranksTarget("owner", "owner")).toBe(false);
  });

  it("ranks a plain customer below every actor", () => {
    expect(actorOutranksTarget("admin", "user")).toBe(true);
  });

  it("treats an unknown or missing role as the LOWEST rank", () => {
    // A hand-edited row must never out-rank the actor. Both spellings land
    // below `user`, so the failure mode is "cannot act", never "silently
    // grants authority".
    expect(actorOutranksTarget("admin", undefined)).toBe(true);
    expect(actorOutranksTarget("admin", "superuser")).toBe(true);
    expect(actorOutranksTarget("owner", "")).toBe(true);
  });

  it("never lets an unknown ACTOR out-rank anyone", () => {
    expect(actorOutranksTarget(undefined, "user")).toBe(false);
  });
});
