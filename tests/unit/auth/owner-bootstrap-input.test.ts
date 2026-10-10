/**
 * Owner-bootstrap input rules (Pass B) — HERMETIC.
 *
 * These decide whether the script may touch the database at all, so they are
 * tested without a connection. The database half is covered by
 * tests/integration/auth/owner-bootstrap.test.ts.
 *
 * The load-bearing property here is that there are NO DEFAULTS. The previous
 * version of the script fell back to a fixed email and password committed to
 * this repository, so `pnpm create:owner` with no arguments minted a
 * full-privilege owner whose password anyone with repository access already
 * knew.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  OWNER_PASSWORD_MAX_LENGTH,
  OWNER_PASSWORD_MIN_LENGTH,
  parseOwnerBootstrapInput,
  validateOwnerBootstrapInput,
} from "@/lib/auth/owner-bootstrap-input";

const STRONG = "tarnished-lantern-92-koi";

/** A problem list containing `needle`, case-insensitively. */
function mentions(problems: string[], needle: string): boolean {
  return problems.some((p) => p.toLowerCase().includes(needle.toLowerCase()));
}

describe("validateOwnerBootstrapInput — missing values", () => {
  it("rejects a missing email", () => {
    const problems = validateOwnerBootstrapInput({
      email: undefined,
      password: STRONG,
      name: undefined,
    });

    expect(problems).toHaveLength(1);
    expect(mentions(problems, "OWNER_EMAIL is required")).toBe(true);
  });

  it("rejects a blank or whitespace-only email", () => {
    for (const email of ["", "   "]) {
      expect(
        validateOwnerBootstrapInput({ email, password: STRONG, name: undefined }),
      ).toHaveLength(1);
    }
  });

  it("rejects a missing password", () => {
    const problems = validateOwnerBootstrapInput({
      email: "owner@example.com",
      password: undefined,
      name: undefined,
    });

    expect(problems).toHaveLength(1);
    expect(mentions(problems, "OWNER_PASSWORD is required")).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(
      validateOwnerBootstrapInput({
        email: "owner@example.com",
        password: "",
        name: undefined,
      }),
    ).toHaveLength(1);
  });

  it("has NO defaults — an empty input is refused, not filled in", () => {
    // The regression this whole pass exists for.
    const problems = validateOwnerBootstrapInput({
      email: undefined,
      password: undefined,
      name: undefined,
    });

    expect(problems.length).toBeGreaterThanOrEqual(2);
    // Messages name the VARIABLE, never a value.
    expect(problems.join(" ")).toMatch(/OWNER_EMAIL|OWNER_PASSWORD/);
  });
});

describe("validateOwnerBootstrapInput — malformed values", () => {
  it("rejects an email that is not an address", () => {
    for (const email of [
      "owner",
      "owner@",
      "@example.com",
      "owner@example",
      "owner example@test.com",
      "owner@example.com extra",
    ]) {
      const problems = validateOwnerBootstrapInput({
        email,
        password: STRONG,
        name: undefined,
      });
      expect(problems, email).toHaveLength(1);
      expect(mentions(problems, "not a valid email")).toBe(true);
    }
  });

  it("accepts a normal address, including subdomains and plus tags", () => {
    for (const email of [
      "owner@example.com",
      "owner+tag@mail.example.co.uk",
      "o.wner@sub.example.com",
    ]) {
      expect(
        validateOwnerBootstrapInput({ email, password: STRONG, name: undefined }),
        email,
      ).toEqual([]);
    }
  });
});

