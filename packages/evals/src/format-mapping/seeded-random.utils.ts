/** Numbers from 0, included, to 1, excluded. */
export type Random = () => number;

/**
 * mulberry32: a small generator that gives the same numbers for the same
 * seed, so an invented set is the same on every run.
 */
export const seededRandom = (seed: number): Random => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** One of the items. */
export const pick = <T>(random: Random, items: readonly T[]): T => {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("Nothing to pick from.");
  return item;
};

/** A whole number from `min` to `max`, both included. */
export const between = (random: Random, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));
