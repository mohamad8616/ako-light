"use client";

import { designers } from "../../lib/data/designers";
import DesignerRow from "./DesignerRow";

export default function DesignersList() {
  return (
    <section className="w-full bg-background pb-20 md:pb-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {designers.map((designer, i) => (
          <DesignerRow key={designer.slug} index={i} {...designer} />
        ))}
      </div>
    </section>
  );
}
