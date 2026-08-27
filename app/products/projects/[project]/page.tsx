import FabricsGrid from "@/components/materials/material/FabricsGrid";
import MaterialsSwitcher from "@/components/materials/material/MaterialsSwitcher";

export const metadata = {
  title: "Fabrics — Materials | Henge",
  description:
    "Explore Henge's fabric library, hand-selected for our upholstered collections.",
};

export default function FabricsPage() {
  return (
    <main className="min-h-screen bg-stone-950 pt-32 md:pt-52">
      <section className="px-6 pb-12 md:px-12 lg:px-20 xl:px-[8.5vw]">
        <span className="font-din text-xs font-normal tracking-tighter text-stone-500 uppercase">
          Materials
        </span>
        <div className="mt-2 h-px w-full bg-white/15" />

        <div className="mt-6 flex items-start justify-between gap-6 md:mt-8">
          <h1 className="font-din text-5xl font-bold tracking-tight text-white uppercase md:text-7xl">
            Fabrics
          </h1>
          <MaterialsSwitcher active="Fabrics" />
        </div>

        <p className="font-din mt-4 max-w-xl text-sm font-normal tracking-tight text-stone-400 md:mt-6">
          Finishes are shown for reference only. For accurate colors and
          textures selection, please refer to physical samples.
        </p>
      </section>

      <FabricsGrid />
    </main>
  );
}
