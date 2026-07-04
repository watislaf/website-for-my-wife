// Composes one 128×128 medal SVG for an achievement definition.
//
// Design goals: DRASTIC variability across the wall of badges, while keeping a
// premium minted-medal craft. Three axes of variation:
//   1. Silhouette per CATEGORY — shield / hexagon / sunburst / tablet / scallop
//      seal / cut-gem. The set never reads as "one coin, many stickers".
//   2. Metal per TIER — bronze → silver → gold → platinum (milestones rose-gold).
//   3. Structural grandeur per TIER — plain at I, side gems at II, laurel sprigs
//      at III, a full radiant starburst + gem crown at IV. Climbing reshapes the
//      badge, it doesn't just recolour it.
// Plus: category-hued enamel, a procedural guilloché rosette engraved inside,
// a faceted set-gem, a top sheen, and a tier ribbon / milestone star.

import { glyphFor } from "./glyphs.mjs";

const ROMAN = ["I", "II", "III", "IV", "V"];

// Metal palettes (top→bottom). Tier 1..4 → bronze, silver, gold, platinum.
// Distinct metals — one signature material per category (base = tier III).
const MATERIALS = {
  steel: { ring: ["#eef4fa", "#c2cedd", "#8b98ac", "#5a6579", "#333c4c"], glyph: ["#f4f9fd", "#aab7c9"], stroke: "#2b3340", label: "#232a36" },
  gold: { ring: ["#fff3c4", "#f4cd5b", "#d29a24", "#9c6a14", "#5e3f0a"], glyph: ["#fff6d8", "#e3ab2f"], stroke: "#4a3208", label: "#4a3208" },
  red: { ring: ["#ffd9d2", "#f2705c", "#cf3b2e", "#951f1c", "#560f0e"], glyph: ["#ffe0d6", "#e56052"], stroke: "#4a1210", label: "#4a1210" },
  amethyst: { ring: ["#f2e8ff", "#c9a6f2", "#9a63d8", "#6d38a8", "#412069"], glyph: ["#f3e9ff", "#bb8fe8"], stroke: "#361c58", label: "#33195a" },
  platinum: { ring: ["#ffffff", "#e7edf6", "#c4ceda", "#98a3b6", "#69738a"], glyph: ["#ffffff", "#d4dce8"], stroke: "#3a4252", label: "#2c3442" },
  rosegold: { ring: ["#ffe6ea", "#f6b1bf", "#e0798f", "#b1546c", "#78313f"], glyph: ["#ffe1e7", "#e08897"], stroke: "#5e2634", label: "#5e2634" },
};

// Adjust a hex colour's brightness by factor f (clamped 0..255).
function scaleHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = cl((n >> 16) & 255), g = cl((n >> 8) & 255), b = cl(n & 255);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Metal for a badge: the category's material, shaded by tier (I darker → IV
// brighter/polished). Single-tier milestones sit near full brightness.
function metalFor(def, isTiered) {
  const mat = MATERIALS[CATEGORY[def.category].material];
  const shadeTier = isTiered ? Math.min(def.tier, 4) : 3;
  const f = [0.8, 0.9, 1.0, 1.1][shadeTier - 1];
  return {
    ring: mat.ring.map((c) => scaleHex(c, f)),
    glyph: mat.glyph.map((c) => scaleHex(c, f)),
    stroke: mat.stroke,
    label: mat.label,
  };
}

// Category → metal + enamel radial (centre→edge) + set-gem hue + interior
// pattern + silhouette. Each category gets its own material, colour AND texture.
const CATEGORY = {
  work: { material: "steel", enamel: ["#33468f", "#1c2a5e", "#0b1230"], hue: 224, shape: "shield", pattern: "rosette" },
  earnings: { material: "gold", enamel: ["#12734f", "#0d4a34", "#041c12"], hue: 150, shape: "hex", pattern: "rings" },
  consistency: { material: "red", enamel: ["#5a1e0c", "#341107", "#160603"], hue: 28, shape: "burst", pattern: "rays" },
  planner: { material: "amethyst", enamel: ["#4a2570", "#2f1650", "#160a2c"], hue: 285, shape: "tablet", pattern: "grid" },
  audience: { material: "platinum", enamel: ["#0e6a6a", "#0a4444", "#031f1f"], hue: 180, shape: "scallop", pattern: "waves" },
  milestones: { material: "rosegold", enamel: ["#7a2044", "#511530", "#240a18"], hue: 335, shape: "gem", pattern: "stars" },
};

