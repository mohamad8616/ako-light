"use client";
import { EASE } from "@/utility/HomepageSection";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import HomerPageSection from "../utility/HomepageSection";
import PlusTextBtn from "./ui/PlusTextBtn";
const links = [
  {
    label: "Products",
    href: "/products",
    image: "https://www.henge07.com/app/uploads/2023/04/PRODUCTS-1.jpg",
  },
  {
    label: "Projects",
    
    href: "/projects",
    image: "https://www.henge07.com/app/uploads/2023/04/PROJECTS-1.jpg",
  },
  {
    label: "S34",
    href: "/collection/henge-catalogue-s34-3",
    image: "https://www.henge07.com/app/uploads/2023/04/Henge_Spiga_30_B-1.jpg",
  },
];
const ProjectsSections = () => {
  return (
    <HomerPageSection className="">
      <div className="bg-background mx-auto flex min-h-screen max-w-[1600px] items-center justify-center py-20">
        <div className="grid w-full grid-cols-1 items-center justify-between gap-10 px-6 sm:grid-cols-3 md:mt-20 md:gap-8 md:px-12 lg:px-20 xl:px-[8.5vw]">
          {links.map(({ label, href, image }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
            >
              <Link
                href={href}
                className="group relative mb-5 grid aspect-square w-full grid-cols-1 overflow-hidden lg:mb-0"
              >
                <Image
                  src={image}
                  alt={label}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/40" />
              </Link>
              <PlusTextBtn text={label} className="mt-10 lg:mt-5" />
            </motion.div>
          ))}
        </div>
      </div>
    </HomerPageSection>
  );
};

export default ProjectsSections;
