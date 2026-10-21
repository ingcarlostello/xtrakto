const PERCENT = 100;

/** What part of a whole some money is, in whole percent; 0 of nothing. */
export const percentOf = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((Math.abs(part) * PERCENT) / Math.abs(whole));
