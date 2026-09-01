const fs = require("fs");
const p = "lib/i18n/translations.ts";
let s = fs.readFileSync(p, "utf8");

// Strip BOM
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);

// The en-section UI keys got duplicated into the fa section between
// footer.vat and newsletter.title1. Remove that en block from the fa section.

// Find the fa section's footer.vat
const faSectionStart = s.indexOf("fa: {");
const faFooterVat = s.indexOf('"footer.vat"', faSectionStart);

// Find newsletter.title1 AFTER the fa footer.vat
const newsTitle = s.indexOf('"newsletter.title1"', faFooterVat);

if (faFooterVat < 0 || newsTitle < 0) {
  console.log("Markers not found");
  console.log("faFooterVat:", faFooterVat, "newsTitle:", newsTitle);
  process.exit(1);
}

// Extract the block between footer.vat line and newsletter.title1
const blockStart = s.indexOf("\n", faFooterVat);
const block = s.substring(blockStart, newsTitle);

// Check if this block contains en translations
const hasEnKeys = block.includes('"Load More"') || block.includes("ui.sendRequest");

if (hasEnKeys) {
  // Find where the fa ui.loadMore starts (after footer.vat)
  // and remove everything from footer.vat newline to newsletter.title1
  // But we want to keep the fa footer.vat line itself
  s = s.substring(0, blockStart) + "\n" + s.substring(newsTitle);
  console.log("Removed en duplicate block from fa section");
} else {
  console.log("Block already clean or doesn't have en keys");
}

fs.writeFileSync(p, s, "utf8");
console.log("Done");
