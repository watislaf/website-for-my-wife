# Admin Animation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `/admin/*` area a cohesive, polished feel via a small reusable animation vocabulary (entrance reveals, hover/press feedback, page transitions, count-ups) plus a cursor-tilt achievement detail dialog.

**Architecture:** A shared motion-token module (`src/lib/motion.ts`) plus a set of `"use client"` primitive components (`Reveal`, `Stagger`, `TiltCard`, `CountUp`, `PageTransition`). Admin server pages import and wrap their content with these primitives; no data-flow changes. The admin subtree is wrapped in `<MotionConfig reducedMotion="user">` for graceful degradation.

**Tech Stack:** Next.js (custom build, see `AGENTS.md`), React server/client components, `motion` v12 (`motion/react`), Tailwind, shadcn `ui/dialog`, Vitest 4 (logic-only tests; no React Testing Library in repo). Package manager: npm.

---

## Testing note

This repo tests **pure logic** with Vitest (see `src/lib/achievements/engine.test.ts`); React Testing Library is not installed and we will not add it (YAGNI). So:
- Pure, deterministic logic (the tilt math) gets a real TDD unit test.
- Visual/animation components are verified via `npm run lint`, `npm run build`, and manual checks documented per task.

Commands used throughout:
- Tests: `npm run test`
- Lint: `npm run lint`
- Build: `npm run build`

---

## File Structure

**Create:**
- `src/lib/motion.ts` — motion tokens: transitions, variants, numeric constants, and the pure `tiltFromPointer` helper.
- `src/lib/motion.test.ts` — unit tests for `tiltFromPointer`.
- `src/components/motion/Reveal.tsx` — entrance reveal wrapper.
- `src/components/motion/Stagger.tsx` — staggered container.
- `src/components/motion/TiltCard.tsx` — cursor-follow tilt card.
- `src/components/motion/CountUp.tsx` — animated number.
- `src/components/motion/PageTransition.tsx` — route cross-fade wrapper.
- `src/components/achievements/BadgeGrid.tsx` — client grid: clickable badges + detail dialog state.
- `src/components/achievements/BadgeDetailDialog.tsx` — the tilt detail dialog.

**Modify:**
- `src/app/admin/layout.tsx` — add `MotionConfig` + wrap `{children}` in `PageTransition`.
- `src/app/admin/achievements/page.tsx` — delegate rendering to `BadgeGrid`.
- Admin pages for adoption (Tasks 8–9): `dashboard`, `stats`, `goals`, `planner`, `work`, `traffic`, `landing` (landing-admin) — wrap content in `Reveal`/`Stagger`, add hover feedback, and `CountUp` where numbers are shown.

---

## Task 1: Motion tokens + tilt math (with tests)

**Files:**
- Create: `src/lib/motion.ts`
- Test: `src/lib/motion.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/motion.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { tiltFromPointer, TILT_MAX_DEG } from "./motion";

const rect = { left: 0, top: 0, width: 200, height: 100 } as DOMRect;

describe("tiltFromPointer", () => {
  it("returns zero tilt at the exact center", () => {
    const { rotateX, rotateY } = tiltFromPointer(rect, 100, 50, TILT_MAX_DEG);
    expect(rotateX).toBeCloseTo(0);
    expect(rotateY).toBeCloseTo(0);
  });

  it("tilts to opposite extremes at the corners", () => {
    const topLeft = tiltFromPointer(rect, 0, 0, 10);
    const bottomRight = tiltFromPointer(rect, 200, 100, 10);
    // Pointer at top edge => card tips up (positive rotateX); bottom => negative.
    expect(topLeft.rotateX).toBeCloseTo(10);
    expect(bottomRight.rotateX).toBeCloseTo(-10);
    // Pointer at left => rotateY negative; right => positive.
    expect(topLeft.rotateY).toBeCloseTo(-10);
    expect(bottomRight.rotateY).toBeCloseTo(10);
  });

  it("clamps pointer positions outside the rect to the max angle", () => {
    const { rotateX, rotateY } = tiltFromPointer(rect, -500, -500, 8);
    expect(rotateX).toBeCloseTo(8);
    expect(rotateY).toBeCloseTo(-8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `tiltFromPointer`/`TILT_MAX_DEG` not exported from `./motion`.

- [ ] **Step 3: Write `src/lib/motion.ts`**

```ts
import type { Variants, Transition } from "motion/react";

