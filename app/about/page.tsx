import AboutHero from "@/components/about/AboutHero";
import AboutIntro from "@/components/about/AboutIntro";
import MetaphysicsTeaser from "@/components/about/MetaphysicsTeaser";
import BrandStory from "@/components/about/BrandStory";
import ImageGalleryCarousel from "@/components/about/ImageGalleryCarousel";
import FounderBio from "@/components/about/FounderBio";
import EleganceSection from "@/components/about/EleganceSection";

export default function AboutPage() {
  return (
    <main className="w-full bg-background">
      <AboutHero />
      <AboutIntro />
      <MetaphysicsTeaser />
      <BrandStory />
      <ImageGalleryCarousel />

      <FounderBio
        theme="light"
        bleed
        name="Paolo Tormena"
        image="https://www.henge07.com/app/uploads/2023/04/paolotormena-ritratto-web.jpg"
        columns={[
          "Born in Valdobbiadene on June 28, 1967, he has always cultivated a passion for his territory and for the manufacturing excellence that characterizes it. His professional career started in the industrial field of Made in Italy furniture. In those years he meets various professionals in the Italian design field. Thanks to it, Paolo develops an awareness of beauty by getting in contact with successful architects, designers, and entrepreneurs. His path continues in 2011 with the birth of Henge which fully represents his vision: developing products with a timeless and customizable design that can be freely adapted to stylistically different houses.",
          "Products that evolve over time and are not tied to any production cycles. At the root of the brand's stylistic code is material research, which Paolo carries out directly by constantly traveling to places of great inspiration. Henge, today, is a container of Italian excellence. Local workshops and workers have been requalified and included in the project and vision of Paolo Tormena, returning to his land the value that itself has given to him.",
        ]}
      />

      <FounderBio
        reverse
        theme="dark"
        name="Isabella Genovese"
        image="https://www.henge07.com/app/uploads/2023/04/isabellagenovese-ritratto-web.jpg"
        columns={[
          "Born on January 13, 1973, she attended art school in Treviso. Her passion for design soon led her to collaborate with a local furniture and accessories company. She then attended the IUAV University of Venice, where she graduated in 2000. Fascinated by interior design, Isabella initially collaborated with architectural firms specialized in projects for hotels, shops and exhibition spaces, and then began to cultivate personal projects. Isabella's approach to design is based on creativity, functionality and a timeless character.",
          "The meeting with Paolo, in private life and in business, boosted his passion for design, contributing to, what is today, the stylistic signature of Henge. In Henge she is involved in the product design phase, she leads the design department and develops the layouts of institutional spaces and showrooms of the most important dealers in the world. Above all, she adds her sensitivity to the details that characterize all the collections.",
        ]}
      />

      <EleganceSection />
    </main>
  );
}
