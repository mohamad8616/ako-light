import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import React from "react";

const SectionImage = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: EASE }}
      className={`group relative aspect-16/10 w-full overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default SectionImage;
