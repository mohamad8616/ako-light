import { EASE } from "@/components/ui/HomepageSection";
import { motion } from "framer-motion";
export function Paragraph({
  children,
  className,
  textColor,
}: {
  children: React.ReactNode;
  className?: string;
  textColor?: string;
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
      className={`font-din text-[15px] font-light leading-relaxed  md:text-base ${className} ${textColor ? { textColor } : "text-background/70"}`}
    >
      {children}
    </motion.p>
  );
}
