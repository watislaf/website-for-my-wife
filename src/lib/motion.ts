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
  const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n));
  // Normalize to -0.5..0.5 across the element, then clamp to the edges.
  const px = clamp((clientX - rect.left) / rect.width - 0.5);
  const py = clamp((clientY - rect.top) / rect.height - 0.5);
  return {
    rotateX: -py * 2 * maxDeg, // up => positive
    rotateY: px * 2 * maxDeg, // right => positive
  };
}
