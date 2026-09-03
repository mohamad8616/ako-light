import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";

const SectionTitle = ({
  children,
  className,
  textColor,
}: {
  children: React.ReactNode;
  className?: string;
  textColor?: string;
}) => {
  const { lang } = useLanguage();
  return (
    <motion.h2
      initial={{ y: "100%" }}
      whileInView={{ y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
      className={`${lang === "fa" ? "font-noora" : ""} ${textColor ?? "text-background"} mt-2 text-2xl leading-[0.95] tracking-wide uppercase md:text-4xl ${className}`}
    >
      {children}
    </motion.h2>
  );
};

export default SectionTitle;
