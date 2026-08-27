"use client";

import ProjectssList from "@/components/projects/ProjectList";
import ProjectsHeader from "@/components/projects/ProjectsHeader";

export default function MaterialsPage() {

  return (
      <main className="w-full bg-background">
        <ProjectsHeader />
        <ProjectssList />
      </main>
  );
}