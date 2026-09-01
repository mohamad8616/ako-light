// Footer social links \u2014 labels/hrefs live here; the SVG icons stay in
// components/footer/footer.tsx and are looked up by `icon` key.

export type SocialIconKey =
  | "instagram"
  | "whatsapp"
  | "youtube"
  | "x"
  | "facebook"
  | "telegram";

export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIconKey;
}

export const socialLinks: SocialLink[] = [
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "WhatsApp", href: "#", icon: "whatsapp" },
  { label: "YouTube", href: "#", icon: "youtube" },
  { label: "X", href: "#", icon: "x" },
  { label: "Facebook", href: "#", icon: "facebook" },
  { label: "telegram", href: "#", icon: "telegram" },
];
