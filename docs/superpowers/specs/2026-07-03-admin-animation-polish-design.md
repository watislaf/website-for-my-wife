# Admin Animation Polish — Design

**Date:** 2026-07-03
**Status:** Approved (pending spec review)

## Goal

Make the `/admin/*` area feel as alive and polished as the public landing page. The
landing already uses `motion/react` (fade + slide-up entrances, staggered delays,
~0.6s). The admin pages are mostly static. This spec introduces a small, reusable
animation vocabulary and rolls it out across admin.

The original trigger was the achievements page: clicking a badge should open a
detail view that tilts subtly toward the cursor ("2D CSS that reads as 3D"). That
becomes one instance of the shared vocabulary.

## Scope

- **In:** all `/admin/*` pages — dashboard, achievements, goals, planner, stats,
  traffic, work — plus the shared admin layout.
- **Out:** the public landing (`src/app/page.tsx` + `components/landing/*`) already
  animated; not touched beyond reusing its timing feel.

## Animation types requested

1. Entrance reveals (on load / on scroll into view)
2. Hover / press feedback
3. Page transitions between admin routes
4. Number count-ups (coins, stats)
5. Cursor-follow tilt on the achievements detail card

## Constraints from the codebase

- Admin pages are **server components** with `export const dynamic = "force-dynamic"`
  (`src/app/admin/layout.tsx`). Data is fetched server-side. **All animation must
  live in client components**; server pages import and wrap their content.
- `src/app/admin/layout.tsx` renders `<main className="flex-1 …">{children}</main>` —
  the insertion point for page transitions.
- Stats/coins are server-computed numbers passed to children — count-ups take the
  final value as a prop and animate up to it on the client.
- `motion` v12 (`motion/react`) is already a dependency. `ui/dialog.tsx` exists.
- Existing landing style is the timing reference: fade + slide-up, duration ~0.5–0.6s.

## Approach

Chosen: **a shared motion vocabulary + small primitive components, adopted page by
page.**

Rejected alternatives:
- Per-page bespoke motion — more tailored but inconsistent and duplicative.
- CSS-only — lighter but cannot cleanly do cursor-tilt, count-up, or route
  transitions, and Motion is already shipped.

## Components

### 1. Motion tokens — `src/lib/motion.ts`

A single module of shared variants and transition constants (durations, easing,
slide distance, stagger step) so the whole admin area shares one feel and can be
retuned in one place. Values seeded from the landing's existing timings.

Exports (indicative):
- `transitions` — e.g. `soft` (duration ~0.5, ease-out), `spring` (for tilt/press).
- `fadeUp` — variants `{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }`.
- `staggerContainer` — variants with `staggerChildren`.
- Numeric tokens: `TILT_MAX_DEG` (~8), `HOVER_LIFT`, etc.

### 2. Primitive client components — `src/components/motion/`

- **`<Reveal>`** — fade + slide-up entrance. Uses `whileInView` with `once: true`
  for scroll reveal; accepts `delay` (or `index`) for stagger. The workhorse for
  entrance reveals. Renders a `motion.div` (with an `as`/`render` escape hatch where
  a different element is needed).
- **`<Stagger>`** — container using `staggerContainer` variants to stagger child
  `<Reveal>`s (badge grids, card rows).
- **`<TiltCard>`** — cursor-follow tilt. Parent sets `perspective: ~800px`; card sets
  `transformStyle: preserve-3d`. `useMotionValue` for pointer x/y within the card →
  `useTransform` → `rotateX`/`rotateY`, wrapped in `useSpring` for a damped
  return-to-flat. Max ~`TILT_MAX_DEG`. Optional small `scale` on hover. Powers the
  achievements detail dialog; reusable elsewhere.
- **`<CountUp>`** — animates a number from 0 (or a `from` prop) to `value` using
  `useMotionValue` + `animate`, formatting via an optional `format` callback
  (reuse `fmtMoney`/`toLocaleString` at the call site). Snaps directly to `value`
  under reduced motion.

### 3. Hover / press feedback

Standardize an interactive treatment on cards and key buttons: `whileHover` (small
lift + softer shadow) and `whileTap` (slight press/scale-down). Applied via the
primitives or a thin shared helper so it stays consistent. Prefer this over ad-hoc
per-component transitions.

### 4. Page transitions — `<PageTransition>`

A client wrapper placed inside `<main>` in the admin layout. Uses
`AnimatePresence mode="wait"` keyed on `usePathname()` to cross-fade + small-slide
between admin routes instead of hard cuts.

### 5. Achievements detail dialog

Clickable **unlocked** badges (locked stay as the `???` teaser). Click opens a
`Dialog` (`ui/dialog.tsx`) containing a large `<TiltCard>` badge detail: big SVG,
name, description, coin value, earned date, `×count` if repeated. Grid stays flat.

Because `src/app/admin/achievements/page.tsx` is a server component, extract a client
`BadgeCard` (clickable) + `BadgeDetailDialog` so dialog/motion hooks live
client-side. Server data flow unchanged.

## Cross-cutting concerns

- **Reduced motion:** wrap the admin subtree in `<MotionConfig reducedMotion="user">`
  so transforms degrade gracefully. `<CountUp>` additionally snaps to its final value
  (it animates a value, not just a transform, so Motion's reduced-motion handling
  does not fully cover it).
- **Server/client boundary:** all primitives are `"use client"`. Server pages import
  and wrap content; no data-flow or fetching changes.
- **Consistency:** all timing/easing flows from `src/lib/motion.ts`; no magic numbers
  scattered across pages.
- **Accessibility:** the `Dialog` handles focus trap / Esc. Interactive badges are
  real `button` elements with accessible labels.

## Rollout order

1. Motion tokens + primitives (`src/lib/motion.ts`, `components/motion/*`).
2. Achievements page: clickable badges + tilt dialog (proves the kit).
3. `MotionConfig` + `<PageTransition>` in the admin layout.
4. Roll out `<Reveal>`/`<Stagger>`/hover/`<CountUp>` across: dashboard → stats →
   goals → planner → work → traffic → landing-admin.

## Testing

- Existing test suite (`engine.test.ts` etc.) must stay green.
- Manual verification per page: entrances fire once, hover/press feels responsive,
  route transitions are smooth, count-ups land on the correct value, tilt springs
  back, and everything is static/snapped under `prefers-reduced-motion`.

## Non-goals

- No glare/sheen on the tilt card (kept to a subtle angle change, per request; easy
  to add later).
- No changes to the public landing beyond reusing its timing feel.
- No new animation dependency — `motion` only.
