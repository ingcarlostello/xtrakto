import { MIN_IDENTIFIER_HASH_KEY_LENGTH } from "./identifier-hash.constants";
import { hmacSha256Hex } from "./web-crypto.utils";

const PHONE_SEPARATORS_PATTERN = /[\s().+-]/g;
// Colombian mobile: 10 digits starting with 3, optionally after country code 57.
const COLOMBIAN_MOBILE_PATTERN = /^(?:57)?(3\d{9})$/;

// Equivalent spellings must hash the same: a mobile number keeps its 10 digits;
// anything else is trimmed, uppercased and has its spaces collapsed.
const normalizeIdentifier = (value: string): string => {
  const text = value.normalize("NFC").trim();
  const digits = text.replace(PHONE_SEPARATORS_PATTERN, "");
  const mobile = COLOMBIAN_MOBILE_PATTERN.exec(digits)?.[1];
  if (mobile !== undefined) return mobile;
  return text.toUpperCase().replace(/\s+/g, " ");
};

/**
 * HMAC-SHA-256 of a third-party identifier, such as the phone number in a
 * transfer reference, as 64 hex characters. Equal identifiers give equal
 * hashes, so transfers to the same person can be grouped; without the key, a
 * hash can't be reversed by trying every phone number. Throws on an empty
 * value or a short key: both are bugs, not bad input.
 */
export const hashIdentifier = async (
  value: string,
  key: string,
): Promise<string> => {
  if (key.length < MIN_IDENTIFIER_HASH_KEY_LENGTH) {
    throw new RangeError(
      `The identifier hash key needs at least ${MIN_IDENTIFIER_HASH_KEY_LENGTH} characters`,
    );
  }
  const normalized = normalizeIdentifier(value);
  if (normalized === "") throw new RangeError("Can't hash an empty identifier");
  return hmacSha256Hex(key, normalized);
};
