/** A movement's line: the bank's text as printed, or that it gave none. */
export type DescriptionView =
  /** The bank's text titles it: nothing says what it was. */
  | { readonly kind: "bank"; readonly text: string }
  /** A title in plain words, over the bank's text as printed (8.6a). */
  | { readonly kind: "titled"; readonly title: string; readonly raw: string }
  | { readonly kind: "none"; readonly raw: string };