const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;

// ── Silhouette geometry ─────────────────────────────────────────────────────
// Each returns { d, cx, cy, R, glyphScale, chipY, topGemY } where `d` is the
// outer metal path, R the top-rim radius (for placing ornaments), and chipY the
// baseline for the tier ribbon.
function shape(kind) {
  const cx = 64;
  switch (kind) {
    case "shield": {
      const cy = 66;
      return {
        d: "M64 6 L112 24 V62 C112 92 90 114 64 122 C38 114 16 92 16 62 V24 Z",
        cx, cy, R: 60, glyphScale: 1.45, chipY: 100, topGemY: 12,
      };
    }
    case "hex": {
      const cy = 64;
      return { d: poly(cx, cy, 60, 6, -Math.PI / 2), cx, cy, R: 60, glyphScale: 1.5, chipY: 100, topGemY: 8 };
    }
    case "tablet": {
      const cy = 64;
      return { d: roundRect(16, 16, 96, 96, 24), cx, cy, R: 50, glyphScale: 1.55, chipY: 100, topGemY: 14 };
    }
    case "burst": {
      const cy = 64;
      // A gentle sun: shallow, rounded rays rather than aggressive spikes.
      return { d: starPath(cx, cy, 60, 53, 20), cx, cy, R: 53, glyphScale: 1.5, chipY: 101, topGemY: 6 };
    }
    case "scallop": {
      const cy = 64;
      return { d: scallopPath(cx, cy, 52, 12), cx, cy, R: 60, glyphScale: 1.5, chipY: 101, topGemY: 6 };
    }
    case "gem": {
      const cy = 64;
      return { d: "M64 8 L104 44 L88 108 L40 108 L24 44 Z", cx, cy: 62, R: 56, glyphScale: 1.4, chipY: 100, topGemY: 12 };
    }
    default: {
      const cy = 64;
      return { d: circlePath(cx, cy, 62), cx, cy, R: 62, glyphScale: 1.55, chipY: 100, topGemY: 8 };
    }
  }
}

function poly(cx, cy, r, n, rot) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    d += (i ? "L" : "M") + P(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return d + "Z";
}
function starPath(cx, cy, ro, ri, points) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    d += (i ? "L" : "M") + P(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return d + "Z";
}
function scallopPath(cx, cy, r, bumps) {
  // circle rim with outward semicircle bumps → decorative seal edge
  let d = "";
  const step = (2 * Math.PI) / bumps;
  for (let i = 0; i < bumps; i++) {
    const a0 = -Math.PI / 2 + i * step;
    const a1 = a0 + step;
    const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const mr = r + 8;
    const am = (a0 + a1) / 2;
    const mx = cx + Math.cos(am) * mr, my = cy + Math.sin(am) * mr;
    if (i === 0) d += "M" + P(x0, y0);
    d += "Q" + P(mx, my) + " " + P(x1, y1);
  }
  return d + "Z";
}
function roundRect(x, y, w, h, rx) {
  return `M${x + rx} ${y} h${w - 2 * rx} a${rx} ${rx} 0 0 1 ${rx} ${rx} v${h - 2 * rx} a${rx} ${rx} 0 0 1 ${-rx} ${rx} h${-(w - 2 * rx)} a${rx} ${rx} 0 0 1 ${-rx} ${-rx} v${-(h - 2 * rx)} a${rx} ${rx} 0 0 1 ${rx} ${-rx} Z`;
}
function circlePath(cx, cy, r) {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function spiro(cx, cy, R, r, d) {
  const steps = 2000, k = (R - r) / r;
  const span = Math.PI * 2 * (r / gcd(Math.round(R), Math.round(r)));
  let out = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * span;
    out += (i ? "L" : "M") + P(cx + (R - r) * Math.cos(t) + d * Math.cos(k * t), cy + (R - r) * Math.sin(t) + d * Math.sin(k * t));
  }
  return out;
}

