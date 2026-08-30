"use client";
import { motion } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

const HomepageSection = ({
  children,
  className,
  animateOnLoad = false,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  animateOnLoad?: boolean;
} & React.ComponentProps<typeof motion.section>) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: "20%" }}
      {...(animateOnLoad
        ? { animate: { opacity: 1, y: 0 } }
        : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true } })}
      transition={{ duration: 2, ease: EASE }}
      className={`${className} mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]`}
      {...rest}
    >
      {children}
    </motion.section>
  );
};

export default HomepageSection;
