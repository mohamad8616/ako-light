"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  links: string[];
  delay: number;
}

export default function MenuColumn({ title, links, delay }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay,
      }}
    >
      <h2
        className="
  mb-5

  text-[28px]
  md:text-[56px]

  font-light
  uppercase

  text-zinc-700

  tracking-tight
  "
      >
        {title}
      </h2>

      <ul className="space-y-4 md:space-y-6">
        {" "}
        {links.map((item) => (
          <li key={item}>
            <a
              href="#"
              className="
              menu-link 
  text-sm
  md:text-lg

  font-medium

  tracking-[0.12em]

  text-white

  transition-colors
  duration-300

  hover:text-neutral-400
  "
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
