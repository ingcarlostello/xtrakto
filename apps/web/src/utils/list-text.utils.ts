/** `"julio, agosto y septiembre"`, or with another word: `"transferencia o PSE"`. */
export const joined = (items: readonly string[], conjunction = "y"): string =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} ${conjunction} ${items.at(-1)}`;
