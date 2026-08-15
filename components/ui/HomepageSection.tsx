"use client";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const HomepageSection = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: "20%" }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 2, ease: EASE }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

export default HomepageSection;
