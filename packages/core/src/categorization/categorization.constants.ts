/** Which way a movement's money goes: in for a positive amount, out for a negative one. */
export const MONEY_DIRECTION = {
  IN: "in",
  OUT: "out",
} as const;

/** What the bank writes when it doesn't say what a movement was. */
export const NO_DESCRIPTION = "0";
