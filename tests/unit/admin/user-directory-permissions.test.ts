/**
 * The user-directory capability model — the security core of the shared
 * `/admin/users` screen.
 *
 * These are hermetic tests of the PURE predicates. They are the executable
 * specification of the role hierarchy and, most importantly, of the invariant
 * the pass exists to guarantee:
 *
 *   AN ADMIN HAS NO PROMOTION AUTHORITY, UNDER ANY CIRCUMSTANCE.
 *
 * Every path an admin could take is enumerated and asserted false, so a future
 * refactor that quietly widened admin powers would fail here first.
 *
 * Part of the `unit` Vitest project.
 */
import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  canAssignRole,
  canModerate,
  canModerateAccount,
  canPerformDirectoryAction,
  canViewDirectory,
  directoryScope,
  isAdminLevel,
  outranks,
  type DirectoryAction,
} from "@/lib/admin/user-directory-permissions";
import type { AppRole } from "@/lib/auth/permissions";

const ROLES_ALL: AppRole[] = ["user", "admin", "owner"];

describe("role hierarchy", () => {
  it("ranks user < admin < owner strictly", () => {
    expect(outranks("owner", "admin")).toBe(true);
    expect(outranks("owner", "user")).toBe(true);
    expect(outranks("admin", "user")).toBe(true);

    expect(outranks("admin", "owner")).toBe(false);
    expect(outranks("user", "admin")).toBe(false);
    expect(outranks("owner", "owner")).toBe(false);
    expect(outranks("admin", "admin")).toBe(false);
    expect(outranks("user", "user")).toBe(false);
  });

  it("treats only admin and owner as admin-level", () => {
    expect(isAdminLevel("admin")).toBe(true);
    expect(isAdminLevel("owner")).toBe(true);
    expect(isAdminLevel("user")).toBe(false);
    expect(isAdminLevel(undefined)).toBe(false);
  });
});

describe("canViewDirectory", () => {
  it("admits admin and owner, refuses customer and anonymous", () => {
    expect(canViewDirectory("owner")).toBe(true);
    expect(canViewDirectory("admin")).toBe(true);
    expect(canViewDirectory("user")).toBe(false);
    expect(canViewDirectory(undefined)).toBe(false);
  });
});

describe("canModerate (ban / unban)", () => {
  it("lets an admin moderate only a customer", () => {
    expect(canModerate("admin", "user")).toBe(true);
    expect(canModerate("admin", "admin")).toBe(false);
    expect(canModerate("admin", "owner")).toBe(false);
  });

  it("lets an owner moderate a customer and an admin, but never another owner", () => {
    expect(canModerate("owner", "user")).toBe(true);
    expect(canModerate("owner", "admin")).toBe(true);
    expect(canModerate("owner", "owner")).toBe(false);
  });

  it("refuses a customer and an anonymous caller entirely", () => {
    for (const target of ROLES_ALL) {
      expect(canModerate("user", target)).toBe(false);
      expect(canModerate(undefined, target)).toBe(false);
    }
  });
});

describe("canModerateAccount (self-protection)", () => {
  it("refuses when the actor targets their own account", () => {
    expect(
      canModerateAccount({
        actorRole: "owner",
        actorId: "same",
        targetRole: "user",
        targetId: "same",
      }),
    ).toBe(false);
  });

  it("allows moderating a different, lower-ranked account", () => {
    expect(
      canModerateAccount({
        actorRole: "admin",
        actorId: "me",
        targetRole: "user",
        targetId: "them",
      }),
    ).toBe(true);
  });
});

describe("assignableRoles — the authority table", () => {
  it("gives an admin NO role options against any target, ever", () => {
    for (const target of ROLES_ALL) {
      expect(assignableRoles("admin", target)).toEqual([]);
    }
  });

  it("gives a customer and an anonymous caller no options", () => {
    for (const target of ROLES_ALL) {
      expect(assignableRoles("user", target)).toEqual([]);
      expect(assignableRoles(undefined, target)).toEqual([]);
    }
  });

  it("lets an owner promote a customer straight to admin OR straight to owner", () => {
    // Promotion is NOT forced to be one level at a time: both are offered.
    expect(assignableRoles("owner", "user")).toEqual(["admin", "owner"]);
  });

  it("lets an owner promote an admin to owner, and nothing else", () => {
    // No demotion path exists in the customer directory — that is the job of
    // the owner-only `/admin/admins` screen.
    expect(assignableRoles("owner", "admin")).toEqual(["owner"]);
  });

  it("leaves an owner target immutable through this screen", () => {
    expect(assignableRoles("owner", "owner")).toEqual([]);
  });
});

