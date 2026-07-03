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
