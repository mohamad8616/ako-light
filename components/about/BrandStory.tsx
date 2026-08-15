"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] font-light leading-relaxed text-[#171719]/65 md:text-base">
      {children}
    </p>
  );
}

export default function BrandStory() {
  return (
    <section className="w-full bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] border-t border-background/10 px-6 pt-10 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Title */}
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: "100%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="max-w-xl text-4xl font-bold uppercase leading-[0.95] tracking-tight text-[#171719] md:text-6xl"
          >
            From material search to a design trademark success
          </motion.h2>
        </div>

        {/* Three-column paragraph grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }}
            className="space-y-5"
          >
            <P>
              HENGE is the successful story of a young company that turned the
              search for materials into its trademark in the world of design.
              The project came to life following the founder Paolo
              Tormena&rsquo;s desire to explore topics linked to his passions
              for materials and rare making, precious finish, extraordinary
              dimensions and combinations. The project emerged in just a few
              years, like a leading player in the universe of international
              design.
            </P>
            <P>
              Together with the support of creatives as Massimo Castagna &mdash;
              architect and artistic director of the brand &mdash; Tormena and
              architect Isabella Genovese &mdash; Paolo&rsquo;s travel companion
              in work and in life &mdash; were able to shape a vision that
              addresses peculiar aesthetic needs, to the point of creating a
              unique and unmistakable style for the brand.
            </P>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="space-y-5"
          >
            <P>
              Over the years, the brand has strengthened its cooperation with
              the well-known international design firm Yabu Pushelberg, and
              carried out projects in partnership with Dutch artist Maarten
              Baas, exhibiting in the most fascinating showrooms and flagship
              stores in capital cities all over the world and in important
              international residences as Hillside in Los Angeles, Casa Clara
              and Palazzo Del Sol in Miami.
            </P>
            <P>
              The desire to experiment and create new elements has led HENGE to
              work with Ugo Cacciatori, jewellery and contemporary lifestyle
              designer. This has given life to a series of unmistakable products
              which embrace the brand&rsquo;s DNA.
            </P>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          >
            <P>
              With the debut of the new 2025 Collection, Henge introduces two
              exceptional new collaborations, joining its longstanding creative
              partners: one with Turkish designer Tanju &Ouml;zelgin, known for
              his refined minimalism and strong architectural influence, and the
              other with American designer Johanna Grawunder, celebrated for her
              experimental use of light and colour in architectural spaces.
              These creative encounters create unique pieces that blend timeless
              elegance with contemporary innovation.
            </P>
          </motion.div>
        </div>

        {/* Full-width image with corner badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE }}
          className="group relative mt-16 aspect-[16/9] w-full overflow-hidden md:mt-20"
        >
          <img
            src="https://www.henge07.com/app/uploads/2025/07/Henge_0730.jpg"
            alt="Henge interior"
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
          />
          <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#171719] text-white">
            <span className="text-[10px] font-light">H</span>
          </div>
        </motion.div>

        {/* Single left-aligned paragraph under the image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-10 max-w-md md:mt-12"
        >
          <P>
            Our quest for what will keep us company in our homes is based on
            trying to strike a difficult balance between what the mind sees as a
            mere function, and what the heart shows us as beauty and passion.
            Such choices have to be in line with our personal feelings and keep
            us happy day after day.
          </P>
        </motion.div>

        {/* Text-left / image-right pairing */}
        <div className="mt-16 grid grid-cols-1 items-center gap-10 md:mt-20 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }}
            className="space-y-5"
          >
            <P>
              HENGE&rsquo;s design stands out thanks to a daring and linear
              marking that imposes itself as a paradigm of contemporary
              refinement and elegance. All creations are destined to become
              protagonists, showing a strong personality and going beyond the
              fugacity of trends and fashion.
            </P>
            <P>
              What we all decide to live with is much more than just a piece of
              furniture, it is a travel companion as once it is inside our
              homes, it accompanies us on our journey through life, creating a
              real and personal relationship with us, mirroring our concept of
              beauty. It ages with us, day after day taking on that look which
              only comes with time.
            </P>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE }}
            className="group relative aspect-[16/10] w-full overflow-hidden"
          >
            <img
              src="https://www.henge07.com/app/uploads/2025/07/Henge_0722-SG.jpg"
              alt="Henge lighting installation"
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
