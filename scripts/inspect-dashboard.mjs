import { readFileSync } from "node:fs";

const f = process.argv[2];
const c = readFileSync(f, "utf8");

// main navigation: look for onclick="show(...)" or tab switching
const onclicks = [...new Set([...c.matchAll(/onclick="([^"]{1,60})"/g)].map((m) => m[1]))];
console.log("=== ONCLICK handlers ===");
console.log(onclicks.join("\n"));

// look for TABS array or tab list definition
const tabsArr = c.match(/var\s+TABS\s*=\s*\[([^\]]+)\]/);
if (tabsArr) console.log("\n=== TABS ARRAY ===\n" + tabsArr[1]);

const navMatch = c.match(/<nav[\s\S]{0,3000}?<\/nav>/);
if (navMatch) console.log("\n=== NAV ===\n" + navMatch[0].slice(0, 2500));
