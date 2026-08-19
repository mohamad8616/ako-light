import { motion } from "framer-motion";
import { EASE } from "./HomepageSection";

const SectionSubTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.span
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: EASE }}
      className={`text-background/50 block text-xs font-medium tracking-[0.25em] uppercase ${className}`}
    >
      {children}
    </motion.span>
  );
};

export default SectionSubTitle;
