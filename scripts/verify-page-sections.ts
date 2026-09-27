/**
 * Part C verification: every seeded About/S34 section row must resolve to
 * EXACTLY the dictionary-derived default content (both languages), proving the
 * migration didn't shift a single character of page copy.
 *
 * Run: npx tsx scripts/verify-page-sections.ts
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_ABOUT_PAGE_CONTENT,
  getAboutPageContent,
} from "@/lib/repositories/about-page";
import {
  DEFAULT_S34_PAGE_CONTENT,
  getS34PageContent,
} from "@/lib/repositories/s34-page";

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main(): Promise<void> {
  const [about, s34] = await Promise.all([
    getAboutPageContent(),
    getS34PageContent(),
  ]);

  const checks: [string, unknown, unknown][] = [
    ["about.hero", about.hero, DEFAULT_ABOUT_PAGE_CONTENT.hero],
    ["about.subtitle", about.subtitle, DEFAULT_ABOUT_PAGE_CONTENT.subtitle],
    ["about.brandStory", about.brandStory, DEFAULT_ABOUT_PAGE_CONTENT.brandStory],
    ["about.elegance", about.elegance, DEFAULT_ABOUT_PAGE_CONTENT.elegance],
    ["s34.hero", s34.hero, DEFAULT_S34_PAGE_CONTENT.hero],
    ["s34.concept", s34.concept, DEFAULT_S34_PAGE_CONTENT.concept],
    ["s34.gallery", s34.gallery, DEFAULT_S34_PAGE_CONTENT.gallery],
    ["s34.harmony", s34.harmony, DEFAULT_S34_PAGE_CONTENT.harmony],
  ];

  let failed = 0;
  for (const [name, actual, expected] of checks) {
    if (deepEqual(actual, expected)) {
      console.log(`OK   ${name}`);
    } else {
      failed++;
      console.error(`FAIL ${name}`);
      console.error("  actual:  ", JSON.stringify(actual));
      console.error("  expected:", JSON.stringify(expected));
    }
  }

  // Row/sortOrder sanity.
  const aboutRows = await prisma.aboutPageSection.findMany({
    orderBy: { sortOrder: "asc" },
    select: { sectionKey: true, sortOrder: true },
  });
  const s34Rows = await prisma.s34PageSection.findMany({
    orderBy: { sortOrder: "asc" },
    select: { sectionKey: true, sortOrder: true },
  });
  console.log("about rows:", JSON.stringify(aboutRows));
  console.log("s34 rows:  ", JSON.stringify(s34Rows));

  await prisma.$disconnect();
  if (failed > 0) {
    console.error(`\n${failed} section(s) diverged from the dictionary defaults.`);
    process.exit(1);
  }
  console.log("\nAll sections match the translation dictionary defaults.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});