"use client";

import HomepageSection from "@/utility/HomepageSection";
import { designers } from "../../lib/data/designers";
import Row from "../ui/Row";

const ROWS_ON_LOAD = 2;

export default function DesignersList() {
  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full flex flex-col items-center justify-center pb-20 md:pb-28"
    >
      {designers.map((designer, i) => (
        <Row
          key={designer.slug}
          index={i}
          animateOnLoad={i < ROWS_ON_LOAD}
          route="designers"
          {...designer}
        />
      ))}
    </HomepageSection>
  );
}
