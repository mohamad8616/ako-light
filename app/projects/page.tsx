"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import PageHeader from "@/components/ui/PageHeader";
import { projects } from "@/lib/data/projects";

export default function ProjectsPage() {
  const { t } = useLanguage();

  return (
    <main className="w-full bg-background">
      <PageHeader
        title={t("projects.title")}
        subtitle={t("projects.subtitle")}
      />

      <section className="mx-auto max-w-[1600px] px-6 pb-24 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <img
                  src={project.image}
                  alt={project.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/20" />
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-lg font-light uppercase tracking-[0.1em] text-white">
                  {project.name}
                </h3>
                <p className="text-sm font-light text-white/50">
                  {project.location} — {project.year}
                </p>
                <p className="text-sm font-light leading-relaxed text-white/40">
                  {project.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}