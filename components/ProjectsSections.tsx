"use client";
import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import PlusTextBtn from "./ui/PlusTextBtn";
import { projectsSectionLinks } from "@/lib/data/projects";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
const links = projectsSectionLinks;
const ProjectsSections = () => {
  const { t } = useLanguage();
  return (
    <section >
      <div className="bg-background mx-auto flex min-h-screen items-center justify-center py-20">
        <div className="grid w-full grid-cols-1 items-center justify-between gap-10 px-6 sm:px-12 lg:grid-cols-3 md:mt-20 md:gap-8 lg:gap-18 lg:px-32">
          {links.map(({ label, i18nKey, href, image }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
            >
              <Link
                href={href}
                className="group relative mb-5 grid aspect-square w-full grid-cols-1 overflow-hidden lg:mb-0"
              >
                <Image
                  src={image}
                  alt={i18nKey ? t(i18nKey) : label}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/40" />
              </Link>
              <PlusTextBtn text={i18nKey ? t(i18nKey) : label} className="mt-10 lg:mt-5" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSections;
