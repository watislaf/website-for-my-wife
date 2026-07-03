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
