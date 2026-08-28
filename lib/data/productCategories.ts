export interface ProductSubCategory {
  name: string;
  slug: string;
  image: string;
  hoverImage: string;
}

export interface ProductCategory {
  name: string;
  slug: string;
  subCategories: ProductSubCategory[];
}

export const productCategories: ProductCategory[] = [
  {
    name: "Lighting",
    slug: "lighting",
    subCategories: [
      { name: "Pendant Light", slug: "pendant-light", image: "https://picsum.photos/seed/lighting-pendant/700/525", hoverImage: "https://picsum.photos/seed/lighting-pendant-hover/700/525" },
      { name: "Floor Lamp", slug: "floor-lamp", image: "https://picsum.photos/seed/lighting-floor/700/525", hoverImage: "https://picsum.photos/seed/lighting-floor-hover/700/525" },
      { name: "Wall Sconce", slug: "wall-sconce", image: "https://picsum.photos/seed/lighting-sconce/700/525", hoverImage: "https://picsum.photos/seed/lighting-sconce-hover/700/525" },
      { name: "Table Lamp", slug: "table-lamp", image: "https://picsum.photos/seed/lighting-table/700/525", hoverImage: "https://picsum.photos/seed/lighting-table-hover/700/525" },
    ],
  },
  {
    name: "Bookcases",
    slug: "bookcases",
    subCategories: [
      { name: "Diapason", slug: "diapason", image: "https://picsum.photos/seed/bookcases-diapason/700/525", hoverImage: "https://picsum.photos/seed/bookcases-diapason-hover/700/525" },
      { name: "Spectre", slug: "spectre", image: "https://picsum.photos/seed/bookcases-spectre/700/525", hoverImage: "https://picsum.photos/seed/bookcases-spectre-hover/700/525" },
      { name: "Bistrot Horizontal", slug: "bistrot-horizontal", image: "https://picsum.photos/seed/bookcases-bistrot/700/525", hoverImage: "https://picsum.photos/seed/bookcases-bistrot-hover/700/525" },
      { name: "Unicode", slug: "unicode", image: "https://picsum.photos/seed/bookcases-unicode/700/525", hoverImage: "https://picsum.photos/seed/bookcases-unicode-hover/700/525" },
    ],
  },
  {
    name: "Cabinets And Sideboards",
    slug: "cabinets-and-sideboards",
    subCategories: [
      { name: "Sideboard A", slug: "sideboard-a", image: "https://picsum.photos/seed/cabinets-a/700/525", hoverImage: "https://picsum.photos/seed/cabinets-a-hover/700/525" },
      { name: "Sideboard B", slug: "sideboard-b", image: "https://picsum.photos/seed/cabinets-b/700/525", hoverImage: "https://picsum.photos/seed/cabinets-b-hover/700/525" },
      { name: "Cabinet C", slug: "cabinet-c", image: "https://picsum.photos/seed/cabinets-c/700/525", hoverImage: "https://picsum.photos/seed/cabinets-c-hover/700/525" },
    ],
  },
  {
    name: "Tables",
    slug: "tables",
    subCategories: [
      { name: "Dining Table", slug: "dining-table", image: "https://picsum.photos/seed/tables-dining/700/525", hoverImage: "https://picsum.photos/seed/tables-dining-hover/700/525" },
      { name: "Conference Table", slug: "conference-table", image: "https://picsum.photos/seed/tables-conference/700/525", hoverImage: "https://picsum.photos/seed/tables-conference-hover/700/525" },
      { name: "Console Table", slug: "console-table", image: "https://picsum.photos/seed/tables-console/700/525", hoverImage: "https://picsum.photos/seed/tables-console-hover/700/525" },
    ],
  },
  {
    name: "Coffee Tables",
    slug: "coffee-tables",
    subCategories: [
      { name: "Low Table", slug: "low-table", image: "https://picsum.photos/seed/coffee-low/700/525", hoverImage: "https://picsum.photos/seed/coffee-low-hover/700/525" },
      { name: "Marble Top", slug: "marble-top", image: "https://picsum.photos/seed/coffee-marble/700/525", hoverImage: "https://picsum.photos/seed/coffee-marble-hover/700/525" },
    ],
  },
  {
    name: "Sofas And Armchairs",
    slug: "sofas-and-armchairs",
    subCategories: [
      { name: "Modular Sofa", slug: "modular-sofa", image: "https://picsum.photos/seed/sofas-modular/700/525", hoverImage: "https://picsum.photos/seed/sofas-modular-hover/700/525" },
      { name: "Armchair", slug: "armchair", image: "https://picsum.photos/seed/sofas-armchair/700/525", hoverImage: "https://picsum.photos/seed/sofas-armchair-hover/700/525" },
      { name: "Loveseat", slug: "loveseat", image: "https://picsum.photos/seed/sofas-loveseat/700/525", hoverImage: "https://picsum.photos/seed/sofas-loveseat-hover/700/525" },
    ],
  },
  {
    name: "Chairs And Stools",
    slug: "chairs-and-stools",
    subCategories: [
      { name: "Dining Chair", slug: "dining-chair", image: "https://picsum.photos/seed/chairs-dining/700/525", hoverImage: "https://picsum.photos/seed/chairs-dining-hover/700/525" },
      { name: "Stool", slug: "stool", image: "https://picsum.photos/seed/chairs-stool/700/525", hoverImage: "https://picsum.photos/seed/chairs-stool-hover/700/525" },
    ],
  },
  {
    name: "Kitchens",
    slug: "kitchens",
    subCategories: [
      { name: "Modern Kitchen", slug: "modern-kitchen", image: "https://picsum.photos/seed/kitchens-modern/700/525", hoverImage: "https://picsum.photos/seed/kitchens-modern-hover/700/525" },
      { name: "Minimal Kitchen", slug: "minimal-kitchen", image: "https://picsum.photos/seed/kitchens-minimal/700/525", hoverImage: "https://picsum.photos/seed/kitchens-minimal-hover/700/525" },
    ],
  },
  {
    name: "Bedroom",
    slug: "bedroom",
    subCategories: [
      { name: "Bed Frame", slug: "bed-frame", image: "https://picsum.photos/seed/bedroom-bed/700/525", hoverImage: "https://picsum.photos/seed/bedroom-bed-hover/700/525" },
      { name: "Wardrobe", slug: "wardrobe", image: "https://picsum.photos/seed/bedroom-wardrobe/700/525", hoverImage: "https://picsum.photos/seed/bedroom-wardrobe-hover/700/525" },
      { name: "Nightstand", slug: "nightstand", image: "https://picsum.photos/seed/bedroom-night/700/525", hoverImage: "https://picsum.photos/seed/bedroom-night-hover/700/525" },
    ],
  },
  {
    name: "Wall Panelling",
    slug: "wall-panelling",
    subCategories: [
      { name: "Wood Panel", slug: "wood-panel", image: "https://picsum.photos/seed/wall-wood/700/525", hoverImage: "https://picsum.photos/seed/wall-wood-hover/700/525" },
      { name: "Metal Panel", slug: "metal-panel", image: "https://picsum.photos/seed/wall-metal/700/525", hoverImage: "https://picsum.photos/seed/wall-metal-hover/700/525" },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    subCategories: [
      { name: "Mirror", slug: "mirror", image: "https://picsum.photos/seed/accessories-mirror/700/525", hoverImage: "https://picsum.photos/seed/accessories-mirror-hover/700/525" },
      { name: "Vase", slug: "vase", image: "https://picsum.photos/seed/accessories-vase/700/525", hoverImage: "https://picsum.photos/seed/accessories-vase-hover/700/525" },
      { name: "Sculpture", slug: "sculpture", image: "https://picsum.photos/seed/accessories-sculpture/700/525", hoverImage: "https://picsum.photos/seed/accessories-sculpture-hover/700/525" },
    ],
  },
];
