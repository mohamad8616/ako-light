import { writeFileSync } from "node:fs";

const path = "lib/i18n/translations/admin.ts";
const src = readFileSync(path, "utf8");

const enChunk = src.slice(src.indexOf("adminEn = {"), src.indexOf("} as const;"));
const faChunk = src.slice(src.indexOf("adminFa = {"));

// Tolerant line scanner: captures "key": value (value may be on the next line).
function parse(block) {
  const lines = block.split("\n");
  const out = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)"(admin\.[A-Za-z0-9_.\-]+)":\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const key = m[2];
    let rest = m[3].trim();
    if (!rest) {
      // value is on following line(s): collect until we have a closing quote+comma
      let j = i + 1;
      let acc = "";
      while (j < lines.length) {
        acc += (" " + lines[j].trim()).trimStart();
        j++;
        if (/"[,]?\s*$/.test(acc) || (acc.includes('"') && acc.trim().endsWith(","))) break;
      }
      rest = acc;
    }
    // extract the quoted string value
    const vm = rest.match(/^"([\s\S]*?)"\s*,?\s*$/);
    if (vm) out.set(key, vm[1]);
  }
  return out;
}

const en = parse(enChunk);
const fa = parse(faChunk);

// Persisan fill-ins for the keys that exist in en but not yet in fa.
const persian = {
  "admin.collection.field.year": "سال",
  "admin.collection.field.description": "توضیحات",
  "admin.collection.field.descriptionP1": "پاراگراف ۱",
  "admin.collection.field.descriptionP2": "پاراگراف ۲",
  "admin.collection.field.descriptionP3": "پاراگراف ۳",
  "admin.collection.field.descriptionHint":
    "سه پاراگرافی که صفحه کلکسیون نمایش می‌دهد.",
  "admin.designer.field.image": "تصویر",
  "admin.designer.field.website": "وب‌سایت",
  "admin.designer.field.bio": "بیوگرافی",
  "admin.designer.field.bioHint": "پاراگراف‌های بیوگرافی، هر کدام در یک خط",
  "admin.designer.field.products": "محصولات",
  "admin.material.field.category": "دسته‌بندی",
  "admin.material.field.type": "نوع",
  "admin.material.field.description": "توضیحات",
};

for (const k of en.keys()) {
  if (!fa.has(k)) fa.set(k, persian[k] || en.get(k) || "");
}

const pad = (s) => s;

let out = "export const adminEn = {\n";
for (const [k, v] of en) out += `  "${k}": "${v}",\n`;
out += "} as const;\n\nexport const adminFa = {\n";
for (const k of en.keys()) out += `  "${k}": "${fa.get(k)}",\n`;
out += "} as const;\n";

writeFileSync(path, out);

const enKeys = [...new Set([...en.keys(), ...fa.keys()])];
console.log("written keys:", en.size, "fa:", fa.size);

