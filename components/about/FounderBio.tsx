"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

interface FounderBioProps {
  name: string;
  image: string;
  /** Exactly two pre-merged text blocks, rendered side by side. */
  columns: [string, string];
  theme?: "light" | "dark";
  /** Image on the left instead of the right. */
  reverse?: boolean;
  /** Let the portrait bleed downward into whatever section follows,
      matching the recurring overlap treatment used elsewhere on the site. */
  bleed?: boolean;
}

export default function FounderBio({
  name,
  image,
  columns,
  theme = "light",
  reverse = false,
  bleed = false,
}: FounderBioProps) {
  const isDark = theme === "dark";

  return (
    <section
      className={`relative w-full pt-20 md:pt-28 ${
        isDark ? "bg-background" : "bg-[#f0efec]"
      } ${bleed ? "pb-0" : "pb-20 md:pb-28"}`}
    >
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Text side */}
          <div
            className={`order-2 lg:col-span-7 ${
              reverse ? "lg:order-2" : "lg:order-1"
            }`}
          >
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: EASE }}
                className={`text-4xl font-bold uppercase leading-[0.95] tracking-tight md:text-6xl ${
                  isDark ? "text-white" : "text-[#171719]"
                }`}
              >
                {name}
              </motion.h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10">
              {columns.map((text, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.15, ease: EASE }}
                  className={`text-[15px] font-light leading-relaxed md:text-base ${
                    isDark ? "text-background-secondary" : "text-[#171719]/65"
                  }`}
                >
                  {text}
                </motion.p>
              ))}
            </div>
          </div>

          {/* Portrait side */}
          <div
            className={`relative order-1 lg:col-span-5 ${
              reverse ? "lg:order-1" : "lg:order-2"
            }`}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: EASE }}
              className={`relative w-full overflow-hidden ${
                bleed ? "z-10 aspect-[3/4] -mb-16 md:-mb-24 lg:-mb-32" : "aspect-[3/4]"
              }`}
            >
              <img src={image} alt={name} className="h-full w-full object-cover grayscale" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
