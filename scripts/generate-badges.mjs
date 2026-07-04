// Generates every achievement badge SVG into public/badges/<key>.svg from the
// catalog. Run with: npm run badges  (uses tsx to import the .ts catalog).
//
// The badges are a generated artifact — edit scripts/badges/{glyphs,render}.mjs
// and re-run, don't hand-edit the SVGs.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ACHIEVEMENTS } from "../src/lib/achievements/catalog.ts";
import { renderBadge } from "./badges/render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "badges");
mkdirSync(outDir, { recursive: true });

// Which groups have more than one tier (so we know when to stamp a numeral).
const tierCounts = new Map();
for (const a of ACHIEVEMENTS) tierCounts.set(a.group, (tierCounts.get(a.group) ?? 0) + 1);
const tieredGroups = new Set([...tierCounts].filter(([, n]) => n > 1).map(([g]) => g));

let n = 0;
for (const def of ACHIEVEMENTS) {
  const svg = renderBadge(def, tieredGroups);
  writeFileSync(join(outDir, `${def.key}.svg`), svg);
  n++;
}

console.log(`Generated ${n} badge SVGs → public/badges/`);