describe("validateOwnerBootstrapInput — weak passwords", () => {
  it("rejects anything shorter than the minimum", () => {
    const short = "a".repeat(OWNER_PASSWORD_MIN_LENGTH - 1);
    const problems = validateOwnerBootstrapInput({
      email: "owner@example.com",
      password: short,
      name: undefined,
    });

    expect(problems).toHaveLength(1);
    expect(mentions(problems, `at least ${OWNER_PASSWORD_MIN_LENGTH}`)).toBe(true);
  });

  it("accepts exactly the minimum", () => {
    const exact = "a".repeat(OWNER_PASSWORD_MIN_LENGTH);
    expect(
      validateOwnerBootstrapInput({
        email: "owner@example.com",
        password: exact,
        name: undefined,
      }),
    ).toEqual([]);
  });

  it("rejects an over-long value rather than hashing a pasted blob", () => {
    const problems = validateOwnerBootstrapInput({
      email: "owner@example.com",
      password: "a".repeat(OWNER_PASSWORD_MAX_LENGTH + 1),
      name: undefined,
    });

    expect(problems).toHaveLength(1);
    expect(mentions(problems, "at most")).toBe(true);
  });

  it("rejects the LEGACY hardcoded default", () => {
    // Assembled at runtime on purpose: the retired credential must not appear as
    // a literal anywhere in the repository, and this file is scanned for it by
    // the suite at the bottom of this file.
    const legacy = ["Owner", "123"].join("");

    const problems = validateOwnerBootstrapInput({
      email: "owner@example.com",
      password: legacy,
      name: undefined,
    });

    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(" ")).not.toContain(legacy);
  });

  it("rejects known placeholders", () => {
    for (const password of [
      "changeme",
      "letmein",
      "admin123",
      "qwertyuiop",
      "password123",
    ]) {
      expect(
        validateOwnerBootstrapInput({
          email: "owner@example.com",
          password,
          name: undefined,
        }).length,
        password,
      ).toBeGreaterThan(0);
    }
  });

  it("rejects a denylisted value that is otherwise LONG ENOUGH", () => {
    // 25 characters, so the length rule cannot reject it — only the denylist
    // can. This is what pins the denylist as more than a restatement of the
    // minimum length.
    const problems = validateOwnerBootstrapInput({
      email: "owner@example.com",
      password: "correcthorsebatterystaple",
      name: undefined,
    });

    expect(problems).toHaveLength(1);
    expect(mentions(problems, "well-known")).toBe(true);
  });

  it("rejects a password containing the email's local part", () => {
    const problems = validateOwnerBootstrapInput({
      email: "malek@example.com",
      password: "malek-is-my-password",
      name: undefined,
    });

    expect(problems).toHaveLength(1);
    expect(mentions(problems, "local part")).toBe(true);
  });

  it("does not leak the supplied password in any problem message", () => {
    const secret = "s3kr3t";
    const problems = validateOwnerBootstrapInput({
      email: "owner@example.com",
      // Under the minimum, so it is definitely rejected.
      password: secret,
      name: undefined,
    });

    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(" ")).not.toContain(secret);
  });
});

describe("parseOwnerBootstrapInput", () => {
  it("normalises the email to lowercase and derives a display name", () => {
    const parsed = parseOwnerBootstrapInput({
      email: "  Owner.Name@Example.COM  ",
      password: STRONG,
      name: undefined,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.email).toBe("owner.name@example.com");
    expect(parsed.value.name).toBe("Owner Name");
  });

  it("prefers an explicit display name", () => {
    const parsed = parseOwnerBootstrapInput({
      email: "owner@example.com",
      password: STRONG,
      name: "  Malek  ",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.name).toBe("Malek");
  });

  it("does NOT trim the password — spaces can be intentional", () => {
    const password = "  padded passphrase  ";
    const parsed = parseOwnerBootstrapInput({
      email: "owner@example.com",
      password,
      name: undefined,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.password).toBe(password);
  });

  it("returns the problems and no value when the input is unusable", () => {
    const parsed = parseOwnerBootstrapInput({
      email: undefined,
      password: undefined,
      name: undefined,
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.problems.length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Requirement 11 — no default credentials remain in the script, tests, docs or
 * package scripts.
 *
 * The retired values are assembled at runtime so THIS file does not contain
 * them, since the scan below covers this file too.
 */
describe("no retired default credentials remain", () => {
  const RETIRED = [["owner", "@gmail.com"].join(""), ["Owner", "123"].join("")];

  /** Every file that participates in bootstrap or documents it. */
  const FILES = [
    "scripts/create-owner.ts",
    "scripts/reset-owner-password.ts",
    "lib/auth/owner-bootstrap.ts",
    "lib/auth/owner-bootstrap-input.ts",
    "lib/auth/owner-password-reset.ts",
    "docs/pass-B-owner-bootstrap.md",
    ".env.example",
    "package.json",
    "tests/unit/auth/owner-bootstrap-input.test.ts",
    "tests/integration/auth/owner-bootstrap.test.ts",
  ];

  const read = (relative: string) =>
    readFileSync(new URL(`../../../${relative}`, import.meta.url), "utf8");

  it("mentions neither retired credential in any bootstrap file", () => {
    for (const file of FILES) {
      const text = read(file).toLowerCase();
      for (const needle of RETIRED) {
        expect(
          text.includes(needle.toLowerCase()),
          `${file} must not contain a retired default credential`,
        ).toBe(false);
      }
    }
  });

  it("has no package script that supplies a credential", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    const ownerScripts = Object.entries(pkg.scripts ?? {}).filter(([name]) =>
      /owner/i.test(name),
    );

    expect(
      ownerScripts.length,
      "expected the owner bootstrap scripts to be registered",
    ).toBeGreaterThan(0);

    for (const [name, command] of ownerScripts) {
      expect(
        command.toLowerCase(),
        `${name} must not embed a credential`,
      ).not.toMatch(/password=|@gmail\.com/);
    }
  });
});
