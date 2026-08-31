import HomepageSection from "@/utility/HomepageSection";
import ContactForm from "./ContactForm";
import Image from "next/image";

// Placeholder — sourced from the existing gallery data as a stand-in.
// Swap for real photography whenever it's ready.
const HERO_IMAGE =
  "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_41_C-3.jpg";

export default function ContactHero() {
  return (
    <HomepageSection className="grid grid-cols-1 bg-stone-950 lg:grid-cols-2">
      {/* Image — hidden below lg, matching the "photo will be hidden on
          small screens" requirement. Height comes from the grid row
          stretching to match the form column's height. */}
      <div className="relative hidden lg:block">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          className="object-cover"
        />
      </div>

      <div className="px-6 py-20 md:px-12 md:py-28 lg:px-16 lg:py-32 xl:px-20">
        <h1 className="font-din text-4xl font-bold tracking-tight text-white uppercase md:text-5xl">
          Send a message
        </h1>
        <p className="font-din mt-6 max-w-md text-sm font-normal tracking-tight text-stone-400">
          Please send your request for information and assistance to one of
          the addresses listed below and we will get back to you in the
          shortest time possible.
        </p>

        <ContactForm />
      </div>
    </HomepageSection>
  );
}
