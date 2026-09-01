export interface FragranceProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  bottleSize: string;
  availability: string;
  freeShipping: boolean;
  shippingNote: string;
  description: string[];
  images: string[];
}

export const fragranceProduct34: FragranceProduct = {
  id: "henge-fragrance-34",
  name: "Henge Fragrance #34",
  price: 245,
  currency: "EUR",
  bottleSize: "500 ml",
  availability: "Europe Only",
  freeShipping: true,
  shippingNote:
    "Your order will be carefully prepared and shipped from 25 August",
  description: [
    "A unique way to relive a memory or embrace the present moment. Henge captures the essence of its philosophy in a fragrance shaped by the most expressive elements of the natural world.",
    "#34 HENGE FRAGRANCE is inspired by the cultural richness and contrasts of the places that influence Henge. These diverse identities are distilled into a balanced, elegant blend—an olfactory signature that brings depth and harmony to every space it touches.",
  ],
  // Placeholders — swap for real product photography.
  images: [
    "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_67-1.jpg",
    "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_73-2.jpg",
    "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_81-1.jpg",
    "https://www.henge07.com/app/uploads/2024/06/Henge_SR24_85_B-1.jpg",
  ],
};
