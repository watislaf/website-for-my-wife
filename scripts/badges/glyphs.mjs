// Bespoke achievement glyphs, drawn as code.
//
// Each glyph is a function (s) => string of SVG markup, where `s` is the dark
// outline/detail color for the current metal. Glyphs are authored in a ~[-12,12]
// coordinate box centred on the origin; the renderer translates + scales them
// onto the medal. Filled shapes use the gradient `url(#gg)` (a bright version of
// the badge's metal, defined per-file by the renderer); "holes" and fine detail
// use `s`. Line/ring glyphs stroke with `url(#gg)`.
//
// Lookup order in the renderer: by achievement `key`, then by `group`, then a
// star fallback — so tiered families are keyed by group and one-off milestones
// by key.

const F = 'fill="url(#gg)"';

// small primitive helpers
const circle = (cx, cy, r, extra = F) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
const rect = (x, y, w, h, rx = 0, extra = F) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${extra}/>`;
const path = (d, extra = F) => `<path d="${d}" ${extra}/>`;
const poly = (pts, extra = F) => `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(2)).join(",")).join(" ")}" ${extra}/>`;

// A star polygon with `n` points, outer/inner radius.
function starPts(n, ro, ri, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / n;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

export const GLYPHS = {
  // ── WORK ────────────────────────────────────────────────────────────────
  // Hard Worker → dumbbell with motion lines
  "hard-worker": (s) =>
    `<path d="M-15 -3.5 h3.5 M-16.5 0 h4.5 M-15 3.5 h3.5" stroke="url(#gg)" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    rect(-7, -2, 15, 4, 1.4) +
    rect(-11.5, -7.5, 4.5, 15, 2) + rect(8, -7.5, 4.5, 15, 2) +
    rect(-8, -5.5, 3, 11, 1.3) + rect(6, -5.5, 3, 11, 1.3) +
    rect(-7, -2, 15, 1.6, 0.8, 'fill="#ffffff" fill-opacity=".3"'),
  // Marathoner (total hours) → stopwatch
  marathoner: (s) =>
    rect(-2.4, -12, 4.8, 3, 1) +
    rect(-1.2, -13.5, 2.4, 2, 0.8) +
    circle(0, 1.5, 9.5) +
    circle(0, 1.5, 6.8, `fill="${s}"`) +
    `<path d="M0 1.5 L0 -3.4 M0 1.5 L4 3.5" stroke="url(#gg)" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  // Grinder → two interlocking cogs
  grinder: (s) => {
    const cog = (ox, oy, R, n, hole) => {
      let t = "";
      for (let i = 0; i < n; i++) {
        const a = (i * 2 * Math.PI) / n;
        const x = ox + Math.cos(a) * R, y = oy + Math.sin(a) * R;
        t += `<rect x="${(x - 1.9).toFixed(2)}" y="${(y - 1.9).toFixed(2)}" width="3.8" height="3.8" rx="1" transform="rotate(${((a * 180) / Math.PI).toFixed(0)} ${x.toFixed(2)} ${y.toFixed(2)})" ${F}/>`;
      }
      return t + circle(ox, oy, R * 0.82) + circle(ox, oy, hole, `fill="${s}"`);
    };
    return cog(-2.5, 2.5, 8, 8, 3) + cog(7.5, -6.5, 5, 6, 1.8);
  },

  // ── EARNINGS ─────────────────────────────────────────────────────────────
  // Big Payday → banknote behind a coin stack
  "big-payday": (s) =>
    `<g transform="rotate(-9 -1 -5)">${rect(-11, -11, 22, 12, 2)}${rect(-11, -11, 22, 12, 2, `fill="none" stroke="${s}" stroke-width="0.9"`)}${circle(0, -5, 2.4, `fill="${s}"`)}</g>` +
    `<ellipse cx="1" cy="9" rx="9.5" ry="3.3" ${F}/>` +
    `<ellipse cx="1" cy="5.3" rx="9.5" ry="3.3" ${F} stroke="${s}" stroke-width="0.6"/>` +
    `<ellipse cx="1" cy="1.6" rx="9.5" ry="3.3" ${F} stroke="${s}" stroke-width="0.6"/>` +
    `<text x="1" y="3.3" text-anchor="middle" font-size="5" font-weight="700" font-family="Georgia,serif" fill="${s}">$</text>`,
  // Loyal Client → two linked rings with a heart above
  "loyal-client": (s) =>
    path("M0 -6 C-1.6 -8.4 -5 -8 -5 -5 C-5 -2.8 -2 -1.2 0 0.4 C2 -1.2 5 -2.8 5 -5 C5 -8 1.6 -8.4 0 -6 Z", `fill="url(#gg)" transform="translate(0 -6) scale(0.62)"`) +
    `<g fill="none" stroke-width="2.6"><circle cx="-4.5" cy="3" r="6.2" stroke="${s}" stroke-width="4"/><circle cx="4.5" cy="3" r="6.2" stroke="${s}" stroke-width="4"/><circle cx="-4.5" cy="3" r="6.2" stroke="url(#gg)"/><circle cx="4.5" cy="3" r="6.2" stroke="url(#gg)"/></g>`,
  // Breadwinner → loaf with a wheat sprig
  breadwinner: (s) =>
    `<g transform="translate(7 -9) rotate(20)"><path d="M0 0 v11" stroke="url(#gg)" stroke-width="1.2" fill="none"/><ellipse cx="0" cy="1" rx="1.4" ry="2.6" ${F}/><ellipse cx="-2.4" cy="3" rx="1.2" ry="2.2" ${F}/><ellipse cx="2.4" cy="3" rx="1.2" ry="2.2" ${F}/><ellipse cx="-2.4" cy="6" rx="1.2" ry="2.2" ${F}/><ellipse cx="2.4" cy="6" rx="1.2" ry="2.2" ${F}/></g>` +
    path("M-11 6 Q-11 -5 -4 -6.5 Q0 -7.5 4 -6.5 Q11 -5 11 6 Q11 9 8 9 L-8 9 Q-11 9 -11 6 Z") +
    `<path d="M-6 -4 L-2 0 M-1 -5 L3 -1 M4 -5 L7 -2" stroke="${s}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
  // High Roller → two dice
  "high-roller": (s) => {
    const die = (ox, oy, h, pips) =>
      rect(ox - h, oy - h, h * 2, h * 2, h * 0.42) +
      pips.map(([x, y]) => circle(ox + x, oy + y, h * 0.16, `fill="${s}"`)).join("");
    return (
      die(-6, -5.5, 5.5, [[-2.6, -2.6], [2.6, 2.6], [0, 0]]) +
      die(3.5, 3.5, 8, [[-4, -4], [4, -4], [0, 0], [-4, 4], [4, 4]])
    );
  },

  // ── CONSISTENCY ───────────────────────────────────────────────────────────
  // Streak Master → flame with embers
  "streak-master": () =>
    circle(8, -7, 1.5) + circle(-8, -3, 1.1) + circle(9, 3, 0.9) +
    path("M0 -13 C4 -6 9.5 -4.5 7.5 3.5 C6 9.5 2.2 12 0 12 C-3.5 12 -8 9 -7.5 2 C-6.5 -2 -3 -2 -2.5 -6 C0 -4.5 0.7 -8.5 0 -13 Z") +
    path("M0 -3 C2.5 0 3 4 0.5 7 C-1.2 9 -3.5 7.5 -3 4.5 C-2.7 2 -0.5 1.5 0 -3 Z", 'fill="#ffffff" fill-opacity=".4"'),
  // Legendary Streak → crown
  "legendary-streak": (s) =>
    path("M-11 6 L-11 -5 L-5 0.5 L0 -8 L5 0.5 L11 -5 L11 6 Z") +
    rect(-11, 6, 22, 3.5, 1) +
    circle(-11, -5, 1.8) + circle(0, -8, 1.8) + circle(11, -5, 1.8) +
    `<rect x="-11" y="6" width="22" height="1.4" fill="${s}" opacity=".25"/>`,
  // Consistency → calendar with check
  consistency: (s) =>
    rect(-10, -8, 20, 17, 2.5) +
    rect(-10, -8, 20, 5.5, 2.5, `fill="${s}"`) +
    rect(-6, -11, 2.4, 4, 1) + rect(3.6, -11, 2.4, 4, 1) +
    `<path d="M-5 1 L-1 5 L6 -3" stroke="${s}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Perfect Day → sun
  "perfect-day": () => {
    let rays = "";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      rays += `<rect x="-1" y="-12.5" width="2" height="4" rx="1" transform="rotate(${(i * 45).toFixed(0)})" ${F}/>`;
    }
    return rays + circle(0, 0, 6.5);
  },

  // ── PLANNER ─────────────────────────────────────────────────────────────
  // Planner Pro → clipboard with a checked list
  "planner-pro": (s) =>
    rect(-9, -9, 18, 20, 2.5) +
    rect(-4, -11.5, 8, 4.5, 1.5) +
    `<path d="M-5.5 -3 L-4 -1.5 L-1.5 -4.5" stroke="${s}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M-5.5 2.5 L-4 4 L-1.5 1" stroke="${s}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M1 -3.5 h5.5 M1 3 h5.5" stroke="${s}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  // Dreamer → lightbulb with idea-rays
  dreamer: (s) => {
    let rays = "";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.6;
      rays += `<line x1="${(Math.cos(a) * 9.5).toFixed(1)}" y1="${(Math.sin(a) * 9.5 - 3).toFixed(1)}" x2="${(Math.cos(a) * 13).toFixed(1)}" y2="${(Math.sin(a) * 13 - 3).toFixed(1)}" stroke="url(#gg)" stroke-width="1.3" stroke-linecap="round"/>`;
    }
    return rays +
      circle(0, -3, 7) +
      path("M-4 2.5 L4 2.5 L3 6.5 L-3 6.5 Z") +
      rect(-3.2, 6.5, 6.4, 3, 1.2, `fill="${s}"`) +
      `<path d="M0 -6 L0 0 M-2.3 -1 L2.3 -1" stroke="${s}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  },
  // Closer → checkered finish flag planted on a hill
  closer: (s) => {
    let checks = "";
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      if ((i + j) % 2 === 0) checks += rect(-4 + i * 4, -11 + j * 4, 4, 4, 0, `fill="${s}"`);
    }
    return path("M-13 12 Q-4 6 0 9 Q6 12 13 8 L13 13 L-13 13 Z", `fill="${s}" opacity=".5"`) +
      rect(-6.5, -11, 2.6, 23, 1) + rect(-4, -11, 12, 8, 0) + checks;
  },
  // Portfolio → briefcase with a rising chart
  portfolio: (s) =>
    path("M-4 -6 v-2.5 a4 4 0 0 1 8 0 v2.5", `fill="none" stroke="url(#gg)" stroke-width="2.4"`) +
    rect(-11, -6, 22, 15, 2.5) +
    rect(-2.5, -6, 5, 3, 1, `fill="${s}"`) +
    `<path d="M-7 5 L-2 0 L2 3 L7 -3" fill="none" stroke="${s}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    path("M7 -3 l-3 0 m3 0 l0 3", `fill="none" stroke="${s}" stroke-width="1.5" stroke-linecap="round"`),

  // ── AUDIENCE ──────────────────────────────────────────────────────────────
  // Famous → a big star flanked by two small ones
  famous: () =>
    poly(starPts(5, 10.5, 4.4)) +
    `<g transform="translate(9.5 -8)">${poly(starPts(5, 3.2, 1.3))}</g>` +
    `<g transform="translate(-9.5 7.5)">${poly(starPts(5, 2.6, 1.1))}</g>`,
  // Engager → tap cursor
  engager: (s) =>
    path("M-6 -8 L5 -1 L-0.5 0.5 L3 7 L0.5 8.5 L-2.5 2 L-6 5 Z") +
    `<path d="M6 -8 A5 5 0 0 1 9.5 -4.5 M8.5 -11 A9 9 0 0 1 12.5 -6" stroke="url(#gg)" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  // Mailing List → envelope with a heart seal
  "mailing-list": (s) =>
    rect(-12, -8, 24, 16, 2.5) +
    `<path d="M-12 -6.5 L0 2.5 L12 -6.5" stroke="${s}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>` +
    path("M0 3 C-1 1.6 -3.2 1.9 -3.2 3.8 C-3.2 5.2 -1.2 6.2 0 7.2 C1.2 6.2 3.2 5.2 3.2 3.8 C3.2 1.9 1 1.6 0 3 Z", `fill="${s}"`),
  // Diversified → network
  diversified: (s) => {
    let out = "";
    const nodes = [[0, -10], [9, 6], [-9, 6]];
    for (const [x, y] of nodes) out += `<line x1="0" y1="0" x2="${x}" y2="${y}" stroke="${s}" stroke-width="1.8"/>`;
    out += circle(0, 0, 3.8);
    for (const [x, y] of nodes) out += circle(x, y, 3.2);
    return out;
  },
  // Viral Day → rocket with a star trail
  "viral-day": (s) =>
    poly(starPts(4, 2.2, 0.9, -Math.PI / 2), `fill="url(#gg)" transform="translate(-9 -9)"`) +
    poly(starPts(4, 1.6, 0.7, -Math.PI / 2), `fill="url(#gg)" transform="translate(9 -6)"`) +
    circle(-6, 8, 1, F) + circle(5, 10, 0.8, F) +
    path("M0 -13 C6 -7 6 3 3.5 9 L-3.5 9 C-6 3 -6 -7 0 -13 Z") +
    circle(0, -4, 2.8, `fill="${s}"`) +
    path("M-3.5 5 L-8 10 L-3.5 9 Z") + path("M3.5 5 L8 10 L3.5 9 Z") +
    path("M-2 9 L0 13 L2 9 Z", 'fill="#ff8a4d"'),

  // ── MILESTONES (keyed individually) ────────────────────────────────────────
  "first-dollar": (s) =>
    `<ellipse cx="-8" cy="9.5" rx="5.5" ry="2.2" ${F} stroke="${s}" stroke-width="0.5"/>` +
    `<ellipse cx="8.5" cy="10" rx="5" ry="2" ${F} stroke="${s}" stroke-width="0.5"/>` +
    circle(0, -1, 10.5) + circle(0, -1, 8, `fill="none" stroke="${s}" stroke-width="1"`) +
    `<text x="0" y="3.4" text-anchor="middle" font-size="12" font-weight="700" font-family="Georgia,serif" fill="${s}">$</text>`,
  "first-goal": (s) =>
    circle(0, 0, 11) + circle(0, 0, 7.3, `fill="${s}"`) + circle(0, 0, 4.6) + circle(0, 0, 1.8, `fill="${s}"`) +
    // arrow striking the bullseye from the lower left
    `<path d="M-15 12 L1 -1" stroke="url(#gg)" stroke-width="2" stroke-linecap="round"/>` +
    path("M2 -2 L-3 0 L-1 3 Z", `fill="${s}"`) +
    path("M-15 12 L-12 12 M-15 12 L-15 9", `fill="none" stroke="url(#gg)" stroke-width="2" stroke-linecap="round"`),
  "first-check-in": (s) =>
    `<path d="M-9 0 L-2.5 7 L9 -7.5" stroke="url(#gg)" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  "first-period-closed": (s) =>
    `<path d="M-6 -1 v-3.5 a6 6 0 0 1 12 0 v3.5" fill="none" stroke="url(#gg)" stroke-width="2.6"/>` +
    rect(-8.5, -1, 17, 13, 2.5) + circle(0, 4.5, 1.8, `fill="${s}"`) + rect(-0.9, 5.5, 1.8, 3.5, 0.6, `fill="${s}"`),
  "first-fan": (s) =>
    path("M-12 0 Q0 -9 12 0 Q0 9 -12 0 Z") +
    circle(0, 0, 4.2, `fill="${s}"`) + circle(1.4, -1.4, 1.4, 'fill="#ffffff" fill-opacity=".7"'),
  "first-click": (s) =>
    path("M-6 -8 L5 -1 L-0.5 0.5 L3 7 L0.5 8.5 L-2.5 2 L-6 5 Z"),
  "first-subscriber": (s) =>
    // bell with ringing sound waves
    `<path d="M9 -8 A7 7 0 0 1 11.5 -2 M12 -11 A11 11 0 0 1 15 -3" fill="none" stroke="url(#gg)" stroke-width="1.4" stroke-linecap="round"/>` +
    path("M0 -10 C5.5 -10 7.5 -5.5 7.5 -1 C7.5 3.5 9.5 5.5 9.5 5.5 L-9.5 5.5 C-9.5 5.5 -7.5 3.5 -7.5 -1 C-7.5 -5.5 -5.5 -10 0 -10 Z") +
    path("M-3 5.5 A3 3 0 0 0 3 5.5 Z", `fill="${s}"`) + circle(0, -11, 1.7),
  "first-task-done": (s) =>
    rect(-10, -10, 20, 20, 4, `fill="none" stroke="url(#gg)" stroke-width="2.6"`) +
    `<path d="M-5 0 L-1 4.5 L6 -5" stroke="url(#gg)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

  // ── MILESTONES: SETUP (keyed individually) ─────────────────────────────────
  "made-it-yours": (s) =>
    path("M0 -12 L4 6 L0 10 L-4 6 Z") +
    path("M0 -12 L0 6", `stroke="${s}" stroke-width="1" fill="none"`) +
    circle(0, 3, 1.6, `fill="${s}"`),
  storyteller: (s) =>
    path("M0 -6 C-4 -9 -9 -9 -11 -7 L-11 8 C-9 6 -4 6 0 8 Z") +
    path("M0 -6 C4 -9 9 -9 11 -7 L11 8 C9 6 4 6 0 8 Z") +
    `<path d="M0 -6 L0 8" stroke="${s}" stroke-width="1.2" fill="none"/>` +
    `<path d="M-8.5 -4 h5 M-8.5 -1 h5 M-8.5 2 h4 M3.5 -4 h5 M3.5 -1 h5 M3.5 2 h4" stroke="${s}" stroke-width="0.9" stroke-linecap="round" fill="none"/>`,
  "say-cheese": (s) =>
    rect(-12, -6, 24, 15, 3) +
    path("M-7 -6 L-4 -10 L4 -10 L7 -6 Z") +
    circle(0, 1.5, 5.2, `fill="${s}"`) + circle(0, 1.5, 3, F) + circle(1.6, -0.1, 1.1, 'fill="#ffffff" fill-opacity=".8"') +
    circle(7.5, -2, 1.4, `fill="${s}"`) +
    // flash sparkle
    poly(starPts(4, 2.4, 0.8), `fill="url(#gg)" transform="translate(-9 -9)"`),
  "get-social": (s) =>
    `<g fill="none" stroke-width="4"><rect x="-11" y="-4.5" width="12" height="9" rx="4.5" stroke="${s}"/><rect x="-1" y="-4.5" width="12" height="9" rx="4.5" stroke="${s}"/></g>` +
    `<g fill="none" stroke="url(#gg)" stroke-width="2.4"><rect x="-11" y="-4.5" width="12" height="9" rx="4.5"/><rect x="-1" y="-4.5" width="12" height="9" rx="4.5"/></g>`,
  "show-and-tell": (s) =>
    poly([[0, -11], [11, -4.5], [0, 2], [-11, -4.5]]) +
    poly([[0, 2], [11, -4.5 + 6], [0, 2 + 6], [-11, -4.5 + 6]], 'fill="url(#gg)" fill-opacity=".55"'),
  "all-set-up": (s) => {
    // award rosette: ribbon tails + gear-edged medal + check
    return path("M-6 6 L-9 15 L-4 12 L-2 15 L0 7 Z", `fill="${s}"`) +
      path("M6 6 L9 15 L4 12 L2 15 L0 7 Z", `fill="${s}"`) +
      poly(starPts(12, 10, 8, 0)) + circle(0, -1, 6.5, `fill="${s}"`) +
      `<path d="M-3 -1 L-0.5 1.5 L3.5 -3.5" stroke="url(#gg)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  },

  // Rich → diamond
  rich: (s) =>
    path("M-11 -4 L-6 -9 L6 -9 L11 -4 L0 11 Z") +
    `<path d="M-11 -4 L11 -4 M-6 -9 L-3 -4 L0 11 M6 -9 L3 -4 L0 11 M-3 -4 L3 -4" stroke="${s}" stroke-width="0.9" fill="none" stroke-linejoin="round"/>`,
};

// Fallback for any unmapped key.
export const FALLBACK = () => `<polygon points="${starPts(5, 12, 5).map((p) => p.map((n) => n.toFixed(2)).join(",")).join(" ")}" fill="url(#gg)"/>`;

export function glyphFor(def) {
  return GLYPHS[def.key] || GLYPHS[def.group] || FALLBACK;
}
