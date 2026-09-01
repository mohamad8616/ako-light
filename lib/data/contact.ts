// Contact-page content, previously hardcoded inside the contact components.

export const contactHero = {
  heroImage: "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_41_C-3.jpg",
  title: "Send a message",
  description:
    "Please send your request for information and assistance to one of the addresses listed below and we will get back to you in the shortest time possible.",
};

export interface ContactCard {
  title: string;
  lines: string[];
  email: string;
  phone: string;
}

export const contactCards: ContactCard[] = [
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

export const contactInfoHeading = {
  line1: "Via della Spiga 34",
  line2: "20121 Milano (MI) \u2013 Italy",
};

// Only "Generic requests" is visible in the reference \u2014 the extra options
// are a placeholder set, swap for the real list.
export const subjectOptions = [
  "Generic requests",
  "Press & marketing",
  "Trade / dealer enquiry",
  "Job application",
];
