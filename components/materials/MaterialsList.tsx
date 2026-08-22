"use client";

import HomepageSection from "@/utility/HomepageSection";
import { materials } from "../../lib/data/materials";
import Row from "../ui/Row";

const ROWS_ON_LOAD = 2;

export default function MaterialsList() {
  return (
    <HomepageSection
      animateOnLoad
      className="bg-background w-full pb-20 md:pb-28"
    >
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {materials.map((material, i) => (
          <Row
            route={"materials"}
            key={material.id}
            index={i}
            animateOnLoad={i < ROWS_ON_LOAD}
            {...material}
            width={"40"}
          />
        ))}
      </div>
    </HomepageSection>
  );
}
