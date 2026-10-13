import { afterEach, describe, expect, it, vi } from "vitest";
import type { MetadataRoute } from "next";

/**
 * `app/robots.ts` derives its blocked state from `siteBlocked`, which reads
 * `process.env.SITE_BLOCKED` once at module load. To exercise both states the
 * flag is set and the module graph re-imported with a fresh registry.
 */
async function loadRobots(value: string | undefined) {
  vi.resetModules();
  const previous = process.env.SITE_BLOCKED;
  if (value === undefined) {
    delete process.env.SITE_BLOCKED;
  } else {
    process.env.SITE_BLOCKED = value;
  }
  try {
    const mod = await import("@/app/robots");
    return mod.default();
  } finally {
    if (previous === undefined) {
      delete process.env.SITE_BLOCKED;
    } else {
      process.env.SITE_BLOCKED = previous;
    }
  }
}

function asArray(rules: MetadataRoute.Robots["rules"]) {
  return Array.isArray(rules) ? rules : [rules];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("robots — site open (flag unset)", () => {
  it("allows crawling, disallows /api/, and advertises the sitemap", async () => {
    for (const value of [undefined, "", "false", "0", "no"]) {
      const robots = await loadRobots(value);

      const rules = asArray(robots.rules);
      expect(rules).toHaveLength(1);
      expect(rules[0].userAgent).toBe("*");
      expect(rules[0].allow).toBe("/");
      expect(rules[0].disallow).toEqual(["/api/"]);

      expect(robots.sitemap).toBeTruthy();
      expect(typeof robots.sitemap).toBe("string");
    }
  });
});

describe("robots — site blocked (SITE_BLOCKED=true)", () => {
  it("disallows the entire site for every crawler", async () => {
    for (const value of ["true", "TRUE", " True "]) {
      const robots = await loadRobots(value);

      const rules = asArray(robots.rules);
      expect(rules).toHaveLength(1);
      expect(rules[0].userAgent).toBe("*");
      expect(rules[0].allow).toBeUndefined();
      expect(rules[0].disallow).toBe("/");
    }
  });

  it("omits the Sitemap line — a blocked crawler must not be handed URLs", async () => {
    const robots = await loadRobots("true");
    expect(robots.sitemap).toBeUndefined();
  });
});
