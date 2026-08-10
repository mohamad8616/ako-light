export interface Project {
  id: string;
  name: string;
  location: string;
  year: string;
  image: string;
  description: string;
}

export const projects: Project[] = [
  {
    id: "h-istra",
    name: "H Istra",
    location: "Europe",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/06/H-Istra_Europe_Arch-Olga-Stupenko-61.jpg",
    description:
      "A residential project in Europe, showcasing Henge's timeless design in an intimate setting.",
  },
  {
    id: "henge-paris",
    name: "HENGE PARIS",
    location: "Paris, France",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/01/7-scaled.jpg",
    description:
      "Henge's first pop-up store in Paris, created in partnership with Silvera on Boulevard Saint-Germain.",
  },
  {
    id: "vocla-2026",
    name: "Vocla 2026",
    location: "Milan, Italy",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/05/ALCOVAMDW26_03-3.jpg",
    description:
      "For Milan Design Week 2026, Henge returned to VOCLA at the Ospedale Militare di Baggio.",
  },
  {
    id: "henge-beijing",
    name: "HENGE BEIJING",
    location: "Beijing, China",
    year: "2021",
    image: "https://www.henge07.com/app/uploads/2021/12/005web-1-400x400.jpg",
    description:
      "Henge's presence in Beijing, bringing Italian design craftsmanship to China.",
  },
];