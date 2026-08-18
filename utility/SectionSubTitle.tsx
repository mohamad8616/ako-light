import { motion } from "framer-motion";
import { EASE } from "../components/ui/HomepageSection";

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
      className={`block text-xs font-medium uppercase tracking-[0.25em] text-background/50 ${className}`}
    >
      {children}
    </motion.span>
  );
};

export default SectionSubTitle;
