import { readFileSync } from "node:fs";
const p = "lib/i18n/translations/admin.ts";
const s = readFileSync(p, "utf8");
const re = /'(admin\.[a-z0-9_.-]+)'/g;
const en = new Set();
const fa = new Set();
let m;
const [enBlock, faBlock] = s.split(/export const adminFa = \{/);
enBlock.split("\n").forEach((l) => {
  while ((m = re.exec(l))) en.add(m[1]);
});
faBlock.split("\n").forEach((l) => {
  while ((m = re.exec(l))) fa.add(m[1]);
});
console.log("en", en.size, "fa", fa.size);
const onlyEn = [...en].filter((k) => !fa.has(k)).sort();
const onlyFa = [...fa].filter((k) => !en.has(k)).sort();
console.log("only-en", JSON.stringify(onlyEn));
console.log("only-fa", JSON.stringify(onlyFa));
console.log("en=f", en.size === fa.size);
