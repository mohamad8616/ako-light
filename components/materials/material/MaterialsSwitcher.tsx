"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { materialCategories } from "@/lib/data/materials";

const MATERIAL_CATEGORIES = materialCategories;

export default function MaterialsSwitcher({ active }: { active: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden shrink-0 md:block">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="font-din flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-xs font-normal tracking-tighter text-white uppercase transition-colors hover:bg-stone-800 focus:outline-none"
      >
        {active}
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-40 overflow-hidden rounded-md border border-white/10 bg-stone-900 shadow-lg">
          {MATERIAL_CATEGORIES.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              onClick={() => setOpen(false)}
              className={`font-din block px-4 py-2.5 text-xs font-normal tracking-tighter uppercase transition-colors ${
                category.label === active
                  ? "text-white"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {category.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
