/**
 * Profile password-policy rules (Pass C.2).
 *
 * HERMETIC — pure functions, no server and no dictionary import.
 *
 * These rules are the SERVER-side policy: the action calls the same function the
 * form does, so a forged request cannot skip the confirmation field or the
 * length floor by posting straight to the action.
 *
 * Issues are `{ field, code }` pairs, never sentences — the dictionaries own the
 * copy, and a code can never contain a password value.
 */
import { describe, expect, it } from "vitest";

import {
  PROFILE_PASSWORD_MAX_LENGTH,
  PROFILE_PASSWORD_MIN_LENGTH,
  validateChangePassword,
} from "@/lib/admin/schemas/profile";

const OLD = "old-passphrase-11";
const OK = "tarnished-lantern-92-koi";

/** The codes reported for one field. */
const codesFor = (
  input: Parameters<typeof validateChangePassword>[0],
  field: string,
) =>
  validateChangePassword(input)
    .filter((issue) => issue.field === field)
    .map((issue) => issue.code);

describe("validateChangePassword", () => {
  it("accepts a well-formed change", () => {
    expect(
      validateChangePassword({
        currentPassword: OLD,
        newPassword: OK,
        confirmPassword: OK,
      }),
    ).toEqual([]);
  });

  it("requires the current password", () => {
    expect(
      codesFor(
        { currentPassword: "", newPassword: OK, confirmPassword: OK },
        "currentPassword",
      ),
    ).toEqual(["required"]);
  });

  it("requires a new password", () => {
    expect(
      codesFor(
        { currentPassword: OLD, newPassword: "", confirmPassword: "" },
        "newPassword",
      ),
    ).toContain("required");
  });

  it("enforces the 12-character floor", () => {
    const short = "a".repeat(PROFILE_PASSWORD_MIN_LENGTH - 1);
    expect(
      codesFor(
        { currentPassword: OLD, newPassword: short, confirmPassword: short },
        "newPassword",
      ),
    ).toContain("tooShort");
  });

  it("accepts exactly the minimum", () => {
    const exact = "a".repeat(PROFILE_PASSWORD_MIN_LENGTH);
    expect(
      validateChangePassword({
        currentPassword: OLD,
        newPassword: exact,
        confirmPassword: exact,
      }),
    ).toEqual([]);
  });

  it("rejects an over-long value", () => {
    const long = "a".repeat(PROFILE_PASSWORD_MAX_LENGTH + 1);
    expect(
      codesFor(
        { currentPassword: OLD, newPassword: long, confirmPassword: long },
        "newPassword",
      ),
    ).toContain("tooLong");
  });

  it("rejects a MISMATCHED confirmation", () => {
    expect(
      codesFor(
        {
          currentPassword: OLD,
          newPassword: OK,
          confirmPassword: `${OK}-x`,
        },
        "confirmPassword",
      ),
    ).toEqual(["passwordMismatch"]);
  });

  it("requires the confirmation field at all", () => {
    // The form always sends it; a forged request might not. The server must not
    // treat an absent confirmation as agreement.
    expect(
      codesFor(
        { currentPassword: OLD, newPassword: OK, confirmPassword: undefined },
        "confirmPassword",
      ),
    ).toEqual(["required"]);
  });

  it("rejects reusing the current password as the new one", () => {
    expect(
      codesFor(
        { currentPassword: OK, newPassword: OK, confirmPassword: OK },
        "newPassword",
      ),
    ).toContain("sameAsCurrent");
  });

  it("never echoes a password value in an issue", () => {
    const secret = "s3kr3t-value";
    const issues = validateChangePassword({
      currentPassword: secret,
      newPassword: secret,
      confirmPassword: "different",
    });

    expect(issues.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(issues);
    expect(serialized).not.toContain(secret);
    // Every issue names a field and a code, nothing else.
    for (const issue of issues) {
      expect(Object.keys(issue).sort()).toEqual(["code", "field"]);
    }
  });
});
