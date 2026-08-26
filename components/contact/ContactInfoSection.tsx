import HomepageSection from "@/utility/HomepageSection";

const CONTACT_CARDS = [
  {
    title: "Showroom",
    lines: ["Via della Spiga, 34 20121, Milano - Italy", "Open by appointment."],
    email: "sales@henge07.com",
    phone: "+39 327 812 7661",
  },
  {
    title: "Press office and marketing requests",
    lines: [],
    email: "marketing@henge07.com",
    phone: "+39 0438 171 0600",
  },
  {
    title: "Headquarters",
    lines: ["Via Fossa 1 31051, Follina (TV) - Italy"],
    email: "atelier@henge07.com",
    phone: "+39 0438 171 0600",
  },
];

export default function ContactInfoSection() {
  return (
    <HomepageSection className="bg-stone-950 px-6 py-20 md:px-12 lg:px-20 xl:px-[8.5vw]">
      <span className="font-din text-xs font-normal tracking-tighter text-stone-500 uppercase">
        Contacts
      </span>
      <div className="mt-2 h-px w-full bg-white/15" />

      <h2 className="font-din mt-20 lg:mt-38 text-3xl font-bold tracking-tight text-white uppercase md:text-5xl ">
        Via della Spiga 34
        <br />
        20121 Milano (MI) – Italy
      </h2>

      <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        {CONTACT_CARDS.map((card) => (
          <div key={card.title} className="bg-stone-900 p-8">
            <h3 className="font-din text-sm font-medium tracking-tighter text-white uppercase underline underline-offset-4">
              {card.title}
            </h3>

            <div className="font-din mt-8 flex flex-col gap-1 text-sm text-stone-400">
              {card.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              <span>
                Email:{" "}
                <a
                  href={`mailto:${card.email}`}
                  className="text-white transition-colors hover:text-stone-300"
                >
                  {card.email}
                </a>
              </span>
              <span>
                Tel:{" "}
                <a
                  href={`tel:${card.phone.replace(/\s+/g, "")}`}
                  className="text-white transition-colors hover:text-stone-300"
                >
                  {card.phone}
                </a>
              </span>
            </div>
          </div>
        ))}
      </div>
    </HomepageSection>
  );
}
