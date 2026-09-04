"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

const UnderLineEffect = ({
  duration = "500",
  color = "bg-background-secondary",
}: {
  duration?: string;
  color?: string;
}) => {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  // LTR: the line enters from the left and wipes out to the right.
  // RTL (Persian): mirrored — it enters from the right and wipes out to
  // the left.
  return (
    <span
      className={`absolute -bottom-1 ${
        isRtl
          ? "right-0 origin-left group-hover:origin-right"
          : "left-0 origin-right group-hover:origin-left"
      } h-[0.5px] w-full scale-x-0 transition-transform duration-${duration} ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 ${color}`}
    />
  );
};

export default UnderLineEffect;
