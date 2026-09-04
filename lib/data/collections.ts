import { loc, type Localized } from "@/lib/i18n/localized";

export interface CollectionDescription {
  p1: Localized;
  p2: Localized;
  p3: Localized;
}

export interface Collection {
  slug: string;
  id: string;
  name: Localized;
  year: string;
  image: string;
  description: CollectionDescription;
}

export const collections: Collection[] = [
  {
    slug: "ritual-gravity",
    id: "ritual-gravity",
    name: loc("Ritual Gravity", "ریچوال گرویتی"),
    year: "2026",
    image: "https://www.henge07.com/app/uploads/2026/04/hero-mdw2026.jpg",
    description: {
      p1: loc(
        "The 2026 Collection is an exploration of design as immersive and sensory experience. Rather than presenting isolated objects, it composes a complete domestic landscape in which furniture, lighting and accessories share a single visual grammar. Every silhouette, surface and proportion has been considered in relation to the whole, so that each room reads as a coherent chapter of one continuous narrative.",
        "کلکسیون ۲۰۲۶ کاوشی در طراحی به‌مثابه تجربه‌ای فراگیر و حسی است. به‌جای ارائه اشیای منفرد، یک چشم‌انداز کامل خانگی می‌سازد که در آن مبلمان، روشنایی و لوازم تزئینی از یک دستور زبان بصری مشترک پیروی می‌کنند. هر سیلوئت، سطح و نسبت در رابطه با کل در نظر گرفته شده است تا هر اتاق چون فصلی منسجم از یک روایت پیوسته خوانده شود."
      ),
      p2: loc(
        "At the heart of the collection lies the dialogue between gravity and lightness. Massive mineral volumes rest on slender metal structures, while soft upholstery balances rigorous architectural lines. This tension gives the pieces their presence: they anchor a space without overwhelming it, drawing the eye across textures of stone, wood, glass and burnished metal arranged in deliberate counterpoint.",
        "در قلب این کلکسیون، گفت‌وگو میان سنگینی و سبکی قرار دارد. حجم‌های عظیم معدنی بر سازه‌های فلزی باریک تکیه می‌کنند و روکش‌های نرم، خطوط معماری سخت‌گیرانه را متعادل می‌سازند. این تنش به قطعات حضور می‌بخشد: آن‌ها فضا را لنگر می‌اندازند بدون آنکه بر آن غلبه کنند و چشم را بر بافت‌های سنگ، چوب، شیشه و فلز صیقلی در تقابلی عمدی می‌کشانند."
      ),
      p3: loc(
        "Light is treated as a material in its own right. New lighting systems filter and diffuse luminosity through Murano glass and frosted surfaces, transforming it into perceptual depth that changes with the hours of the day. The result is a collection that is not simply furnished but inhabited — a sequence of rituals performed in spaces designed to give every gesture its own weight and reason to be.",
        "نور به‌مثابه ماده‌ای مستقل در نظر گرفته می‌شود. سیستم‌های جدید روشنایی، تابش را از میان شیشه‌ی مورانو و سطوح مات فیلتر و پخش می‌کنند و آن را به عمقی ادراکی بدل می‌سازند که با ساعات روز تغییر می‌کند. نتیجه، کلکسیونی است که نه‌تنها مبله شده، بلکه «زیسته» می‌شود — توالی‌ای از آیین‌ها در فضاهایی که برای بخشیدن وزن و دلیل وجودی به هر حرکت طراحی شده‌اند."
      ),
    },
  },
  {
    slug: "timeless",
    id: "timeless",
    name: loc("Timeless", "تایملس"),
    year: "2025",
    image: "https://www.henge07.com/app/uploads/2023/02/MDW-400x400.png",
    description: {
      p1: loc(
        "Timeless is a study in permanence, gathering pieces conceived to outlive trends and remain relevant across decades. The collection reduces each object to its essential geometry, letting proportion, material and craftsmanship carry the expressive weight. Nothing is decorative for its own sake; every line exists because it earns its place in the composition.",
        "تایملس مطالعه‌ای درباره ماندگاری است؛ مجموعه‌ای از قطعاتی که برای فراتر رفتن از مدها و همچنان مرتبط ماندن در طول دهه‌ها طراحی شده‌اند. این کلکسیون هر شیء را به هندسه‌ی ضروری آن فرو می‌کاهد و می‌گذارد تناسب، متریال و مهارت صنعتگری وزن بیانی را بر دوش بکشند. هیچ‌چیز صرفاً برای تزئین نیست؛ هر خطی وجود دارد، زیرا جایگاهش را در ترکیب به دست آورده است."
      ),
      p2: loc(
        "Sisma, the table at the centre of the collection, stems from the harmonious visual interplay between concave and convex. Its sculpted base appears to twist as the viewer moves around it, revealing new profiles from every angle, while the top — available in marble, wood or crystal — floats above with surprising lightness. It is a table of great versatility, equally at home in a dining room or a formal lounge.",
        "سیزما، میزِ مرکز این کلکسیون، از هم‌آمیزی بصری هماهنگ میان مقعر و محدب سرچشمه می‌گیرد. پایه‌ی مجسمه‌وار آن به نظر می‌رسد با حرکت بیننده می‌پیچد و از هر زاویه نیمرخ تازه‌ای آشکار می‌کند، در حالی که رویه — در دسترس در مرمر، چوب یا کریستال — با سبکی شگفت‌انگیز در بالا شناور است. این میزی با انعطاف‌پذیری بسیار است که هم در اتاق غذاخوری و هم در لابی رسمی در خانه است."
      ),
      p3: loc(
        "The supporting pieces extend the same vocabulary: console tables with monolithic bases, seating with precise tailored upholstery, and storage units whose surfaces are finished by hand. Together they form an environment in which time seems suspended, where the quality of the materials deepens rather than fades with use.",
        "قطعات مکمل همین واژگان بصری را گسترش می‌دهند: میزهای کنسول با پایه‌های یکپارچه، نشیمن‌ها با روکش دقیق خیاطی‌شده و واحدهای ذخیره‌سازی که سطوحشان با دست پرداخت می‌شود. آن‌ها با هم محیطی را می‌سازند که در آن زمان گویی متوقف شده است؛ جایی که کیفیت متریال‌ها با استفاده عمیق‌تر می‌شود نه کمرنگ‌تر."
      ),
    },
  },
  {
    slug: "home-collection",
    id: "home-collection",
    name: loc("Home Collection", "کلکسیون خانه"),
    year: "2026",
    image:
      "https://www.henge07.com/app/uploads/2026/04/henge-home-collection-2026-001.jpg",
    description: {
      p1: loc(
        "The Home Collection extends the Henge language into the most intimate rituals of daily living. It is a curated selection of objects for refined living, from wine glass sets and decanters to whisky sets, tableware, cutlery and an exclusive home fragrance. Each item is designed to bring the same material rigour found in the furniture to the smallest gestures of hospitality.",
        "کلکسیون خانه، زبان هنژ را به صمیمی‌ترین آیین‌های زندگی روزمره گسترش می‌دهد. این مجموعه‌ای منتخب از اشیا برای زندگی‌ای شیک است؛ از ست لیوان‌های شراب و دکانترها تا ست ویسکی، ظروف غذاخوری، کارد و چنگال و یک عطر خانگی اختصاصی. هر قلم به‌گونه‌ای طراحی شده است که همان دقت مادی موجود در مبلمان را به کوچک‌ترین حرکات مهمان‌نوازی بیاورد."
      ),
      p2: loc(
        "The objects are realised in partnership with master artisans: crystal is shaped and polished to catch the light, metals are burnished to a deep warm glow, and porcelain is glazed in tones drawn from the brand's mineral palette. The detailing is deliberately restrained, allowing texture and weight to communicate quality the moment an object is held in the hand.",
        "این اشیا با همکاری صنعتگران استاد ساخته می‌شوند: کریستال شکل داده و پرداخت می‌شود تا نور را بگیرد، فلزات به درخششی گرم و عمیق جلا می‌یابند و چینی با تُن‌هایی برخاسته از پالت معدنی برند لعاب می‌خورد. جزئیات عامدانه خودداری‌شده است تا بافت و وزن، همان لحظه که شیء در دست گرفته می‌شود، کیفیت را منتقل کنند."
      ),
      p3: loc(
        "Presented in a dedicated packaging programme, the collection is conceived both as personal indulgence and as gift. Whether setting a table, serving a drink or scenting a room, these pieces transform everyday routines into small ceremonies — the quiet rituals that give a home its character and its sense of occasion.",
        "این کلکسیون در یک برنامه بسته‌بندی اختصاصی ارائه می‌شود و هم به‌عنوان لذت شخصی و هم به‌عنوان هدیه طراحی شده است. خواه چیدن سفره، خواه سرو یک نوشیدنی یا معطر کردن یک اتاق، این قطعات روتین‌های روزمره را به آیین‌های کوچکی بدل می‌کنند — همان آیین‌های آرامی که به خانه شخصیت و حس موقعیت می‌بخشند."
      ),
    },
  },
  {
    slug: "stone",
    id: "stone",
    name: loc("Stone", "استون"),
    year: "2024",
    image: "https://www.henge07.com/app/uploads/2022/06/he1408m-400x400.jpg",
    description: {
      p1: loc(
        "Stone is a collection of sculptural pieces in precious material, showcasing the natural beauty of stone in its purest form. Each block is selected by hand at the quarry, chosen for its veining, tonality and inner light, so that no two finished pieces are ever alike. The material is not treated as a surface but as the very subject of the design.",
        "استون کلکسیونی از قطعات مجسمه‌وار با متریال گران‌بهاست که زیبایی طبیعی سنگ را در خالص‌ترین شکلش به نمایش می‌گذارد. هر بلوک با دست در معدن انتخاب می‌شود و برای رگه‌ها، تُنالیته و نور درونی‌اش برگزیده می‌شود تا هیچ دو قطعه‌ی تمام‌شده‌ای هرگز همانند یکدیگر نباشند. متریال نه به‌عنوان یک سطح، بلکه به‌مثابه خودِ موضوع طراحی در نظر گرفته می‌شود."
      ),
      p2: loc(
        "The working process alternates between advanced precision machining and traditional hand finishing. Edges are softened to a velvety touch, surfaces are honed to a matte depth or polished to a mirror sheen, and the natural veins are oriented so that the stone appears to flow across the volume. The geometry remains essential — monoliths, discs and inclined planes — letting the material speak without interruption.",
        "فرآیند کار میان ماشین‌کاری پیشرفته با دقت بالا و پرداخت دستی سنتی در نوسان است. لبه‌ها تا لمس مخملی نرم می‌شوند، سطوح تا عمقی مات صیقلی یا تا درخششی آیینه‌ای پرداخت می‌شوند و رگه‌های طبیعی چنان جهت‌گیری می‌شوند که سنگ گویی بر حجم جاری است. هندسه ضروری می‌ماند — یکپارچه‌ها، دیسک‌ها و سطوح شیب‌دار — و می‌گذارد متریال بدون وقفه سخن بگوید."
      ),
      p3: loc(
        "Used as sculptural tables, benches and objects, these pieces behave like fragments of landscape brought indoors. They anchor a space with geological presence, and as they age they develop a patina that records the life of the room around them, becoming heirlooms that carry memory in their surfaces.",
        "این قطعات که به‌عنوان میزهای مجسمه‌وار، نیمکت‌ها و اشیا به کار می‌روند، همچون تکه‌هایی از چشم‌انداز به داخل خانه آورده شده‌اند. آن‌ها فضا را با حضوری زمین‌شناسانه لنگر می‌اندازند و با گذر زمان پتینه‌ای می‌سازند که زندگی اتاق پیرامونشان را ثبت می‌کند و به میراث‌هایی بدل می‌شوند که خاطره را در سطوح خود حمل می‌کنند."
      ),
    },
  },
  {
    slug: "signature",
    id: "signature",
    name: loc("Signature", "سیگنچر"),
    year: "2023",
    image:
      "https://www.henge07.com/app/uploads/2021/09/henge-071020-h17929-400x400.jpg",
    description: {
      p1: loc(
        "Signature gathers the pieces that embody the brand's material research and sophisticated approach — the icons that define its identity. Each one distils years of experimentation with finishes, structures and assembly techniques into a form so resolved that it has become a reference point for the entire catalogue.",
        "سیگنچر قطعاتی را گرد هم می‌آورد که پژوهش مادی و رویکرد پیچیده‌ی برند را تجسم می‌بخشند — همان نمادهایی که هویت آن را تعریف می‌کنند. هر یک سال‌ها آزمایش با پرداخت‌ها، سازه‌ها و فنون مونتاژ را در قالبی چنان تثبیت‌شده تقطیر می‌کند که به نقطه‌ی مرجعی برای کل کاتالوگ بدل شده است."
      ),
      p2: loc(
        "The collection celebrates contrast as a design method: warm woods against cold metals, transparent glass against opaque stone, soft upholstery against hard edges. These oppositions are balanced with such control that the result never feels decorative; instead each pairing reveals something new about the materials themselves and the hand that shaped them.",
        "این کلکسیون کنتراست را به‌عنوان روشی در طراحی می‌ستاید: چوب‌های گرم در برابر فلزات سرد، شیشه‌ی شفاف در برابر سنگ مات، روکش نرم در برابر لبه‌های سخت. این تقابل‌ها با چنان مهارتی متوازن می‌شوند که نتیجه هرگز تزئینی به نظر نمی‌رسد؛ در عوض هر جفت‌شدگی چیزی تازه درباره‌ی خود متریال‌ها و دستی که آن‌ها را شکل داده آشکار می‌کند."
      ),
      p3: loc(
        "More than a product line, Signature is a portrait of the brand's evolution. The pieces have been refined season after season, responding to new architectural contexts and new ways of living while preserving the recognisable character that made them icons. They are the pieces through which the collection's philosophy is most clearly expressed.",
        "سیگنچر فراتر از یک خط تولید، پرتره‌ای از تکامل برند است. این قطعات فصل‌به‌فصل پالایش شده‌اند و به بسترهای معماری تازه و شیوه‌های جدید زندگی پاسخ می‌دهند و در عین حال آن شخصیت شناخته‌شده را که آن‌ها را به نماد تبدیل کرده حفظ می‌کنند. آن‌ها همان قطعاتی هستند که فلسفه‌ی کلکسیون به‌واسطه‌ی آن‌ها با وضوح هرچه بیشتر بیان می‌شود."
      ),
    },
  },
  {
    slug: "experimental",
    id: "experimental",
    name: loc("Experimental", "اکسپریمنتال"),
    year: "2022",
    image:
      "https://www.henge07.com/app/uploads/2021/10/h-15032129575_COVER_def1-400x400.jpg",
    description: {
      p1: loc(
        "Experimental is the laboratory of the collection: pieces born from the brand's ongoing exploration of form and material, where the rules of the catalogue are deliberately bent. Prototypes, limited series and one-off works share this space, unified by curiosity rather than by a formal programme.",
        "اکسپریمنتال آزمایشگاه کلکسیون است: قطعاتی که از کاوشِ پیوسته‌ی برند در فرم و متریال زاده می‌شوند، جایی که قواعد کاتالوگ عامدانه خم می‌شوند. نمونه‌های اولیه، مجموعه‌های محدود و آثار تک‌قطعه این فضا را شریک می‌شوند و به‌جای برنامه‌ای رسمی، با کنجکاوی پیوند خورده‌اند."
      ),
      p2: loc(
        "Here traditional crafts meet unconventional techniques. Cast resins are combined with hand-carved stone, textile structures are stretched over improbable frames, and finishes are tested to their limits in search of textures that have no name yet. Failures are treated as findings, and many details that later appear in the main collections were first discovered in these studies.",
        "اینجا صنایع‌دستی سنتی با فنون نامتعارف روبه‌رو می‌شوند. رزین‌های ریخته‌گری با سنگ دست‌تراش ترکیب می‌شوند، ساختارهای نساجی بر قاب‌های بعید کشیده می‌شوند و پرداخت‌ها تا مرز خود در جست‌وجوی بافت‌هایی آزموده می‌شوند که هنوز نامی ندارند. شکست‌ها همچون یافته‌ها تلقی می‌شوند و بسیاری از جزئیاتی که بعدها در کلکسیون‌های اصلی ظاهر می‌شوند، نخست در همین مطالعات کشف شده‌اند."
      ),
      p3: loc(
        "The pieces are presented as open questions rather than finished answers. Collectors and architects are invited to work with them, adapting dimensions, materials and configurations to specific projects. In this way Experimental remains a living territory — a place where the future of the collection is continuously rehearsed.",
        "این قطعات به‌عنوان پرسش‌های باز ارائه می‌شوند نه پاسخ‌های تمام‌شده. از کلکسیونرها و معماران دعوت می‌شود با آن‌ها کار کنند و ابعاد، متریال‌ها و پیکربندی‌ها را با پروژه‌های خاص سازگار کنند. از این رو اکسپریمنتال قلمرویی زنده باقی می‌ماند — جایی که آینده‌ی کلکسیون پیوسته تمرین می‌شود."
      ),
    },
  },
];