// Interior texture engraved into the enamel — a different one per category.
// Returned markup is clipped to the enamel shape by the caller.
function pattern(kind, cx, cy, hue) {
  const c1 = `hsl(${hue} 65% 74%)`, c2 = `hsl(${hue} 55% 82%)`;
  const S = (o, w) => `stroke="${c1}" stroke-opacity="${o}" stroke-width="${w}" fill="none"`;
  switch (kind) {
    case "rings": {
      let o = "";
      for (let r = 9; r <= 42; r += 8) o += `<circle cx="${cx}" cy="${cy}" r="${r}" ${S(0.16, 0.7)}/>`;
      return o;
    }
    case "rays": {
      let o = "";
      const n = 24;
      for (let i = 0; i < n; i++) {
        const a = (i * 2 * Math.PI) / n;
        o += `<line x1="${(cx + Math.cos(a) * 6).toFixed(1)}" y1="${(cy + Math.sin(a) * 6).toFixed(1)}" x2="${(cx + Math.cos(a) * 44).toFixed(1)}" y2="${(cy + Math.sin(a) * 44).toFixed(1)}" ${S(0.14, 0.7)}/>`;
      }
      return o;
    }
    case "grid": {
      let o = "";
      for (let x = -40; x <= 40; x += 8) o += `<line x1="${cx + x}" y1="${cy - 44}" x2="${cx + x}" y2="${cy + 44}" ${S(0.12, 0.6)}/>`;
      for (let y = -40; y <= 40; y += 8) o += `<line x1="${cx - 44}" y1="${cy + y}" x2="${cx + 44}" y2="${cy + y}" ${S(0.12, 0.6)}/>`;
      return o;
    }
    case "waves": {
      let o = "";
      for (let yy = -34; yy <= 34; yy += 9) {
        let d = `M${cx - 44} ${cy + yy}`;
        for (let x = -44; x <= 44; x += 6) d += ` Q ${cx + x + 3} ${cy + yy + (((x / 6) % 2) ? 4 : -4)} ${cx + x + 6} ${cy + yy}`;
        o += `<path d="${d}" ${S(0.14, 0.7)}/>`;
      }
      return o;
    }
    case "stars": {
      const pts = [[-24, -18], [18, -24], [28, 4], [-30, 6], [6, 26], [-10, -30], [34, -12], [-34, -6], [12, 12], [-6, 20]];
      return pts.map(([x, y], i) => `<circle cx="${cx + x}" cy="${cy + y}" r="${i % 3 ? 0.9 : 1.6}" fill="${c2}" fill-opacity=".4"/>`).join("");
    }
    case "rosette":
    default:
      return `<path d="${spiro(cx, cy, 40, 13, 19)}" ${S(0.2, 0.5)}/><path d="${spiro(cx, cy, 38, 9, 21)}" ${S(0.13, 0.45)}/>`;
  }
}

