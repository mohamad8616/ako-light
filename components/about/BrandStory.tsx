/* eslint-disable @next/next/no-img-element */
"use client";

import HomepageSection from "@/utility/HomepageSection";
import { Paragraph } from "@/utility/Paragraph";
import SectionImage from "@/utility/SectionImage";
import SectionTitle from "@/utility/SectionTitle";

export default function BrandStory() {
  return (
    <HomepageSection className="bg-background-secondary w-full py-20 md:py-28">
      <div className="border-background/10 mx-auto max-w-[1600px] space-y-20 border-t px-6 pt-10 md:px-12 lg:px-20 xl:px-[8.5vw]">
        {/* Title */}
        <div className="overflow-hidden lg:w-1/5">
          <SectionTitle>
            From material search to a design trademark success
          </SectionTitle>
        </div>

        {/* Three-column paragraph grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-10">
          <Paragraph>
            HENGE is the successful story of a young company that turned the
            search for materials into its trademark in the world of design. The
            project came to life following the founder Paolo Tormena&rsquo;s
            desire to explore topics linked to his passions for materials and
            rare making, precious finish, extraordinary dimensions and
            combinations. The project emerged in just a few years, like a
            leading player in the universe of international design.
          </Paragraph>
          <Paragraph>
            Together with the support of creatives as Massimo Castagna &mdash;
            architect and artistic director of the brand &mdash; Tormena and
            architect Isabella Genovese &mdash; Paolo&rsquo;s travel companion
            in work and in life &mdash; were able to shape a vision that
            addresses peculiar aesthetic needs, to the point of creating a
            unique and unmistakable style for the brand.
          </Paragraph>

          <Paragraph>
            Over the years, the brand has strengthened its cooperation with the
            well-known international design firm Yabu Pushelberg, and carried
            out projects in partnership with Dutch artist Maarten Baas,
            exhibiting in the most fascinating showrooms and flagship stores in
            capital cities all over the world and in important international
            residences as Hillside in Los Angeles, Casa Clara and Palazzo Del
            Sol in Miami. The desire to experiment and create new elements has
            led HENGE to work with Ugo Cacciatori, jewellery and contemporary
            lifestyle designer. This has given life to a series of unmistakable
            products which embrace the brand&rsquo;s DNA.
          </Paragraph>

          <Paragraph>
            With the debut of the new 2025 Collection, Henge introduces two
            exceptional new collaborations, joining its longstanding creative
            partners: one with Turkish designer Tanju &Ouml;zelgin, known for
            his refined minimalism and strong architectural influence, and the
            other with American designer Johanna Grawunder, celebrated for her
            experimental use of light and colour in architectural spaces. These
            creative encounters create unique pieces that blend timeless
            elegance with contemporary innovation.
          </Paragraph>
        </div>

        {/*  image with corner badge with text */}
        <div className="mt-16 lg:flex flex-row-reverse items-center justify-between gap-5 space-y-5 lg:space-y-0 md:mt-30 lg:mb-60">
          <SectionImage className="flex-4 md:mt-20">
            <img
              src="https://www.henge07.com/app/uploads/2025/07/Henge_0730.jpg"
              alt="Henge interior"
              className="h-full w-full object-cover"
            />
          </SectionImage>
          <div className="flex-2 space-y-5 lg:px-14 text-xs">
            <Paragraph className="text-xs">
              HENGE&rsquo;s design stands out thanks to a daring and linear
              marking that imposes itself as a paradigm of contemporary
              refinement and elegance. All creations are destined to become
              protagonists, showing a strong personality and going beyond the
              fugacity of trends and fashion.
            </Paragraph>
            <Paragraph>
              What we all decide to live with is much more than just a piece of
              furniture, it is a travel companion as once it is inside our
              homes, it accompanies us on our journey through life, creating a
              real and personal relationship with us, mirroring our concept of
              beauty. It ages with us, day after day taking on that look which
              only comes with time.
            </Paragraph>
          </div>
        </div>

        {/* Text-Below / image-top */}
        <div className="mt-16 grid grid-cols-1 items-center gap-10 md:mt-20 lg:gap-12">
          <SectionImage>
            <img
              src="https://www.henge07.com/app/uploads/2025/07/Henge_0722-SG.jpg"
              alt="Henge lighting installation"
              className="h-full w-full object-cover"
            />
          </SectionImage>
          <Paragraph>
            Our quest for what will keep us company in our homes is based on
            trying to strike a difficult balance between what the mind sees as a
            mere function, and what the heart shows us as beauty and passion.
            Such choices have to be in line with our personal feelings and keep
            us happy day after day.
          </Paragraph>
        </div>
      </div>
    </HomepageSection>
  );
}
