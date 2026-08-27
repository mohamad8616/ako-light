"use client";

export default function FloatingRequestInfoButton() {
  function scrollToForm() {
    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <button
      onClick={scrollToForm}
      className="font-din fixed right-6 bottom-6 z-40 cursor-pointer rounded-full bg-white px-6 py-3 text-xs font-medium tracking-tighter text-stone-950 uppercase shadow-lg transition-transform hover:scale-105 md:right-8 md:bottom-8"
    >
      Request info
    </button>
  );
}
