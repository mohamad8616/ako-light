import { EASE } from "@/components/ui/HomepageSection";
import { motion } from "framer-motion";

const SectionTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.h2
      initial={{ y: "100%" }}
      whileInView={{ y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
      className={`mt-2 text-2xl uppercase leading-[0.95] text-background md:text-4xl tracking-wide ${className}`}
    >
      {children}
    </motion.h2>
  );
};

export default SectionTitle;
