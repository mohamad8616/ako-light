import { loc, type Localized } from "@/lib/i18n/localized";

export interface Designer {
  name: string;
  slug: string;
  image: string;
  bio: Localized[];
  website?: string;
}

export const designers: Designer[] = [
  {
    name: "Massimo Castagna",
    slug: "massimo-castagna",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Massimo+Castagna",
    website: "#",
    bio: [
      loc("Henge started working with the architect and designer Massimo Castagna, back in 2011, and collection after collection this cooperation continues to strengthen the unique identity of the brand.", "هنژ کار با معمار و طراح ماسیمو کاستانیا را از سال ۲۰۱۱ آغاز کرد و کلکسیون به کلکسیون، این همکاری همچنان به تقویت هویت منحصربه‌فرد برند ادامه می‌دهد."),
      loc("Born on 13 November 1957, he graduated in architecture in 1984 from Milan Politecnico; he began his professional activities in 1986, founding the studio AD Architettura. He has gained considerable professional experience in the field of architecture, residential and commercial buildings, upgrading and conservative restoration, hotels, interior design, art direction, and design in the furnishing sector, consultancy, projects, and the design supervision of furnishing point-of-sales.", "متولد ۱۳ نوامبر ۱۹۵۷، در سال ۱۹۸۴ در رشته معماری از پلی‌تکنیک میلان فارغ‌التحصیل شد؛ فعالیت حرفه‌ای خود را در سال ۱۹۸۶ با تأسیس استودیو AD Architettura آغاز کرد. او تجربه حرفه‌ای قابل‌توجهی در حوزه معماری، ساختمان‌های مسکونی و تجاری، بازسازی و مرمت بناهای تاریخی، هتل‌ها، طراحی داخلی، مدیریت هنری و طراحی در بخش مبلمان، مشاوره، پروژه‌ها و نظارت بر طراحی نقاط فروش مبلمان به دست آورده است."),
      loc("One of his major creations has been the “Piramide” laboratory for the Everest-K2-CNR scientific committee for the Italian National Research Council, which was built in Nepal in 1991 at an altitude of 5050 m., to be used as a high-altitude research laboratory, a project selected for the 18th Milan Triennale.", "یکی از آثار مهم او آزمایشگاه «پیرامیده» برای کمیته علمی اورست-ک۲-CNR شورای ملی تحقیقات ایتالیا است که در سال ۱۹۹۱ در نپال در ارتفاع ۵۰۵۰ متری ساخته شد تا به‌عنوان آزمایشگاه تحقیقاتی ارتفاع بالا مورد استفاده قرار گیرد؛ پروژه‌ای که برای هجدهمین تری‌اناله میلان انتخاب شد."),
    ],
  },
  {
    name: "Yabu Pushelberg",
    slug: "glenn-pushelberg-george-yabu",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Yabu+Pushelberg",
    website: "#",
    bio: [
      loc("Henge began its collaboration with Yabu Pushelberg in 2016, and the partnership has since grown into one of the brand's most enduring international creative relationships.", "هنژ همکاری خود را با یابو پوشلبرگ در سال ۲۰۱۶ آغاز کرد و این مشارکت از آن زمان به یکی از پایدارترین روابط خلاق بین‌المللی برند تبدیل شده است."),
      loc("Founded in Toronto in 1980 by George Yabu and Glenn Pushelberg, the studio built its reputation on hospitality, retail, and residential interiors that balance material richness with restrained, contemporary form. Both partners studied at Ryerson University before establishing the practice that would carry their name across five continents.", "این استودیو در سال ۱۹۸۰ توسط جورج یابو و گلن پوشلبرگ در تورنتو تأسیس شد و شهرت خود را بر پایه فضاهای داخلی هتل‌داری، خرده‌فروشی و مسکونی بنا نهاد؛ فضاهایی که غنای متریال را با فرمی محدود و معاصر در کنار هم قرار می‌دهند. هر دو شریک پیش از تأسیس مجموعه‌ای که نامشان را در پنج قاره همراهی می‌کند، در دانشگاه رایرسون تحصیل کردند."),
      loc("Among their most celebrated projects is the interior architecture for Bergdorf Goodman's Manhattan flagship, a body of work that helped define a generation of luxury retail design and earned the studio a permanent place among the field's most influential names.", "از شناخته‌شده‌ترین پروژه‌های آن‌ها می‌توان به معماری داخلی فروشگاه پرچم‌دار برگدورف گودمن در منهتن اشاره کرد؛ مجموعه‌ای از آثار که به تعریف نسلی از طراحی خرده‌فروشی لوکس کمک کرد و جایگاهی ماندگار برای استودیو در میان نام‌های تأثیرگذار این حوزه رقم زد."),
    ],
  },
  {
    name: "Isabella Genovese",
    slug: "isabella-genovese",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Isabella+Genovese",
    website: "#",
    bio: [
      loc("Isabella Genovese has been part of Henge since its founding in 2011, shaping the brand's product design language alongside Paolo Tormena from its very first collection.", "ایزابلا جنووزه از تأسیس هنژ در سال ۲۰۱۱ در کنار برند بوده و از نخستین کلکسیون، زبان طراحی محصول برند را در کنار پائولو تورمنا شکل داده است."),
      loc("Born on 13 January 1973, she studied at art school in Treviso before attending the IUAV University of Venice, graduating in 2000. Her early career was spent collaborating with architectural firms specialising in hospitality, retail, and exhibition design across northern Italy.", "متولد ۱۳ ژانویه ۱۹۷۳، در هنرستان هنرهای تجسمی ترویزو تحصیل کرد و سپس در دانشگاه IUAV ونیز ادامه داد و در سال ۲۰۰۰ فارغ‌التحصیل شد. سال‌های نخست دوران حرفه‌ای او با همکاری با دفاتر معماری متخصص در طراحی هتل‌داری، خرده‌فروشی و نمایشگاهی در شمال ایتالیا گذشت."),
      loc("She now leads Henge's design department, overseeing the layout of the brand's flagship showrooms and institutional spaces for its most important dealers worldwide, bringing a distinctive sensitivity to detail across every collection.", "او اکنون ریاست دپارتمان طراحی هنژ را بر عهده دارد و بر چیدمان شوروم‌های پرچم‌دار برند و فضاهای رسمی مهم‌ترین نمایندگانش در سراسر جهان نظارت می‌کند و حساسیت خاصی به جزئیات در هر کلکسیون می‌بخشد."),
    ],
  },
  {
    name: "Ugo Cacciatori",
    slug: "ugo-cacciatori",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Ugo+Cacciatori",
    website: "#",
    bio: [
      loc("Henge's collaboration with Ugo Cacciatori began in 2018, bringing his jewellery-making sensibility into a series of unmistakable objects that embrace the brand's material DNA.", "همکاری هنژ با اوگو کاچاتوری از سال ۲۰۱۸ آغاز شد و حس‌وحال جواهرسازی او را به مجموعه‌ای از اشیای بی‌همتا آورد که DNA متریال برند را در بر می‌گیرند."),
      loc("Born in Carrara in 1968, in the heart of Tuscany's marble-quarrying region, he trained as a goldsmith before founding his own atelier in 1995, working primarily in oxidised silver, bronze, and reclaimed stone.", "متولد ۱۹۶۸ در کارارا، در قلب منطقه معادن مرمر توسکانی، او به‌عنوان طلافروش آموزش دید و در سال ۱۹۹۵ آتلیه خود را بنیان نهاد؛ با تمرکز بر نقره اکسیدی، برنز و سنگ‌های بازیافتی."),
      loc("His breakthrough came with a collection of hand-forged accessories exhibited at Pitti Uomo, which established his signature language of rough, textured metalwork later adapted into furniture hardware and decorative objects for Henge.", "نقطه عطف او مجموعه‌ای از اکسسوری‌های دست‌ساز بود که در پیتتی اومو به نمایش درآمد و زبان امضای او - فلزکاری خام و بافت‌دار - را تثبیت کرد؛ زبانی که بعدها در سخت‌افزار مبلمان و اشیای تزئینی هنژ به کار گرفته شد."),
    ],
  },
  {
    name: "Johanna Grawunder",
    slug: "johanna-grawunder",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Johanna+Grawunder",
    website: "#",
    bio: [
      loc("Johanna Grawunder joined Henge's roster of creative partners in 2025, contributing an experimental approach to light and colour to the brand's most recent collection.", "جوهانا گراوندر در سال ۲۰۲۵ به فهرست شرکای خلاق هنژ پیوست و رویکردی آزمایشگرانه به نور و رنگ را به جدیدترین کلکسیون برند آورد."),
      loc("Born in San Francisco in 1961, she studied architecture at the University of California, Berkeley, before relocating to Milan in 1985 to work alongside Ettore Sottsass at Sottsass Associati, where she remained a partner for over a decade.", "متولد ۱۹۶۱ در سان‌فرانسیسکو، در رشته معماری در دانشگاه کالیفرنیا برکلی تحصیل کرد و در سال ۱۹۸۵ به میلان نقل مکان کرد تا در کنار اتوره سوتساس در سوتساس آسیوچاتی کار کند؛ جایی که بیش از یک دهه شریک مجموعه بود."),
      loc("Her large-scale light installation for the Cini Foundation in Venice remains one of her most widely exhibited works, cementing her reputation as one of the leading voices in architectural lighting design.", "نورپردازی بزرگ‌مقیاس او برای بنیاد چینی در ونیز یکی از پرنمایش‌ترین آثارش باقی مانده و جایگاه او را به‌عنوان یکی از صداهای پیشرو در طراحی نورپردازی معماری تثبیت کرده است."),
    ],
  },
  {
    name: "Tanju Özelgin",
    slug: "tanju-ozelgin",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Tanju+Özelgin",
    website: "#",
    bio: [
      loc("Tanju Özelgin began collaborating with Henge in 2025, bringing his refined minimalism and strong architectural influence to the brand's newest pieces.", "تانجو اوزلگین همکاری خود را با هنژ در سال ۲۰۲۵ آغاز کرد و مینیمالیسم ظریف و تأثیر معماری قدرتمند خود را به جدیدترین قطعات برند آورد."),
      loc("Born in Istanbul in 1970, he graduated in interior architecture from Mimar Sinan Fine Arts University before founding his eponymous studio in 1999, working across residential, hospitality, and yacht interior projects throughout the Mediterranean.", "متولد ۱۹۷۰ در استانبول، در رشته معماری داخلی از دانشگاه هنرهای زیبای معمار سینان فارغ‌التحصیل شد و در سال ۱۹۹۹ استودیوی هم‌نام خود را بنیان نهاد؛ با پروژه‌های مسکونی، هتل‌داری و طراحی داخلی قایق در سراسر مدیترانه."),
      loc("His design for a private residence overlooking the Bosphorus was widely published and remains a reference point for his pared-back, material-driven approach to contemporary interiors.", "طراحی او برای اقامتگاهی خصوصی با چشم‌انداز بسفر بازنشر گسترده‌ای یافت و همچنان نقطه ارجاعی برای رویکرد خلاصه‌شده و متریال‌محور او در فضاهای داخلی معاصر است."),
    ],
  },
  {
    name: "Davide Nascimbeni",
    slug: "davide-nascimbeni",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Davide+Nascimbeni",
    website: "#",
    bio: [
      loc("Davide Nascimbeni has collaborated with Henge since 2013, lending his mastery of Murano glassworking traditions to several of the brand's lighting collections.", "داویده ناسیمبنی از سال ۲۰۱۳ با هنژ همکاری کرده و تسلط خود بر سنت‌های شیشه‌گری مورانو را به چندین کلکسیون نورپردازی برند بخشیده است."),
      loc("Born in Venice in 1965 into a family of glassmakers, he began working in the furnaces of Murano at the age of sixteen, later founding his own workshop in 1994 dedicated to blending traditional techniques with contemporary form.", "متولد ۱۹۶۵ در ونیز در خانواده‌ای شیشه‌گر، او در شانزده‌سالگی کار در کوره‌های مورانو را آغاز کرد و بعدها در سال ۱۹۹۴ کارگاه خود را با هدف ترکیب تکنیک‌های سنتی با فرم معاصر بنیان نهاد."),
      loc("His glass sculptures have been exhibited at the Venice Biennale, and his workshop continues to produce hand-blown pieces using methods passed down through four generations of glassmakers.", "مجسمه‌های شیشه‌ای او در دوسالانه ونیز به نمایش درآمده‌اند و کارگاه او همچنان با روش‌هایی که از چهار نسل شیشه‌گر به ارث رسیده، قطعات دمیده‌شده با دست تولید می‌کند."),
    ],
  },
  {
    name: "Hilla Havkin",
    slug: "hilla-havkin",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Hilla+Havkin",
    website: "#",
    bio: [
      loc("Hilla Havkin has worked with Henge since 2020, bringing a sculptural, material-focused perspective to a series of limited-edition objects for the brand.", "هیلا هاوکین از سال ۲۰۲۰ با هنژ کار می‌کند و نگاه مجسمه‌وار و متریال‌محور خود را به مجموعه‌ای از اشیای منتشرشده در تیراژ محدود برند آورده است."),
      loc("Born in Tel Aviv in 1984, she studied industrial design at the Bezalel Academy of Arts and Design before founding her own studio in 2011, focused on experimental furniture and objects made from unconventional materials.", "متولد ۱۹۸۴ در تل‌آویو، در رشته طراحی صنعتی در آکادمی هنر و طراحی بتزالل تحصیل کرد و در سال ۲۰۱۱ استودیوی خود را با تمرکز بر مبلمان و اشیای تجربی ساخته‌شده از متریال‌های غیرمتعارف بنیان نهاد."),
      loc("Her ongoing research into recycled textiles and stone composites was featured at the London Design Festival, establishing her as a distinctive voice in sustainable material innovation.", "پژوهش مستمر او در زمینه منسوجات بازیافتی و کامپوزیت‌های سنگی در جشنواره طراحی لندن به نمایش درآمد و او را به صدایی متمایز در نوآوری متریال پایدار تبدیل کرد."),
    ],
  },
  {
    name: "Stephen Tierney",
    slug: "stephen-tierney",
    image: "https://dummyimage.com/900x1000/e2e8f0/334155&text=Stephen+Tierney",
    website: "#",
    bio: [
      loc("Stephen Tierney has partnered with Henge since 2019, applying his hospitality design expertise to several of the brand's flagship showroom concepts.", "استیون تیرنی از سال ۲۰۱۹ با هنژ همکاری می‌کند و تخصص خود در طراحی هتل‌داری را به چندین مفهوم شوروم پرچم‌دار برند اعمال کرده است."),
      loc("Born in Dublin in 1972, he trained in architecture at University College Dublin before joining a London-based hospitality design practice in 1998, later founding his own studio in 2008 focused on hotel and restaurant interiors.", "متولد ۱۹۷۲ در دوبلین، در رشته معماری در کالج دانشگاهی دوبلین آموزش دید و در سال ۱۹۹۸ به یک مجموعه طراحی هتل‌داری مستقر در لندن پیوست؛ بعدها در سال ۲۰۰۸ استودیوی خود را با تمرکز بر فضاهای داخلی هتل و رستوران بنیان نهاد."),
      loc("His interior design for a boutique hotel in the Amalfi Coast received wide critical acclaim, known for its restrained palette and careful integration of local craft traditions into a contemporary setting.", "طراحی داخلی او برای یک هتل بوتیک در سواحل آمالفی تحسین گسترده منتقدان را برانگیخت؛ با پالت محدود و تلفیق دقیق سنت‌های صنایع‌دستی محلی در بستری معاصر."),
    ],
  },
];