describe("canAssignRole — an admin can never assign a role", () => {
  it("returns false for an admin across EVERY target/next combination", () => {
    for (const target of ROLES_ALL) {
      for (const next of ROLES_ALL) {
        expect(
          canAssignRole({
            actorRole: "admin",
            actorId: "admin-1",
            targetRole: target,
            targetId: "someone-else",
            next,
          }),
          `admin must not assign ${next} to a ${target}`,
        ).toBe(false);
      }
    }
  });

  it("returns false for a customer and an anonymous caller", () => {
    for (const target of ROLES_ALL) {
      for (const next of ROLES_ALL) {
        expect(
          canAssignRole({
            actorRole: "user",
            actorId: "u",
            targetRole: target,
            targetId: "x",
            next,
          }),
        ).toBe(false);
        expect(
          canAssignRole({
            actorRole: undefined,
            actorId: "u",
            targetRole: target,
            targetId: "x",
            next,
          }),
        ).toBe(false);
      }
    }
  });

  it("allows an owner to promote a customer to admin", () => {
    expect(
      canAssignRole({
        actorRole: "owner",
        actorId: "owner-1",
        targetRole: "user",
        targetId: "cust-1",
        next: "admin",
      }),
    ).toBe(true);
  });

  it("allows an owner to promote an admin to owner", () => {
    expect(
      canAssignRole({
        actorRole: "owner",
        actorId: "owner-1",
        targetRole: "admin",
        targetId: "staff-1",
        next: "owner",
      }),
    ).toBe(true);
  });

  it("allows an owner to promote a customer straight to owner", () => {
    // The headline requirement of Pass 6.1: a customer becomes an owner in ONE
    // step, with no intermediate admin promotion.
    expect(
      canAssignRole({
        actorRole: "owner",
        actorId: "owner-1",
        targetRole: "user",
        targetId: "cust-1",
        next: "owner",
      }),
    ).toBe(true);
  });

  it("refuses an owner DEMOTING an admin to user through this screen", () => {
    // The customer directory has no demotion path; `/admin/admins` owns that.
    expect(
      canAssignRole({
        actorRole: "owner",
        actorId: "owner-1",
        targetRole: "admin",
        targetId: "staff-1",
        next: "user",
      }),
    ).toBe(false);
  });

  it("refuses an owner granting an admin -> admin no-op", () => {
    expect(
      canAssignRole({
        actorRole: "owner",
        actorId: "owner-1",
        targetRole: "admin",
        targetId: "staff-1",
        next: "admin",
      }),
    ).toBe(false);
  });

  it("refuses an owner acting on another owner", () => {
    expect(
      canAssignRole({
        actorRole: "owner",
        actorId: "owner-1",
        targetRole: "owner",
        targetId: "owner-2",
        next: "admin",
      }),
    ).toBe(false);
  });

  it("refuses an owner modifying another owner for EVERY next role", () => {
    // "An owner must NEVER modify another owner" — hold for every value.
    for (const next of ROLES_ALL) {
      expect(
        canAssignRole({
          actorRole: "owner",
          actorId: "owner-1",
          targetRole: "owner",
          targetId: "owner-2",
          next,
        }),
        `owner -> owner must not assign ${next}`,
      ).toBe(false);
    }
  });

  it("refuses an arbitrary invalid role value for any actor", () => {
    for (const actorRole of ROLES_ALL) {
      for (const target of ROLES_ALL) {
        expect(
          canAssignRole({
            actorRole,
            actorId: "actor-1",
            targetRole: target,
            targetId: "target-1",
            next: "superuser" as AppRole,
          }),
          `${actorRole} must not assign an unknown role to a ${target}`,
        ).toBe(false);
      }
    }
  });

  it("refuses an owner changing their OWN role", () => {
    expect(
      canAssignRole({
        actorRole: "owner",
        actorId: "same",
        targetRole: "admin",
        targetId: "same",
        next: "owner",
      }),
    ).toBe(false);
  });
});

describe("directoryScope", () => {
  it("labels an owner as owner and everyone else as admin", () => {
    expect(directoryScope("owner")).toBe("owner");
    expect(directoryScope("admin")).toBe("admin");
    expect(directoryScope("user")).toBe("admin");
    expect(directoryScope(undefined)).toBe("admin");
  });
});

describe("canPerformDirectoryAction — coarse entry point", () => {
  const actions: DirectoryAction[] = ["ban", "unban", "assign-role"];

  it("grants an admin ONLY the moderation actions", () => {
    for (const action of actions) {
      const allowed = canPerformDirectoryAction({
        action,
        actorRole: "admin",
        actorId: "admin-1",
        targetRole: "user",
        targetId: "cust-1",
      });
      expect(allowed, `admin / ${action}`).toBe(action !== "assign-role");
    }
  });

  it("never lets an admin change a role, against any target", () => {
    for (const target of ROLES_ALL) {
      expect(
        canPerformDirectoryAction({
          action: "assign-role",
          actorRole: "admin",
          actorId: "admin-1",
          targetRole: target,
          targetId: "cust-1",
        }),
      ).toBe(false);
    }
  });

  it("lets an owner change roles (on a non-self target)", () => {
    expect(
      canPerformDirectoryAction({
        action: "assign-role",
        actorRole: "owner",
        actorId: "owner-1",
        targetRole: "user",
        targetId: "cust-1",
      }),
    ).toBe(true);
  });
});
