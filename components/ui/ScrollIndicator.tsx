"use client";
import { motion } from "framer-motion";

const ScrollIndicator = () => {
  return (
    <div className="absolute bottom-0 left-8 z-10 h-10 w-px bg-white/15 md:h-12">
      <div className="relative h-full w-full overflow-hidden">
        <motion.div
          initial={{ bottom: "0%", height: "0%" }}
          animate={{
            bottom: ["100%", "0%", "0%"],
            height: ["0%", "100%", "0%"],
          }}
          transition={{
            duration: 1.7,
            times: [0, 0.5, 1],
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute left-0 w-full bg-white"
        />
      </div>
    </div>
  );
};

export default ScrollIndicator;
