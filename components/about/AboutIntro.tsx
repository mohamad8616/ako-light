/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import HomepageSection from "../ui/HomepageSection";

const EASE = [0.22, 1, 0.36, 1] as const;

const blocks = [
  {
    heading: "Whom would we love to share our home with?",
    paragraphs: [
      "This simple question has been our starting point for conceiving the first collection, giving us food for thought and allowing us to free ourselves from limitations imposed by market and style trends, reference points, and standard patterns.",
      "All that surrounds us in our home is much more than just a piece of furniture, it is our traveling companion, something that once entered our home, stays with us all our life, establishing with us an intimate and personal relationship that reflects our idea of beauty. It is a presence that ages slowly with us, taking on day after day that unique patina of time.",
      "It is precisely for this reason that people are at the center of our thoughts and our interest: for their ways of living, their desires, and the changes brought about by changing times and habits, factors that influence our needs and consequently what and how we should approach our projects.",
    ],
  },
  {
    heading:
      "Our approach to projects knows no limit as to materials, technology, and form",
    paragraphs: [
      "We have thought of objects that are very different from each other in terms of approach to design, type, and materials. Sometimes worlds apart from each other, they can live well together and enter with ease houses of different styles, adding character to the space and breaking the routine.",
      "The objects are free from the obsession to adhere to a certain style, deliberately denying mannerisms and formalisms. The collection is made up of heterogeneous and visionary pieces, leading characters of the domestic scene.",
      "A journey that started from looking at our native land with new eyes, the land which seems suspended in time and untouched by modernity, but which appears to a careful observer as authentic and having a rich heritage of excellent craftsmanship handed down from generation to generation, the highest expression of Italian know-how.",
      "We conceive and create products in which design and the expressive force of natural materials become an organic whole, a combination of space and nature.",
    ],
  },
  {
    heading:
      "Working with natural materials by hand, we know that each piece is unique and that every product will be different from the next",
    paragraphs: [
      "Nature speaks in many voices, from soft murmurs to disruptive noise. It is a tireless soul that changes with each encounter; revolutionizes its existence without losing itself, exuding its magnificent power even in the most delicate gestures.",
      "No industry can replicate what we create, because we remain bound to production principles where nature, weather, climate, and the seasons still play a vital role in the final result, and where the working process has ancient traditions in creating excellence.",
    ],
  },
];

export default function AboutIntro() {
  return (
    <HomepageSection className="w-full bg-background-secondary py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Kicker + small circular portrait */}
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:gap-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="h-24 w-24 shrink-0 overflow-hidden rounded-full md:h-32 md:w-32"
          >
            <img
              src="https://www.henge07.com/app/uploads/2025/12/891a36_3bec58c1cdf84a058a3fa654e802b031mv2-400x400.jpg"
              alt="Henge"
              className="h-full w-full object-cover"
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-2xl text-3xl font-light uppercase leading-tight tracking-tight text-background md:text-5xl"
          >
            Experience the beauty of timeless design
          </motion.h2>
        </div>

        {/* Three text blocks */}
        <div className="mt-16 grid grid-cols-1 gap-16 md:mt-24 md:gap-20 lg:grid-cols-2 lg:gap-24">
          {blocks.map((block, i) => (
            <motion.div
              key={block.heading}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: (i % 2) * 0.15, ease: EASE }}
              className={i === 2 ? "lg:col-span-2 lg:mx-auto lg:max-w-3xl" : ""}
            >
              <h3 className="text-xl font-bold uppercase leading-snug tracking-tight text-background md:text-2xl">
                {block.heading}
              </h3>
              <div className="mt-6 space-y-4">
                {block.paragraphs.map((p) => (
                  <p
                    key={p.slice(0, 24)}
                    className="text-[15px] font-light leading-relaxed text-background/65 md:text-base"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </HomepageSection>
  );
}