// A faceted gem at (cx,cy) of radius rad, coloured by hue.
function gem(cx, cy, rad, hue) {
  const N = 8;
  const outer = [], mid = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    outer.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    mid.push([cx + Math.cos(a + Math.PI / N) * rad * 0.5, cy + Math.sin(a + Math.PI / N) * rad * 0.5]);
  }
  let out = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(rad + 1.4).toFixed(1)}" fill="url(#gg)"/>`;
  for (let i = 0; i < N; i++) {
    const o1 = outer[i], o2 = outer[(i + 1) % N], m = mid[i];
    const l = (40 + 22 * Math.abs(Math.cos((i / N) * Math.PI * 2))).toFixed(0);
    out += `<polygon points="${P(...o1)} ${P(...o2)} ${P(...m)}" fill="hsl(${hue} 68% ${l}%)"/>`;
  }
  for (let i = 0; i < N; i++) {
    const m1 = mid[i], m2 = mid[(i + 1) % N];
    const l = (52 + 20 * Math.sin((i / N) * Math.PI * 4)).toFixed(0);
    out += `<polygon points="${P(...m1)} ${P(...m2)} ${cx.toFixed(1)},${cy.toFixed(1)}" fill="hsl(${hue} 75% ${l}%)"/>`;
  }
  out += `<circle cx="${(cx - rad * 0.28).toFixed(1)}" cy="${(cy - rad * 0.28).toFixed(1)}" r="${(rad * 0.22).toFixed(1)}" fill="#fff" fill-opacity=".85"/>`;
  return out;
}

