export interface CollectionDescription {
  p1: string;
  p2: string;
  p3: string;
}

export interface Collection {
  slug: string;
  id: string;
  name: string;
  year: string;
  image: string;
  description: CollectionDescription;
}

export const collections: Collection[] = [
  {
    slug: "ritual-gravity",
    id: "ritual-gravity",
    name: "Ritual Gravity",
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/04/hero-mdw2026.jpg",
    description: {
      p1: "The 2026 Collection is an exploration of design as immersive and sensory experience. Rather than presenting isolated objects, it composes a complete domestic landscape in which furniture, lighting and accessories share a single visual grammar. Every silhouette, surface and proportion has been considered in relation to the whole, so that each room reads as a coherent chapter of one continuous narrative.",
      p2: "At the heart of the collection lies the dialogue between gravity and lightness. Massive mineral volumes rest on slender metal structures, while soft upholstery balances rigorous architectural lines. This tension gives the pieces their presence: they anchor a space without overwhelming it, drawing the eye across textures of stone, wood, glass and burnished metal arranged in deliberate counterpoint.",
      p3: "Light is treated as a material in its own right. New lighting systems filter and diffuse luminosity through Murano glass and frosted surfaces, transforming it into perceptual depth that changes with the hours of the day. The result is a collection that is not simply furnished but inhabited — a sequence of rituals performed in spaces designed to give every gesture its own weight and reason to be.",
    },
  },
  {
    slug: "timeless",
    id: "timeless",
    name: "Timeless",
    year: "2025",
    image: "https://www.henge07.com/app/uploads/2023/02/MDW-400x400.png",
    description: {
      p1: "Timeless is a study in permanence, gathering pieces conceived to outlive trends and remain relevant across decades. The collection reduces each object to its essential geometry, letting proportion, material and craftsmanship carry the expressive weight. Nothing is decorative for its own sake; every line exists because it earns its place in the composition.",
      p2: "Sisma, the table at the centre of the collection, stems from the harmonious visual interplay between concave and convex. Its sculpted base appears to twist as the viewer moves around it, revealing new profiles from every angle, while the top — available in marble, wood or crystal — floats above with surprising lightness. It is a table of great versatility, equally at home in a dining room or a formal lounge.",
      p3: "The supporting pieces extend the same vocabulary: console tables with monolithic bases, seating with precise tailored upholstery, and storage units whose surfaces are finished by hand. Together they form an environment in which time seems suspended, where the quality of the materials deepens rather than fades with use.",
    },
  },
  {
    slug: "home-collection",
    id: "home-collection",
    name: "Home Collection",
    year: "2026",
    image:
      "https://www.henge07.com/app/uploads/2026/04/henge-home-collection-2026-001.jpg",
    description: {
      p1: "The Home Collection extends the Henge language into the most intimate rituals of daily living. It is a curated selection of objects for refined living, from wine glass sets and decanters to whisky sets, tableware, cutlery and an exclusive home fragrance. Each item is designed to bring the same material rigour found in the furniture to the smallest gestures of hospitality.",
      p2: "The objects are realised in partnership with master artisans: crystal is shaped and polished to catch the light, metals are burnished to a deep warm glow, and porcelain is glazed in tones drawn from the brand's mineral palette. The detailing is deliberately restrained, allowing texture and weight to communicate quality the moment an object is held in the hand.",
      p3: "Presented in a dedicated packaging programme, the collection is conceived both as personal indulgence and as gift. Whether setting a table, serving a drink or scenting a room, these pieces transform everyday routines into small ceremonies — the quiet rituals that give a home its character and its sense of occasion.",
    },
  },
  {
    slug: "stone",
    id: "stone",
    name: "Stone",
    year: "2024",
    image: "https://www.henge07.com/app/uploads/2022/06/he1408m-400x400.jpg",
    description: {
      p1: "Stone is a collection of sculptural pieces in precious material, showcasing the natural beauty of stone in its purest form. Each block is selected by hand at the quarry, chosen for its veining, tonality and inner light, so that no two finished pieces are ever alike. The material is not treated as a surface but as the very subject of the design.",
      p2: "The working process alternates between advanced precision machining and traditional hand finishing. Edges are softened to a velvety touch, surfaces are honed to a matte depth or polished to a mirror sheen, and the natural veins are oriented so that the stone appears to flow across the volume. The geometry remains essential — monoliths, discs and inclined planes — letting the material speak without interruption.",
      p3: "Used as sculptural tables, benches and objects, these pieces behave like fragments of landscape brought indoors. They anchor a space with geological presence, and as they age they develop a patina that records the life of the room around them, becoming heirlooms that carry memory in their surfaces.",
    },
  },
  {
    slug: "signature",
    id: "signature",
    name: "Signature",
    year: "2023",
    image:
      "https://www.henge07.com/app/uploads/2021/09/henge-071020-h17929-400x400.jpg",
    description: {
      p1: "Signature gathers the pieces that embody the brand's material research and sophisticated approach — the icons that define its identity. Each one distils years of experimentation with finishes, structures and assembly techniques into a form so resolved that it has become a reference point for the entire catalogue.",
      p2: "The collection celebrates contrast as a design method: warm woods against cold metals, transparent glass against opaque stone, soft upholstery against hard edges. These oppositions are balanced with such control that the result never feels decorative; instead each pairing reveals something new about the materials themselves and the hand that shaped them.",
      p3: "More than a product line, Signature is a portrait of the brand's evolution. The pieces have been refined season after season, responding to new architectural contexts and new ways of living while preserving the recognisable character that made them icons. They are the pieces through which the collection's philosophy is most clearly expressed.",
    },
  },
  {
    slug: "experimental",
    id: "experimental",
    name: "Experimental",
    year: "2022",
    image:
      "https://www.henge07.com/app/uploads/2021/10/h-15032129575_COVER_def1-400x400.jpg",
    description: {
      p1: "Experimental is the laboratory of the collection: pieces born from the brand's ongoing exploration of form and material, where the rules of the catalogue are deliberately bent. Prototypes, limited series and one-off works share this space, unified by curiosity rather than by a formal programme.",
      p2: "Here traditional crafts meet unconventional techniques. Cast resins are combined with hand-carved stone, textile structures are stretched over improbable frames, and finishes are tested to their limits in search of textures that have no name yet. Failures are treated as findings, and many details that later appear in the main collections were first discovered in these studies.",
      p3: "The pieces are presented as open questions rather than finished answers. Collectors and architects are invited to work with them, adapting dimensions, materials and configurations to specific projects. In this way Experimental remains a living territory — a place where the future of the collection is continuously rehearsed.",
    },
  },
];
