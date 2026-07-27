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
        mb-10
        text-5xl
        font-light
        tracking-tight
        text-zinc-700
        uppercase
        "
      >
        {title}
      </h2>

      <ul className="space-y-6">
        {links.map((item) => (
          <li key={item}>
            <a
              href="#"
              className="
              text-white
              text-lg
              uppercase
              tracking-wider
              transition
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
