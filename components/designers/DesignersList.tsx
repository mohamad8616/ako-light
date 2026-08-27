"use client";

import HomepageSection from "@/utility/HomepageSection";
import { designers } from "../../lib/data/designers";
import Row from "../ui/Row";

const ROWS_ON_LOAD = 2;

export default function DesignersList() {
  return (
    <HomepageSection animateOnLoad className="bg-background w-full pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {designers.map((designer, i) => (
          <Row key={designer.slug} index={i} animateOnLoad={i < ROWS_ON_LOAD} route="designers" {...designer} />
        ))}
      </div>
    </HomepageSection>
  );
}