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
    : {
        whileInView: "show" as const,
        viewport: { once: true, margin: "-10%" },
      };

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