/** Max tilt angle (degrees) for TiltCard on each axis. Intentionally subtle. */
export const TILT_MAX_DEG = 8;
/** Hover lift distance (px) for interactive cards. */
export const HOVER_LIFT = -4;

/** Shared transitions. */
export const transitions = {
  /** Standard content ease. */
  soft: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as Transition,
  /** Springy interaction feel (hover/press/tilt return). */
  spring: { type: "spring", stiffness: 300, damping: 30 } as Transition,
} as const;

/** Fade + slide-up, driven by a parent's animate/whileInView state. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: transitions.soft },
};

/** Container that staggers its children's entrance. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

/**
 * Pure tilt math: given an element rect and a pointer position, return the
 * rotateX/rotateY (degrees) for a subtle cursor-follow tilt.
 *
 * Pointer above center => card tips its top toward the viewer (positive
 * rotateX). Pointer left of center => rotateY negative. Values are clamped to
 * ±maxDeg so pointers outside the rect don't overshoot.
 */
export function tiltFromPointer(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  clientX: number,
  clientY: number,
  maxDeg: number,
): { rotateX: number; rotateY: number } {
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  // Normalize to -0.5..0.5 across the element, then clamp to the edges.
  const px = clamp((clientX - rect.left) / rect.width - 0.5);
  const py = clamp((clientY - rect.top) / rect.height - 0.5);
  return {
    rotateX: -py * 2 * maxDeg, // up => positive
    rotateY: px * 2 * maxDeg, // right => positive
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (3 tests in `motion.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/motion.ts src/lib/motion.test.ts
git commit -m "feat(motion): shared motion tokens + tilt math with tests"
```

---

## Task 2: `Reveal` and `Stagger` primitives

**Files:**
- Create: `src/components/motion/Reveal.tsx`
- Create: `src/components/motion/Stagger.tsx`

- [ ] **Step 1: Write `Reveal.tsx`**

```tsx
"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { fadeUp } from "@/lib/motion";

type RevealProps = HTMLMotionProps<"div"> & {
  /** Extra delay (seconds) before this element animates in. */
  delay?: number;
  /** Animate on mount (true) or when scrolled into view (false, default). */
  onMount?: boolean;
};

/**
 * Fade + slide-up entrance wrapper. By default animates once when scrolled into
 * view; pass `onMount` for above-the-fold content that should animate on load.
 * Inside a <Stagger>, omit delay/onMount — the parent variants drive timing.
 */
export function Reveal({ delay, onMount, transition, ...props }: RevealProps) {
  const trigger = onMount
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, margin: "-10%" } };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      transition={delay ? { delay } : transition}
      {...trigger}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Write `Stagger.tsx`**

```tsx
"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { staggerContainer } from "@/lib/motion";

/**
 * Container that staggers the entrance of child <Reveal>s. Children must use
 * the shared `fadeUp` variants (which <Reveal> does). Animates when scrolled
 * into view.
 */
export function Stagger(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Verify lint + types**

Run: `npm run lint`
Expected: no errors for the two new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/motion/Reveal.tsx src/components/motion/Stagger.tsx
git commit -m "feat(motion): Reveal + Stagger entrance primitives"
```

---

## Task 3: `TiltCard` primitive

**Files:**
- Create: `src/components/motion/TiltCard.tsx`

- [ ] **Step 1: Write `TiltCard.tsx`**

```tsx
"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import { TILT_MAX_DEG, tiltFromPointer, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TiltCardProps = HTMLMotionProps<"div"> & {
  /** Max tilt per axis in degrees. Defaults to the shared subtle value. */
  maxDeg?: number;
};

/**
 * Card that tilts subtly toward the cursor (2D transform + perspective, reads
 * as 3D). Springs back to flat when the pointer leaves. Disabled entirely under
 * prefers-reduced-motion. Wrap the visual content; give it a fixed-ish size.
 */
export function TiltCard({
  maxDeg = TILT_MAX_DEG,
  className,
  children,
  style,
  ...props
}: TiltCardProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), transitions.spring);
  const rotateY = useSpring(useMotionValue(0), transitions.spring);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const t = tiltFromPointer(rect, e.clientX, e.clientY, maxDeg);
    rotateX.set(t.rotateX);
    rotateY.set(t.rotateY);
  }

  function reset() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      style={{
        rotateX: reduced ? 0 : rotateX,
        rotateY: reduced ? 0 : rotateY,
        transformStyle: "preserve-3d",
        ...style,
      }}
      className={cn("[perspective:800px]", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify lint + types**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/motion/TiltCard.tsx
git commit -m "feat(motion): TiltCard cursor-follow tilt primitive"
```

---

## Task 4: `CountUp` primitive

**Files:**
- Create: `src/components/motion/CountUp.tsx`

- [ ] **Step 1: Write `CountUp.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

type CountUpProps = {
  /** Target value to animate to. */
  value: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Format the displayed number (e.g. toLocaleString, money). */
  format?: (n: number) => string;
  className?: string;
};

/**
 * Animates a number from 0 up to `value` on mount. Snaps directly to the final
 * value under prefers-reduced-motion. Formatting is applied to each frame's
 * value via `format` (defaults to rounded integer + locale separators).
 */
export function CountUp({
  value,
  duration = 1,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, reduced]);

  return <span className={className}>{format(display)}</span>;
}
```

- [ ] **Step 2: Verify lint + types**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/motion/CountUp.tsx
git commit -m "feat(motion): CountUp animated number primitive"
```

---

## Task 5: `PageTransition` + `MotionConfig` in admin layout

**Files:**
- Create: `src/components/motion/PageTransition.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Write `PageTransition.tsx`**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { transitions } from "@/lib/motion";

/**
 * Cross-fades + small-slides admin route content on navigation. Keyed on the
 * pathname so AnimatePresence swaps between routes. `mode="wait"` lets the old
 * page finish exiting before the new one enters.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={transitions.soft}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Modify `src/app/admin/layout.tsx`**

Add imports near the other component imports:
```tsx
import { MotionConfig } from "motion/react";
import { PageTransition } from "@/components/motion/PageTransition";
```

Replace the `<main>` element:
```tsx
        <main className="flex-1 p-6 md:p-10">{children}</main>
```
with:
```tsx
        <main className="flex-1 p-6 md:p-10">
          <MotionConfig reducedMotion="user">
            <PageTransition>{children}</PageTransition>
          </MotionConfig>
        </main>
```
(Note: `MotionConfig`/`PageTransition` are client components; importing and using them inside the server-component layout is fine — they render as client boundaries. `layout.tsx` stays a server component.)

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; no server/client boundary errors.

- [ ] **Step 4: Manual check**

Run `npm run dev`, log into `/admin`, navigate between sidebar pages. Expected: content cross-fades/slides on each navigation instead of a hard cut.

- [ ] **Step 5: Commit**

```bash
git add src/components/motion/PageTransition.tsx src/app/admin/layout.tsx
git commit -m "feat(admin): page transitions + reduced-motion config"
```

---

## Task 6: Achievements — extract clickable `BadgeGrid`

**Files:**
- Create: `src/components/achievements/BadgeGrid.tsx`
- Modify: `src/app/admin/achievements/page.tsx`

**Context:** `page.tsx` is a server component that computes `earnedByKey`, `coins`, and groups `ACHIEVEMENTS` by category. Move the badge rendering into a client `BadgeGrid` so click/dialog/tilt hooks work; keep all data fetching in the page.

- [ ] **Step 1: Create `BadgeGrid.tsx`**

```tsx
"use client";

import { useState } from "react";
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  type AchievementDef,
  type Category,
} from "@/lib/achievements/catalog";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger } from "@/components/motion/Stagger";
import { BadgeDetailDialog } from "./BadgeDetailDialog";

