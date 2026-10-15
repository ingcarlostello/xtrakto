import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

/** Fast in, slow settle: the curve of every entrance. */
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Frames an entrance takes. */
const ENTER_FRAMES = 18;

/** 0 until `start`, then eased up to 1 over `duration` frames. */
export const progress = (
  frame: number,
  start: number,
  duration = ENTER_FRAMES,
): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Fades in while rising `distance` pixels into place, from `start`. */
export const enter = (
  frame: number,
  start: number,
  distance = 24,
): CSSProperties => {
  const shown = progress(frame, start);
  return { opacity: shown, translate: `0 ${(1 - shown) * distance}px` };
};

/** Counts up to `target` (an integer) from `start`, as amounts do on screen. */
export const countUp = (frame: number, start: number, target: number) =>
  Math.round(target * progress(frame, start, 40));
