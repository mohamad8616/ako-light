/* eslint-disable @next/next/no-img-element */
"use client";

import { homepageSections } from "@/lib/data/homepage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CatalogueSection() {
  const { catalogue } = homepageSections;
  const {t} = useLanguage();

  return (
    <section className="w-full bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Text column */}
          <div className="order-2 flex flex-col justify-center lg:order-1 lg:col-span-6">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
              className="block text-xs font-medium uppercase tracking-[0.25em] text-background/50"
            >
              HENGE CATALOGUE
            </motion.span>

            <div className="mt-3 overflow-hidden">
              <motion.h2
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                className="text-6xl font-bold uppercase leading-[0.95] tracking-tight text-background md:text-8xl"
              >
                S34/5
              </motion.h2>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
              className="mt-8 max-w-md text-[15px] font-light leading-relaxed text-background/60 md:text-base"
            >
              {t("catalogue.description")}
            </motion.p>
          </div>

          {/* Image column — small, portrait, matches the reference photo's proportions */}
          <div className="order-1 lg:order-2 lg:col-span-6 lg:flex lg:justify-end">
            <div className="w-full max-w-95">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE }}
                className="group relative aspect-2/3 w-full overflow-hidden"
              >
                <img
                  src={catalogue.image}
                  alt="S34/5"
                  className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />

                {/* Animated download circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110">
                    <div className="relative h-4 w-4 overflow-hidden">
                      <ArrowDown
                        size={16}
                        strokeWidth={1.5}
                        className="absolute inset-0 text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-full"
                      />
                      <ArrowDown
                        size={16}
                        strokeWidth={1.5}
                        className="absolute inset-0 -translate-y-full text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* CTA — flush with the image's left edge, same as the reference */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                className="mt-8"
              >
                <a
                  href="#"
                  className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-background transition-colors duration-300 hover:text-background/60"
                >
                  <span className="inline-block text-lg leading-none transition-transform duration-300 ease-in-out group-hover:rotate-90">
                    +
                  </span>
                  <span className="relative">
                    Download S34/5
                    <span className="absolute -bottom-1 left-0 h-px w-0 bg-background transition-[width] duration-300 group-hover:w-full" />
                  </span>
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