// Laurel sprig (a curved stem with leaves), mirrored via `dir`.
function laurel(cx, cy, dir) {
  const s = dir; // +1 right, -1 left
  let out = `<path d="M${cx} ${cy} q${8 * s} 6 ${11 * s} 16" fill="none" stroke="url(#gg)" stroke-width="2" stroke-linecap="round"/>`;
  for (let i = 0; i < 3; i++) {
    const lx = cx + (4 + i * 3.5) * s, ly = cy + 5 + i * 5;
    out += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="3.4" ry="1.7" fill="url(#gg)" transform="rotate(${(dir * (35 + i * 8)).toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})"/>`;
  }
  return out;
}

function grad(id, stops, kind = "l") {
  const tag = kind === "r" ? "radialGradient" : "linearGradient";
  const attrs = kind === "r" ? 'cx="0.5" cy="0.4" r="0.72"' : 'x1="0" y1="0" x2="0" y2="1"';
  return `<${tag} id="${id}" ${attrs}>${stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join("")}</${tag}>`;
}

export function renderBadge(def, tieredGroups) {
  const cat = CATEGORY[def.category];
  const S = shape(cat.shape);
  const { cx, cy, R } = S;
  const isTiered = tieredGroups.has(def.group);
  const metal = metalFor(def, isTiered);
  // Effective grandeur tier (1..4); non-tiered milestones sit at 1.
  const t = isTiered ? Math.min(def.tier, 4) : 1;

  // Enamel is the outer silhouette scaled toward the centre.
  const insetT = `translate(${cx} ${cy}) scale(0.76) translate(${-cx} ${-cy})`;
  const clipId = `en-${def.key}`;

  // ── behind-frame ornaments (drawn first) ──
  let behind = "";
  if (t >= 4) {
    // radiant starburst
    let spikes = "";
    const n = 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r0 = R + 2, r1 = R + (i % 2 ? 6 : 13);
      const x1 = (cx + Math.cos(a) * r0).toFixed(1), y1 = (cy + Math.sin(a) * r0).toFixed(1);
      const x2 = (cx + Math.cos(a) * r1).toFixed(1), y2 = (cy + Math.sin(a) * r1).toFixed(1);
      spikes += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#ringg)" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    behind += `<g opacity=".95">${spikes}</g>`;
  }

  const glyphMarkup = glyphFor(def)(metal.stroke);

  // ── on-frame ornaments (drawn after frame, around rim) ──
  let front = "";
  if (t >= 2) {
    // side gems
    front += gem(cx - R * 0.98, cy + 4, 4.6, cat.hue) + gem(cx + R * 0.98, cy + 4, 4.6, cat.hue);
  }
  if (t >= 3) {
    front += laurel(cx - R * 0.5, cy + R * 0.62, -1) + laurel(cx + R * 0.5, cy + R * 0.62, 1);
  }
  if (t >= 4) {
    // gem crown across the top
    front += gem(cx, cy - R + 2, 6.5, cat.hue) + gem(cx - 15, cy - R + 8, 4.2, cat.hue) + gem(cx + 15, cy - R + 8, 4.2, cat.hue);
  } else {
    front += gem(cx, cy - R + S.topGemY - 4, 7, cat.hue);
  }

  // ── tier chip ──
  let chip;
  if (isTiered) {
    const y = S.chipY;
    chip =
      `<path d="M${cx - 20} ${y} h40 l-6 12 -14 -5 -14 5 Z" fill="url(#ringg)"/>` +
      `<path d="M${cx - 20} ${y} h40 l-2 4 h-36 Z" fill="#000" fill-opacity=".18"/>` +
      `<text x="${cx}" y="${y + 11}" text-anchor="middle" font-size="12" font-weight="700" font-family="Georgia,serif" fill="${metal.label}">${ROMAN[def.tier - 1] || def.tier}</text>`;
  } else {
    chip = `<g transform="translate(${cx} ${S.chipY + 9}) scale(0.8)"><polygon points="${starPoints(0, 0, 8, 3.4)}" fill="url(#ringg)" stroke="${metal.stroke}" stroke-width=".6"/></g>`;
  }

  // Soft glow halo behind the emblem (adds depth so it reads as a lit scene).
  const glow = `<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="hsl(${cat.hue} 85% 72%)" stop-opacity=".38"/><stop offset="0.6" stop-color="hsl(${cat.hue} 80% 60%)" stop-opacity=".12"/><stop offset="1" stop-color="hsl(${cat.hue} 80% 60%)" stop-opacity="0"/></radialGradient>`;

  // Sparkles scattered around the emblem, clipped to the enamel.
  const spark = (x, y, s) =>
    `<path d="M${P(x, y - s)} L${P(x + s * 0.26, y - s * 0.26)} L${P(x + s, y)} L${P(x + s * 0.26, y + s * 0.26)} L${P(x, y + s)} L${P(x - s * 0.26, y + s * 0.26)} L${P(x - s, y)} L${P(x - s * 0.26, y - s * 0.26)} Z" fill="url(#gg)"/>`;
  const sparkles =
    spark(cx - 24, cy - 6, 3.2) + spark(cx + 23, cy + 9, 2.5) + spark(cx + 14, cy - 24, 2) + spark(cx - 13, cy + 23, 2.3);

  const defs =
    grad("ringg", metal.ring) + grad("gg", metal.glyph) + grad("enamel", cat.enamel, "r") + glow +
    `<clipPath id="${clipId}"><path d="${S.d}" transform="${insetT}"/></clipPath>`;

  // Shrink slightly when the tier-IV starburst is present so it fits the box.
  const k = t >= 4 ? 0.82 : 1;
  const wrapOpen = k !== 1 ? `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">` : "";
  const wrapClose = k !== 1 ? "</g>" : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
<defs>${defs}</defs>
${wrapOpen}
${behind}
<path d="${S.d}" fill="url(#ringg)"/>
<path d="${S.d}" fill="none" stroke="#ffffff" stroke-opacity=".4" stroke-width="1.3" transform="translate(${cx} ${cy}) scale(0.955) translate(${-cx} ${-cy})"/>
<path d="${S.d}" fill="none" stroke="${metal.stroke}" stroke-opacity=".55" stroke-width="2" transform="translate(${cx} ${cy}) scale(0.8) translate(${-cx} ${-cy})"/>
<path d="${S.d}" transform="${insetT}" fill="url(#enamel)"/>
<g clip-path="url(#${clipId})">
  ${pattern(cat.pattern, cx, cy, cat.hue)}
  <ellipse cx="${cx}" cy="${cy - 1}" rx="30" ry="28" fill="url(#glow)"/>
</g>
<g transform="translate(${cx} ${cy - 1}) scale(${S.glyphScale})" stroke-linejoin="round" stroke-linecap="round">${glyphMarkup}</g>
<g clip-path="url(#${clipId})" opacity=".92">${sparkles}</g>
<path d="${S.d}" transform="${insetT}" fill="#ffffff" fill-opacity=".08" clip-path="url(#${clipId})"/>
${front}
${chip}
${wrapClose}
</svg>
`;
}

function starPoints(cx, cy, ro, ri) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}