export type Earned = {
  count: number;
  firstEarnedAt: string;
  lastEarnedAt: string;
};

/** Format an earned UTC "YYYY-MM-DD HH:MM:SS" string to a local date. */
export function formatEarnedDate(ts: string): string {
  const [y, m, d] = ts.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return ts.slice(0, 10);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function LockedCard({ def }: { def: AchievementDef }) {
  return (
    <div
      title={def.hint}
      className="flex h-full flex-col items-center gap-2 rounded-xl bg-card px-3 py-4 text-center ring-1 ring-foreground/10 opacity-90"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badges/${def.key}.svg`}
        alt="Locked achievement"
        className="size-16 md:size-20 [filter:brightness(0)_opacity(0.22)]"
      />
      <span className="text-sm font-semibold text-muted-foreground">???</span>
      <span className="text-xs text-muted-foreground line-clamp-3">{def.hint}</span>
      <span className="mt-auto text-xs font-medium text-muted-foreground/80">
        🪙 {def.coins}
      </span>
    </div>
  );
}

function UnlockedCard({
  def,
  earned,
  onClick,
}: {
  def: AchievementDef;
  earned: Earned;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="flex h-full flex-col items-center gap-2 rounded-xl bg-card px-3 py-4 text-center ring-2 ring-primary/40 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badges/${def.key}.svg`}
        alt={def.name}
        className="size-16 md:size-20 drop-shadow-sm"
      />
      <span className="text-sm font-semibold leading-snug">
        {def.name}
        {earned.count > 1 && (
          <span className="ml-1 text-xs font-medium text-primary">
            ×{earned.count}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground line-clamp-3">
        {def.description}
      </span>
      <div className="mt-auto flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold text-primary">🪙 {def.coins}</span>
        <span className="text-[10px] text-muted-foreground">
          {formatEarnedDate(earned.lastEarnedAt)}
        </span>
      </div>
    </motion.button>
  );
}

export function BadgeGrid({
  earnedByKey,
}: {
  earnedByKey: Record<string, Earned | undefined>;
}) {
  const [selected, setSelected] = useState<AchievementDef | null>(null);
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <>
      {categories.map((category) => {
        const defs = ACHIEVEMENTS.filter((a) => a.category === category);
        if (defs.length === 0) return null;
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
            <Stagger className={cn("grid gap-3", "grid-cols-3 sm:grid-cols-4 md:grid-cols-6")}>
              {defs.map((def) => {
                const earned = earnedByKey[def.key];
                const unlocked = (earned?.count ?? 0) >= 1;
                return (
                  <Reveal key={def.key}>
                    {unlocked && earned ? (
                      <UnlockedCard
                        def={def}
                        earned={earned}
                        onClick={() => setSelected(def)}
                      />
                    ) : (
                      <LockedCard def={def} />
                    )}
                  </Reveal>
                );
              })}
            </Stagger>
          </section>
        );
      })}

      <BadgeDetailDialog
        def={selected}
        earned={selected ? earnedByKey[selected.key] : undefined}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
```

Add the missing `motion` import at the top of the file (with the others):
```tsx
import { motion } from "motion/react";
```

- [ ] **Step 2: Rewrite `src/app/admin/achievements/page.tsx`**

Replace the whole file with:
```tsx
import { ACHIEVEMENTS } from "@/lib/achievements/catalog";
import { getAchievementsState } from "@/actions/achievements";
import { BadgeGrid } from "@/components/achievements/BadgeGrid";

export default async function AchievementsPage() {
  const { coins, earnedByKey } = await getAchievementsState();

  const total = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(
    (a) => (earnedByKey[a.key]?.count ?? 0) >= 1,
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold heading-gradient">Achievements</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-semibold ring-1 ring-foreground/10">
            <span aria-hidden>🪙</span>
            {coins.toLocaleString()} coins
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-semibold ring-1 ring-foreground/10">
            {unlockedCount} / {total} unlocked
          </span>
        </div>
      </div>

      <BadgeGrid earnedByKey={earnedByKey} />
    </div>
  );
}
```
(The `<CountUp>` on the coins figure is added in Task 8; leaving it plain here keeps this task focused on the grid extraction.)

- [ ] **Step 3: Verify build (expect a known gap)**

Run: `npm run build`
Expected: FAILS only because `./BadgeDetailDialog` does not exist yet — that's Task 7. If any *other* error appears, fix it before moving on.

- [ ] **Step 4: Commit**

```bash
git add src/components/achievements/BadgeGrid.tsx src/app/admin/achievements/page.tsx
git commit -m "refactor(achievements): extract clickable client BadgeGrid"
```

---

## Task 7: Achievements — tilt detail dialog

**Files:**
- Create: `src/components/achievements/BadgeDetailDialog.tsx`

- [ ] **Step 1: Create `BadgeDetailDialog.tsx`**

```tsx
"use client";

import type { AchievementDef } from "@/lib/achievements/catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TiltCard } from "@/components/motion/TiltCard";
import { formatEarnedDate, type Earned } from "./BadgeGrid";

/**
 * Detail view for a single unlocked achievement. Renders a large badge inside a
 * TiltCard that follows the cursor. Controlled by the parent: `def` non-null =>
 * open. Closing (Esc / overlay / X) calls onOpenChange(false).
 */
export function BadgeDetailDialog({
  def,
  earned,
  onOpenChange,
}: {
  def: AchievementDef | null;
  earned: Earned | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={def !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {def && (
          <>
            <DialogHeader>
              <DialogTitle>{def.name}</DialogTitle>
              <DialogDescription>{def.description}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-2">
              <TiltCard className="rounded-2xl bg-card p-8 ring-1 ring-foreground/10 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/badges/${def.key}.svg`}
                  alt={def.name}
                  className="size-32 md:size-40 drop-shadow"
                  style={{ transform: "translateZ(40px)" }}
                />
              </TiltCard>

              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                  🪙 {def.coins}
                </span>
                {earned && earned.count > 1 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 font-semibold ring-1 ring-foreground/10">
                    ×{earned.count} earned
                  </span>
                )}
                {earned && (
                  <span className="text-muted-foreground">
                    {formatEarnedDate(earned.lastEarnedAt)}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS now that the dialog exists.

- [ ] **Step 3: Manual check**

`npm run dev` → `/admin/achievements`. Expected: unlocked badges lift on hover and are keyboard-focusable; clicking one opens a dialog with a large badge that tilts subtly toward the cursor and springs back; Esc/overlay closes it; locked badges are not clickable.

- [ ] **Step 4: Run full test + lint**

Run: `npm run test && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/achievements/BadgeDetailDialog.tsx
git commit -m "feat(achievements): cursor-tilt badge detail dialog"
```

---

## Task 8: Adopt entrance reveals + count-ups on dashboard & stats

**Files:**
- Modify: `src/app/admin/page.tsx` (dashboard)
- Modify: `src/app/admin/stats/page.tsx`
- Modify: `src/app/admin/achievements/page.tsx` (add CountUp to coins)

**Adoption recipe** (apply consistently):
- Wrap the page's top heading block in `<Reveal onMount>`.
- Wrap each logical section (a `<section>`, card row, or chart block) in `<Reveal>` (scroll-in), or wrap a grid/list of cards in `<Stagger>` with each item in `<Reveal>`.
- Replace a displayed numeric total `{n.toLocaleString()}` with `<CountUp value={n} />`, and money totals with `<CountUp value={n} format={fmtMoney} />` (import `fmtMoney` from `@/components/work/format`).
- These pages are server components; `Reveal`/`Stagger`/`CountUp` are client components imported directly — no `"use client"` needed on the page.

- [ ] **Step 1: Dashboard — wrap sections + heading**

In `src/app/admin/page.tsx`: import `Reveal`/`Stagger` from `@/components/motion/*`; wrap the heading block in `<Reveal onMount>`; wrap each dashboard card/section grid in `<Stagger>` with each card in `<Reveal>`. Replace any headline numbers with `<CountUp>`.

- [ ] **Step 2: Stats — wrap blocks + count-ups**

In `src/app/admin/stats/page.tsx`: wrap the heading in `<Reveal onMount>`; wrap each summary card and each chart/table block in `<Reveal>`. For the summary stat numbers (money via `fmtMoney`, hours via `fmtHours`, streaks) use `<CountUp value={n} format={fmtMoney} />` etc. Numbers already computed server-side are passed straight to `CountUp`.

- [ ] **Step 3: Achievements — count-up the coins/unlocked figures**

In `src/app/admin/achievements/page.tsx`, import `CountUp` and replace `{coins.toLocaleString()} coins` with `<CountUp value={coins} /> coins`, and the `{unlockedCount} / {total}` with `<CountUp value={unlockedCount} /> / {total}`.

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual check**

`npm run dev`: dashboard, stats, achievements headings animate in on load; sections stagger in; numbers count up (and are static under OS "reduce motion").

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/stats/page.tsx src/app/admin/achievements/page.tsx
git commit -m "feat(admin): entrance reveals + count-ups on dashboard, stats, achievements"
```

---

## Task 9: Adopt reveals + hover feedback on remaining pages

**Files (one commit per page or grouped):**
- Modify: `src/app/admin/goals/page.tsx`
- Modify: `src/app/admin/planner/page.tsx`
- Modify: `src/app/admin/work/page.tsx`
- Modify: `src/app/admin/traffic/page.tsx`
- Modify: `src/app/admin/landing/page.tsx`

Apply the **same adoption recipe** from Task 8 to each page:
- Heading block → `<Reveal onMount>`.
- Card lists / boards → `<Stagger>` + per-item `<Reveal>`.
- Any prominent totals → `<CountUp>`.
- For interactive cards that are plain `<div>`s (not already `motion` components), add hover lift: convert the card wrapper to `motion.div` with `whileHover={{ y: -4 }}` and `whileTap={{ scale: 0.98 }}` where it's clickable. Do **not** duplicate hover behavior on components that already animate (e.g. `WorkBoard`, `PlannerBoard`, `GoalsBoard` already import `motion`) — only add where missing, and keep it subtle.

- [ ] **Step 1: goals** — apply recipe to `src/app/admin/goals/page.tsx`. Run `npm run lint`. Commit `feat(admin): animate goals page`.
- [ ] **Step 2: planner** — apply recipe to `src/app/admin/planner/page.tsx`. Run `npm run lint`. Commit `feat(admin): animate planner page`.
- [ ] **Step 3: work** — apply recipe to `src/app/admin/work/page.tsx`. Run `npm run lint`. Commit `feat(admin): animate work page`.
- [ ] **Step 4: traffic** — apply recipe to `src/app/admin/traffic/page.tsx`. Run `npm run lint`. Commit `feat(admin): animate traffic page`.
- [ ] **Step 5: landing (landing-admin)** — apply recipe to `src/app/admin/landing/page.tsx`. Run `npm run lint`. Commit `feat(admin): animate landing editor page`.

- [ ] **Step 6: Final verification**

Run: `npm run test && npm run lint && npm run build`
Expected: all PASS.

- [ ] **Step 7: Manual sweep**

`npm run dev`: visit every admin page. Confirm each has entrance reveals, subtle hover feedback on interactive cards, page transitions on navigation, and count-ups on numeric figures. Toggle OS "reduce motion" and confirm everything is static/snapped.

---

## Self-Review

**Spec coverage:**
- Motion tokens → Task 1. ✅
- `Reveal`/`Stagger` (entrance reveals) → Task 2, adopted Tasks 8–9. ✅
- `TiltCard` (cursor tilt) → Task 3, used Task 7. ✅
- `CountUp` (number count-ups) → Task 4, adopted Task 8. ✅
- Hover/press feedback → Task 6 (badges) + Task 9 (remaining pages). ✅
- Page transitions + `MotionConfig reducedMotion` → Task 5. ✅
- Achievements clickable unlocked badges + tilt dialog → Tasks 6–7. ✅
- Reduced motion (snap CountUp, disable tilt) → Tasks 3, 4, 5. ✅
- Server/client boundary preserved → Tasks 5, 6, 8 notes. ✅
- Rollout order (vocab+achievements first) → Task order matches spec. ✅

**Placeholder scan:** No TBD/TODO. Tasks 8–9 use a stated adoption recipe rather than re-listing each page's markup (which is not knowable without reading each file at execution time); the recipe is concrete and the target elements per page are named.

**Type consistency:** `Earned`, `formatEarnedDate`, `tiltFromPointer`, `TILT_MAX_DEG`, `transitions`, `fadeUp`, `staggerContainer` are defined once and imported consistently. `BadgeDetailDialog` imports `Earned`/`formatEarnedDate` from `BadgeGrid` where they're defined.
