/**
 * Part D verification: the admin write path must be visible to the public page
 * read, and nothing else.
 *
 * Exercises exactly what the forms do — read the section through the public
 * repository, write it back through the repository write the server action
 * calls, re-read, then RESTORE the original content in a `finally` block. The
 * script therefore leaves the configured dev database unchanged.
 *
 * Run: npx tsx scripts/verify-page-section-write.ts
 */
import "dotenv/config";

import {
  getAboutPageContent,
  updateAboutPageSection,
} from "@/lib/repositories/about-page";
import {
  getS34PageContent,
  updateS34PageSection,
} from "@/lib/repositories/s34-page";
import { prisma } from "@/lib/db/prisma";

const MARKER = " [admin-write-check]";

async function main(): Promise<void> {
  const originalAbout = (await getAboutPageContent()).hero;
  const originalS34 = (await getS34PageContent()).concept;

  try {
    // 1. Write through the same function the server action calls.
    await updateAboutPageSection("heroSection", {
      firstLine: { ...originalAbout.firstLine, en: originalAbout.firstLine.en + MARKER },
      secondLine: originalAbout.secondLine,
    });
    await updateS34PageSection("conceptSection", {
      kicker: { ...originalS34.kicker, fa: originalS34.kicker.fa + MARKER },
      paragraphs: originalS34.paragraphs,
    });

    // 2. The public read — what app/[locale]/(site)/about|s34 render — must
    //    now show the edit.
    const afterAbout = (await getAboutPageContent()).hero;
    const afterS34 = (await getS34PageContent()).concept;
    console.log("about.hero.firstLine.en:", afterAbout.firstLine.en);
    console.log("s34.concept.kicker.fa:", afterS34.kicker.fa);

    if (!afterAbout.firstLine.en.endsWith(MARKER)) {
      throw new Error("about hero write is NOT visible to the public read");
    }
    if (!afterS34.kicker.fa.endsWith(MARKER)) {
      throw new Error("s34 concept write is NOT visible to the public read");
    }
    console.log("PASS: both admin writes reach the public page read.");
  } finally {
    // 3. Restore, whatever happened above.
    await updateAboutPageSection("heroSection", originalAbout);
    await updateS34PageSection("conceptSection", originalS34);

    const restoredAbout = (await getAboutPageContent()).hero;
    const restoredS34 = (await getS34PageContent()).concept;
    const restored =
      restoredAbout.firstLine.en === originalAbout.firstLine.en &&
      restoredS34.kicker.fa === originalS34.kicker.fa;
    console.log(restored ? "PASS: content restored." : "FAIL: restore mismatch.");
    if (!restored) process.exitCode = 1;

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});