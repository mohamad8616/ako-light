"use client";

import ProjectssList from "@/components/projects/ProjectList";
import ProjectsHeader from "@/components/projects/ProjectsHeader";
import { projects } from "@/lib/data/projects";

export default function MaterialsPage() {
  console.log(projects);
  return (
    <main className="bg-background w-full">
      <ProjectsHeader />
      <ProjectssList />
      
    </main>
  );
}
