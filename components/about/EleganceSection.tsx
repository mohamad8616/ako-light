/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import HomepageSection from "../ui/HomepageSection";

const EASE = [0.22, 1, 0.36, 1] as const;

const links = [
  {
    label: "Products",
    href: "/products",
    image: "https://www.henge07.com/app/uploads/2023/04/PRODUCTS-1.jpg",
  },
  {
    label: "Projects",
    href: "/projects",
    image: "https://www.henge07.com/app/uploads/2023/04/PROJECTS-1.jpg",
  },
  {
    label: "S34",
    href: "/collection/henge-catalogue-s34-3",
    image: "https://www.henge07.com/app/uploads/2023/04/Henge_Spiga_30_B-1.jpg",
  },
];

export default function EleganceSection() {
  return (
    <HomepageSection className="w-full bg-background py-20 md:py-28">
      <div className="mx-auto max-w-225 px-6 text-center md:px-12">
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-3xl font-bold uppercase leading-tight tracking-tight text-white md:text-5xl"
          >
            A Paradigm of Contemporary Elegance
          </motion.h2>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="mt-8 text-[15px] font-light leading-relaxed text-background-secondary md:text-base"
        >
          The brand searches for extraordinary materials from all over the
          world, looking for their expression, giving value to their natural
          characteristics and production criteria. HENGE believes the core of
          Made in Italy is found in the small craft shops which maintain the
          secrets of Italian excellence, adding the techniques impressed in the
          hands of the best Italian artisans to the vision of the great
          designers it works with.
        </motion.p>
      </div>

      <div className="mx-auto mt-16 grid max-w-[1600px] grid-cols-1 gap-5 px-6 sm:grid-cols-3 md:mt-20 md:gap-8 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {links.map(({ label, href, image }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
          >
            <Link
              href={href}
              className="group relative block aspect-3/4 w-full overflow-hidden"
            >
              <img
                src={image}
                alt={label}
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/40" />
              <span className="absolute bottom-5 left-5 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.15em] text-white">
                <span className="inline-block text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90">
                  +
                </span>
                {label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </HomepageSection>
  );
}
