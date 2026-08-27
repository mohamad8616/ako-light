import Link from "next/link";
import type { FlagshipWithDetail } from "@/lib/data/flagships";

export default function FlagshipInfoSection({ flagship }: { flagship: FlagshipWithDetail }) {
  return (
    <section className="bg-stone-100 px-6 py-16 md:px-12 md:py-20 lg:px-20 xl:px-[8.5vw]">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div>
          <nav className="font-din flex items-center gap-2 text-xs font-medium tracking-tighter text-stone-500 uppercase">
            <Link
              href="/showroom"
              className="underline underline-offset-2 transition-colors hover:text-stone-950"
            >
              Henge Flagships
            </Link>
            <span>/</span>
            <span className="text-stone-950">{flagship.name}</span>
          </nav>

          <h2 className="font-din mt-6 text-2xl font-medium text-stone-950 md:text-3xl">
            {flagship.heading}
          </h2>

          <p className="font-din mt-6 max-w-2xl text-sm leading-relaxed text-stone-600">
            {flagship.description}
          </p>
        </div>

        <div>
          <span className="font-din text-xs font-medium tracking-tighter text-stone-500 uppercase">
            Info
          </span>

          <p className="font-din mt-6 text-base text-stone-950">{flagship.info.name}</p>

          <div className="font-din mt-6 flex flex-col text-sm text-stone-700">
            {flagship.info.addressLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>

          <div className="font-din mt-6 flex flex-col gap-3 text-sm text-stone-700">
            {flagship.info.hours.map((h) => (
              <span key={h.label} className="flex flex-col">
                <span>{h.label}</span>
                <span>{h.value}</span>
              </span>
            ))}
          </div>

          <div className="font-din mt-6 flex flex-col text-sm text-stone-700">
            <span>{flagship.info.appointmentNote}</span>
            <a
              href={`tel:${flagship.info.phone.replace(/\s+/g, "")}`}
              className="text-stone-950 transition-colors hover:underline"
            >
              {flagship.info.phone}
            </a>
            <a
              href={`mailto:${flagship.info.email}`}
              className="text-stone-950 underline underline-offset-2"
            >
              {flagship.info.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
