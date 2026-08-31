"use client";

import PlusTextBtn from "@/components/ui/PlusTextBtn";
import { Paragraph } from "@/utility/Paragraph";
import { motion } from "framer-motion";
import { EASE } from "@/utility/HomepageSection";
import Image from "next/image";

interface DesignerBioProps {
  name: string;
  image: string;
  bio: string[];
  website?: string;
}

export default function DesignerBio({
  name,
  image,
  bio,
  website,
}: DesignerBioProps) {
  return (
    <section className="bg-background w-full pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Three independent grid items with a single shared order (1, 2, 3)
            that works for BOTH breakpoints at once: on mobile (grid-cols-1)
            they simply stack image → text → CTA in that order. On desktop
            (grid-cols-12), image spans 7 + text spans 5 exactly fill row 1,
            so the CTA (also spans 7, same order) automatically wraps to
            row 2 directly under the image — no responsive order overrides
            needed. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE }}
            className="order-1 aspect-4/5 w-full overflow-hidden lg:col-span-7"
          >
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover grayscale"
            />
          </motion.div>

          <div className="order-2 space-y-6 lg:col-span-5">
            {bio.map((paragraph, i) => (
              <Paragraph key={i} textColor="text-background-secondary">
                {paragraph}
              </Paragraph>
            ))}
          </div>

          {website && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="order-3 lg:col-span-7"
            >
              <PlusTextBtn
                href={website}
                text="view website"
                className="group inline-flex items-center gap-2 text-sm font-medium tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:text-white/70"
              />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
