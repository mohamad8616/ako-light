"use client";
import { motion } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

const HomepageSection = ({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & React.ComponentProps<typeof motion.section>) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: "20%" }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 2, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.section>
  );
};

export default HomepageSection;
