"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { pick } from "@/lib/i18n/localized";
import HomepageSection from "@/utility/HomepageSection";
import { projects } from "../../lib/data/projects";
import Row from "../ui/Row";

const ROWS_ON_LOAD = 2;

export default function ProjectssList() {
  const { lang } = useLanguage();

  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full pb-20 md:pb-28"
    >
      {projects.map((project, i) => (
        <Row
          route={"projects"}
          key={project.id}
          index={i}
          animateOnLoad={i < ROWS_ON_LOAD}
          slug={project.id}
          name={pick(project.name, lang)}
          description={pick(project.description, lang)}
          image={project.image}
          width={"40"}
        />
      ))}
    </HomepageSection>
  );
}
