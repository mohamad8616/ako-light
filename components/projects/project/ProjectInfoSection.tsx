"use client";

import type { Project } from "@/lib/data/projects";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";
import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import Link from "@/lib/i18n/Link";

export default function ProjectInfoSection({ project }: { project: Project }) {
  const { t, lang } = useLanguage();

  const projectName = pick(project.name, lang);
  const projectDescription = pick(project.description, lang);
  const projectParagraph = pick(project.paragraph, lang);

  return (
    <HomepageSection className="bg-background-secondary flex lg:min-h-[150vh] min-h-screen flex-col py-20 md:py-28">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
        {/*
          `min-w-0` on both columns: a grid item defaults to `min-width: auto`,
          so it refuses to shrink below its widest unbreakable word — one long
          pasted token would widen the 2fr column, then the grid, then the page
          into a horizontal scrollbar. `Paragraph`'s own `break-words` only
          gets a chance to wrap once the box is allowed to shrink.
        */}
        {/* Left column */}
        <div className="min-w-0 space-y-6 lg:space-y-10">
          {/* Breadcrumb */}
          <nav className="font-din flex flex-wrap items-center gap-2 text-xs font-medium tracking-tighter text-stone-500 uppercase">
            <Link
              href="/projects"
              className={cn(
                "underline underline-offset-2 transition-colors hover:text-stone-950",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {t("projects.title")}
            </Link>
            <span>/</span>
            <span
              className={cn(
                "text-stone-700",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {projectName}
            </span>
          </nav>

          <Paragraph>{projectDescription}</Paragraph>
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-col gap-10">
          <div>
            <span
              className={cn(
                "text-xs font-medium tracking-tighter text-stone-500 uppercase",
                lang === "fa" ? "font-noora" : "font-din",
              )}
            >
              {t("footer.credits")}
            </span>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-stone-950">
              {project.credits.map((credit, idx) => (
                <p
                  key={idx}
                  // Same guard as `Paragraph`: a credit is operator-entered, so
                  // a long unbreakable token must wrap rather than widen the page.
                  className={cn(
                    "min-w-0 break-words",
                    lang === "fa" ? "font-noora" : "font-din",
                  )}
                >
                  {pick(credit, lang)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom atmospheric paragraph */}
      <div className="mt-auto w-full min-w-0 max-w-3/5 lg:max-w-2/5">
        <Paragraph>{projectParagraph}</Paragraph>
      </div>
    </HomepageSection>
  );
}
