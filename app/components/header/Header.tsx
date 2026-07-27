"use client";

import { motion } from "framer-motion";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import FullscreenMenu from "./fullScreenMenu";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="w-full h-full flex flex-col justify-between"
      >
        <div className="mx-auto w-full flex h-24 items-center justify-between px-8 md:px-14 lg:px-20 mt-1 z-50 ">
          {/* Logo */}
          <Link
            href="/"
            className="text-white text-3xl font-semibold tracking-[0.25em] cursor-pointer"
          >
            HENGE
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-8 md:gap-10">
            <button className="text-white transition hover:opacity-70 cursor-pointer">
              <Search size={18} strokeWidth={2.2} />
            </button>

            <button className="hidden text-sm font-semibold cursor-pointer tracking-widest text-white md:block">
              PRODUCTS
            </button>

            <button
              onClick={() => setOpen(true)}
              className="text-white transition-opacity hover:opacity-70"
            >
              <Menu size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className=" text-start z-30 text-slate-100 hover:cursor-pointer px-8 md:px-14 lg:px-20">
          <h1 className="text-6xl font-bold">2026 Collection</h1>
          <h3 className="text-2xl font-semibold">Ritual Gravity</h3>
          <button>
            <span className="hover:scale-90">+</span>read more
          </button>
        </div>
      </motion.header>
      <FullscreenMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
