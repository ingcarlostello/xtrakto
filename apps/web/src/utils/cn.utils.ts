import { createCn } from "cn/config";

/**
 * The design system's text sizes, the `--text-*` tokens of globals.css. Kept
 * in sync by a test: one missing here is dropped by `cn` whenever a text
 * color follows it.
 */
export const TEXT_SIZE_TOKENS = [
  "title",
  "landing",
  "landing-section",
  "amount-xl",
  "amount-l",
  "amount-m",
  "section",
  "body",
  "caption",
  "meta",
] as const;

/**
 * Merges class names like `cn` does, knowing the design system's text sizes.
 * Without them, `text-meta text-ink-muted` reads as two colors and the size
 * is dropped.
 */
export const cn = createCn({
  extend: {
    classGroups: { "font-size": [{ text: [...TEXT_SIZE_TOKENS] }] },
  },
});
