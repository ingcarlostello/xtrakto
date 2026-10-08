import { PII_PLACEHOLDER } from "./pii.constants";

export type RedactPiiOptions = {
  /** Names to remove wherever they appear, such as the account holder's. */
  readonly knownNames?: readonly string[];
};

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Colombian mobile numbers: 10 digits starting with 3, optionally after +57.
const PHONE_PATTERN = /(?<!\d)(?:\+?57\s?)?3\d{9}(?!\d)/g;
// IDs, account numbers and contract numbers.
const LONG_NUMBER_PATTERN = /\d{6,}/g;
// Person-to-person transfers end with the other person's name. A remainder
// that is only placeholders (for example a phone already redacted) stays.
const PERSON_TRANSFER_PATTERN =
  /\b(TRANSF\s+(?:A|DE)|PAGO\s+LLAVE)\s+(?!(?:\[[A-Z]+\]\s*)+$)(.+)$/i;
// A known name must have at least this many letters to be matched by prefix,
// so a short fragment such as "AN" doesn't erase unrelated text.
const MIN_NAME_PREFIX_LENGTH = 4;

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const nameTokens = (name: string): string[] =>
  name.trim().split(/\s+/).filter(Boolean);

// Unicode-aware word edges: `\b` fails next to symbols and accented letters.
const WORD_START = "(?<![\\p{L}\\p{N}])";
const WORD_END = "(?![\\p{L}\\p{N}])";

const namePattern = (name: string): string =>
  name.split(" ").map(escapeRegExp).join("\\s+");

// Descriptions truncate at about 30 characters, so a known name may appear
// cut at the end of the text ("TRANSF A CARLOS TEL" for "CARLOS TELLO").
const redactKnownName = (text: string, name: string): string => {
  const joined = nameTokens(name).join(" ");
  if (joined === "") return text;
  const fullName = new RegExp(
    `${WORD_START}${namePattern(joined)}${WORD_END}`,
    "giu",
  );
  const redacted = text.replace(fullName, PII_PLACEHOLDER.NAME);
  for (let end = joined.length - 1; end >= MIN_NAME_PREFIX_LENGTH; end--) {
    const prefix = joined.slice(0, end).trimEnd();
    const truncated = new RegExp(`${WORD_START}${namePattern(prefix)}$`, "iu");
    if (truncated.test(redacted)) {
      return redacted.replace(truncated, PII_PLACEHOLDER.NAME);
    }
  }
  return redacted;
};

/**
 * Replaces personal data in a movement description before it leaves the
 * system (for example to an LLM). Merchant names are kept: categorization
 * needs them.
 *
 * Known limitations:
 * - Numbers written with separators ("1.234.567") or shorter than 6 digits
 *   are not redacted.
 * - Names are only caught after a person-transfer prefix or when listed in
 *   `knownNames`; a name in any other position stays.
 * - Name matching ignores case but not accents.
 */
export const redactPii = (
  text: string,
  { knownNames = [] }: RedactPiiOptions = {},
): string => {
  const withoutContacts = text
    .replace(EMAIL_PATTERN, PII_PLACEHOLDER.EMAIL)
    .replace(PHONE_PATTERN, PII_PLACEHOLDER.PHONE)
    .replace(LONG_NUMBER_PATTERN, PII_PLACEHOLDER.NUMBER)
    .replace(PERSON_TRANSFER_PATTERN, `$1 ${PII_PLACEHOLDER.NAME}`);
  return knownNames.reduce(redactKnownName, withoutContacts);
};
