export interface ProductSubCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  hoverImage: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  subCategories: ProductSubCategory[];
}

export const productCategories: ProductCategory[] = [
  {
    id: "lighting",
    name: "Lighting",
    slug: "lighting",
    subCategories: [
      { id: "pendant-light", name: "Pendant Light", slug: "pendant-light", image: "https://picsum.photos/seed/lighting-pendant/700/525", hoverImage: "https://picsum.photos/seed/lighting-pendant-hover/700/525" },
      { id: "floor-lamp", name: "Floor Lamp", slug: "floor-lamp", image: "https://picsum.photos/seed/lighting-floor/700/525", hoverImage: "https://picsum.photos/seed/lighting-floor-hover/700/525" },
      { id: "wall-sconce", name: "Wall Sconce", slug: "wall-sconce", image: "https://picsum.photos/seed/lighting-sconce/700/525", hoverImage: "https://picsum.photos/seed/lighting-sconce-hover/700/525" },
      { id: "table-lamp", name: "Table Lamp", slug: "table-lamp", image: "https://picsum.photos/seed/lighting-table/700/525", hoverImage: "https://picsum.photos/seed/lighting-table-hover/700/525" },
    ],
  },
  {
    id: "bookcases",
    name: "Bookcases",
    slug: "bookcases",
    subCategories: [
      { id: "diapason", name: "Diapason", slug: "diapason", image: "https://picsum.photos/seed/bookcases-diapason/700/525", hoverImage: "https://picsum.photos/seed/bookcases-diapason-hover/700/525" },
      { id: "spectre", name: "Spectre", slug: "spectre", image: "https://picsum.photos/seed/bookcases-spectre/700/525", hoverImage: "https://picsum.photos/seed/bookcases-spectre-hover/700/525" },
      { id: "bistrot-horizontal", name: "Bistrot Horizontal", slug: "bistrot-horizontal", image: "https://picsum.photos/seed/bookcases-bistrot/700/525", hoverImage: "https://picsum.photos/seed/bookcases-bistrot-hover/700/525" },
      { id: "unicode", name: "Unicode", slug: "unicode", image: "https://picsum.photos/seed/bookcases-unicode/700/525", hoverImage: "https://picsum.photos/seed/bookcases-unicode-hover/700/525" },
    ],
  },
  {
    id: "cabinets-and-sideboards",
    name: "Cabinets And Sideboards",
    slug: "cabinets-and-sideboards",
    subCategories: [
      { id: "sideboard-a", name: "Sideboard A", slug: "sideboard-a", image: "https://picsum.photos/seed/cabinets-a/700/525", hoverImage: "https://picsum.photos/seed/cabinets-a-hover/700/525" },
      { id: "sideboard-b", name: "Sideboard B", slug: "sideboard-b", image: "https://picsum.photos/seed/cabinets-b/700/525", hoverImage: "https://picsum.photos/seed/cabinets-b-hover/700/525" },
      { id: "cabinet-c", name: "Cabinet C", slug: "cabinet-c", image: "https://picsum.photos/seed/cabinets-c/700/525", hoverImage: "https://picsum.photos/seed/cabinets-c-hover/700/525" },
    ],
  },
  {
    id: "tables",
    name: "Tables",
    slug: "tables",
    subCategories: [
      { id: "dining-table", name: "Dining Table", slug: "dining-table", image: "https://picsum.photos/seed/tables-dining/700/525", hoverImage: "https://picsum.photos/seed/tables-dining-hover/700/525" },
      { id: "conference-table", name: "Conference Table", slug: "conference-table", image: "https://picsum.photos/seed/tables-conference/700/525", hoverImage: "https://picsum.photos/seed/tables-conference-hover/700/525" },
      { id: "console-table", name: "Console Table", slug: "console-table", image: "https://picsum.photos/seed/tables-console/700/525", hoverImage: "https://picsum.photos/seed/tables-console-hover/700/525" },
    ],
  },
  {
    id: "coffee-tables",
    name: "Coffee Tables",
    slug: "coffee-tables",
    subCategories: [
      { id: "low-table", name: "Low Table", slug: "low-table", image: "https://picsum.photos/seed/coffee-low/700/525", hoverImage: "https://picsum.photos/seed/coffee-low-hover/700/525" },
      { id: "marble-top", name: "Marble Top", slug: "marble-top", image: "https://picsum.photos/seed/coffee-marble/700/525", hoverImage: "https://picsum.photos/seed/coffee-marble-hover/700/525" },
    ],
  },
  {
    id: "sofas-and-armchairs",
    name: "Sofas And Armchairs",
    slug: "sofas-and-armchairs",
    subCategories: [
      { id: "modular-sofa", name: "Modular Sofa", slug: "modular-sofa", image: "https://picsum.photos/seed/sofas-modular/700/525", hoverImage: "https://picsum.photos/seed/sofas-modular-hover/700/525" },
      { id: "armchair", name: "Armchair", slug: "armchair", image: "https://picsum.photos/seed/sofas-armchair/700/525", hoverImage: "https://picsum.photos/seed/sofas-armchair-hover/700/525" },
      { id: "loveseat", name: "Loveseat", slug: "loveseat", image: "https://picsum.photos/seed/sofas-loveseat/700/525", hoverImage: "https://picsum.photos/seed/sofas-loveseat-hover/700/525" },
    ],
  },
  {
    id: "chairs-and-stools",
    name: "Chairs And Stools",
    slug: "chairs-and-stools",
    subCategories: [
      { id: "dining-chair", name: "Dining Chair", slug: "dining-chair", image: "https://picsum.photos/seed/chairs-dining/700/525", hoverImage: "https://picsum.photos/seed/chairs-dining-hover/700/525" },
      { id: "stool", name: "Stool", slug: "stool", image: "https://picsum.photos/seed/chairs-stool/700/525", hoverImage: "https://picsum.photos/seed/chairs-stool-hover/700/525" },
    ],
  },
  {
    id: "kitchens",
    name: "Kitchens",
    slug: "kitchens",
    subCategories: [
      { id: "modern-kitchen", name: "Modern Kitchen", slug: "modern-kitchen", image: "https://picsum.photos/seed/kitchens-modern/700/525", hoverImage: "https://picsum.photos/seed/kitchens-modern-hover/700/525" },
      { id: "minimal-kitchen", name: "Minimal Kitchen", slug: "minimal-kitchen", image: "https://picsum.photos/seed/kitchens-minimal/700/525", hoverImage: "https://picsum.photos/seed/kitchens-minimal-hover/700/525" },
    ],
  },
  {
    id: "bedroom",
    name: "Bedroom",
    slug: "bedroom",
    subCategories: [
      { id: "bed-frame", name: "Bed Frame", slug: "bed-frame", image: "https://picsum.photos/seed/bedroom-bed/700/525", hoverImage: "https://picsum.photos/seed/bedroom-bed-hover/700/525" },
      { id: "wardrobe", name: "Wardrobe", slug: "wardrobe", image: "https://picsum.photos/seed/bedroom-wardrobe/700/525", hoverImage: "https://picsum.photos/seed/bedroom-wardrobe-hover/700/525" },
      { id: "nightstand", name: "Nightstand", slug: "nightstand", image: "https://picsum.photos/seed/bedroom-night/700/525", hoverImage: "https://picsum.photos/seed/bedroom-night-hover/700/525" },
    ],
  },
  {
    id: "wall-panelling",
    name: "Wall Panelling",
    slug: "wall-panelling",
    subCategories: [
      { id: "wood-panel", name: "Wood Panel", slug: "wood-panel", image: "https://picsum.photos/seed/wall-wood/700/525", hoverImage: "https://picsum.photos/seed/wall-wood-hover/700/525" },
      { id: "metal-panel", name: "Metal Panel", slug: "metal-panel", image: "https://picsum.photos/seed/wall-metal/700/525", hoverImage: "https://picsum.photos/seed/wall-metal-hover/700/525" },
    ],
  },
  {
    id: "accessories",
    name: "Accessories",
    slug: "accessories",
    subCategories: [
      { id: "mirror", name: "Mirror", slug: "mirror", image: "https://picsum.photos/seed/accessories-mirror/700/525", hoverImage: "https://picsum.photos/seed/accessories-mirror-hover/700/525" },
      { id: "vase", name: "Vase", slug: "vase", image: "https://picsum.photos/seed/accessories-vase/700/525", hoverImage: "https://picsum.photos/seed/accessories-vase-hover/700/525" },
      { id: "sculpture", name: "Sculpture", slug: "sculpture", image: "https://picsum.photos/seed/accessories-sculpture/700/525", hoverImage: "https://picsum.photos/seed/accessories-sculpture-hover/700/525" },
    ],
  },
];
