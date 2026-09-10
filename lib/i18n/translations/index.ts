import { navigationEn, navigationFa } from "./navigation";
import { commonEn, commonFa } from "./common";
import { homeEn, homeFa } from "./home";
import { aboutEn, aboutFa } from "./about";
import { productsEn, productsFa } from "./products";
import { productEn, productFa } from "./product";
import { cartEn, cartFa } from "./cart";
import { collectionsEn, collectionsFa } from "./collections";
import { flagshipEn, flagshipFa } from "./flagship";
import { materialsEn, materialsFa } from "./materials";
import { s34En, s34Fa } from "./s34";
import { formsEn, formsFa } from "./forms";
import { searchEn, searchFa } from "./search";
import { projectsEn, projectsFa } from "./projects";
import { pagesEn, pagesFa } from "./pages";

// Combined per-language dictionaries. Key order follows module order below;
// lookups are by key so order has no runtime effect.
export const en = {
  ...navigationEn,
  ...commonEn,
  ...homeEn,
  ...aboutEn,
  ...productsEn,
  ...productEn,
  ...cartEn,
  ...collectionsEn,
  ...flagshipEn,
  ...materialsEn,
  ...s34En,
  ...formsEn,
  ...searchEn,
  ...projectsEn,
  ...pagesEn,
} as const;

export const fa = {
  ...navigationFa,
  ...commonFa,
  ...homeFa,
  ...aboutFa,
  ...productsFa,
  ...productFa,
  ...cartFa,
  ...collectionsFa,
  ...flagshipFa,
  ...materialsFa,
  ...s34Fa,
  ...formsFa,
  ...searchFa,
  ...projectsFa,
  ...pagesFa,
} as const;
