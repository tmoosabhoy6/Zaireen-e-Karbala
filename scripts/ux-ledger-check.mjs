// Fails unless every code in UX-CHANGELOG.md ([I1]..[I153], [F1]..[F53]) is marked in the source.
import { readFileSync, readdirSync } from "node:fs";
const ledger = readFileSync("UX-CHANGELOG.md", "utf8");
const codes = [...ledger.matchAll(/`\[([IF]\d+)\]`/g)].map((m) => m[1]);
const files = [...readdirSync("src").map((f) => `src/${f}`), "index.html", "public/manifest.webmanifest"];
const source = files.map((f) => readFileSync(f, "utf8")).join("\n");
const missing = codes.filter((c) => !source.includes(`[${c}]`));
const dup = codes.filter((c, i) => codes.indexOf(c) !== i);
const count = (p) => codes.filter((c) => c.startsWith(p)).length;
console.log(`ledger: ${count("I")} improvements, ${count("F")} faults; missing from source: ${missing.length}; duplicate codes: ${dup.length}`);
if (missing.length || dup.length) { console.error("missing:", missing.join(" "), "dup:", dup.join(" ")); process.exit(1); }
if (!JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")).shortcuts?.length) { console.error("manifest shortcuts missing"); process.exit(1); }
