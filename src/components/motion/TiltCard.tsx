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
