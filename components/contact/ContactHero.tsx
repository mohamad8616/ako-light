import HomepageSection from "@/utility/HomepageSection";
import ContactForm from "./ContactForm";
import { contactHero } from "@/lib/data/contact";
import Image from "next/image";

export default function ContactHero() {
  return (
    <HomepageSection className="grid grid-cols-1 bg-stone-950 lg:grid-cols-2">
      {/* Image \u2014 hidden below lg, matching the "photo will be hidden on
          small screens" requirement. Height comes from the grid row
          stretching to match the form column's height. */}
      <div className="relative hidden lg:block">
        <Image
          src={contactHero.heroImage}
          alt=""
          fill
          className="object-cover"
        />
      </div>

      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-16 lg:py-32 xl:px-20">
        <h1 className="font-din text-4xl font-bold tracking-tight text-white uppercase md:text-5xl">
          {contactHero.title}
        </h1>
        <p className="font-din mt-6 max-w-md text-sm font-normal tracking-tight text-stone-400">
          {contactHero.description}
        </p>

        <ContactForm />
      </div>
    </HomepageSection>
  );
}
