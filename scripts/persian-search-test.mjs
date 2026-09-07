// Standalone test replicating SearchResults' normalise/condense/match logic,
// including the product <-> designer cross-referencing.
function normalise(s) {
  return s
    .toLowerCase()
    .replace(/[ىي]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u200c\u200e\u200f\ufeff]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function condense(s) {
  return s.replace(/\s+/g, "");
}

// ---------------------------------------------------------------------------
// Mini dataset mirroring lib/data + translations.fa
// ---------------------------------------------------------------------------
const designerData = [
  { name: "Massimo Castagna", nameFa: "ماسیمو کاستانیا", slug: "massimo-castagna" },
  { name: "Yabu Pushelberg", nameFa: "یابو پوشلبرگ", slug: "yabu-pushelberg" },
];
const productData = [
  { name: "Pendant Light", faName: "لامپ آویز", slug: "pendant-light", category: "lighting", designerName: "Massimo Castagna" },
  { name: "Diapason", faName: "دیاپازون", slug: "diapason", category: "lighting", designerName: "Massimo Castagna" },
  { name: "Low Table", faName: "میز کم‌ارتفاع", slug: "low-table", category: "tables", designerName: "Yabu Pushelberg" },
];

// ---------------------------------------------------------------------------
// Index build — mirrors SearchResults.tsx
// ---------------------------------------------------------------------------
const designerByKey = new Map();
for (const d of designerData) {
  const entry = { slug: d.slug, name: d.name, nameFa: d.nameFa };
  designerByKey.set(normalise(d.name), entry);
  designerByKey.set(normalise(d.nameFa), entry);
}
const productTextByDesigner = new Map();
for (const p of productData) {
  const designer = designerByKey.get(normalise(p.designerName));
  if (!designer) continue;
  const texts = productTextByDesigner.get(designer.slug) ?? [];
  texts.push(p.name, p.faName);
  productTextByDesigner.set(designer.slug, texts);
}
const products = productData.map((p) => {
  const designer = designerByKey.get(normalise(p.designerName));
  const haystack = normalise(
    [p.name, p.faName, p.slug, p.category, p.designerName, designer?.nameFa ?? ""].join(" "),
  );
  return { haystack, condensed: condense(haystack) };
});
const designers = designerData.map((d) => {
  const haystack = normalise(
    [d.name, d.nameFa, d.slug, ...(productTextByDesigner.get(d.slug) ?? [])].join(" "),
  );
  return { haystack, condensed: condense(haystack) };
});

// ---------------------------------------------------------------------------
// Cases: [query, expectedProductMatches, expectedDesignerMatches]
// ---------------------------------------------------------------------------
const cases = [
  // Cross-referencing: designer query -> designer + their products
  ["ماسیمو کاستانیا", 2, 1], // both his products + designer card
  ["کاستانیا", 2, 1],
  ["Massimo Castagna", 2, 1],
  // Cross-referencing: product query -> product + its designer
  ["دیاپازون", 1, 1], // Diapason + Massimo
  ["لامپ آویز", 1, 1], // Pendant Light + Massimo
  // Product with no designer overlap for other query terms
  ["میز کم ارتفاع", 1, 1], // Low Table + Yabu
  // Designer with no product-name match
  ["یابو پوشلبرگ", 1, 1], // Yabu + his Low Table
  // Unrelated
  ["نچیز", 0, 0],
];

let failures = 0;
for (const [query, expectedP, expectedD] of cases) {
  const needle = normalise(query);
  const needleCondensed = condense(needle);
  const matches = (r) =>
    r.haystack.includes(needle) ||
    (needleCondensed.length > 0 && r.condensed.includes(needleCondensed));
  const pCount = products.filter(matches).length;
  const dCount = designers.filter(matches).length;
  const ok = pCount === expectedP && dCount === expectedD;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  "${query}" -> products: ${pCount}/${expectedP}, designers: ${dCount}/${expectedD}`,
  );
}
console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
