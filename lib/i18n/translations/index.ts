import { aboutEn, aboutFa } from "./about";
import { authEn, authFa } from "./auth";
import { cartEn, cartFa } from "./cart";
import { collectionsEn, collectionsFa } from "./collections";
import { commonEn, commonFa } from "./common";
import { flagshipEn, flagshipFa } from "./flagship";
import { formsEn, formsFa } from "./forms";
import { homeEn, homeFa } from "./home";
import { materialsEn, materialsFa } from "./materials";
import { navigationEn, navigationFa } from "./navigation";
import { pagesEn, pagesFa } from "./pages";
import { productEn, productFa } from "./product";
import { productsEn, productsFa } from "./products";
import { projectsEn, projectsFa } from "./projects";
import { s34En, s34Fa } from "./s34";
import { searchEn, searchFa } from "./search";

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
  ...authEn,
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
  ...authFa,
} as const;
