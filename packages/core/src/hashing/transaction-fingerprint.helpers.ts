import type { ParsedTransaction } from "../statements/statement.types";
import { sha256Hex } from "./web-crypto.utils";

/**
 * Fingerprint v1: what identifies a movement across uploads of the same
 * account. Changing the identity, or parser output that feeds it (description
 * normalization or masking), needs a v2 and recomputing stored fingerprints.
 */
const FINGERPRINT_VERSION = "xtrakto.tx.v1";

type MovementIdentity = Pick<
  ParsedTransaction,
  "date" | "descriptionNormalized" | "amountMinor" | "balanceAfterMinor"
>;

// JSON keeps every field apart, whatever text a description holds; NFC makes
// a composed and a decomposed accent the same description.
const identityOf = (movement: MovementIdentity): string =>
  JSON.stringify([
    movement.date,
    movement.descriptionNormalized.normalize("NFC"),
    movement.amountMinor,
    movement.balanceAfterMinor ?? null,
  ]);

/**
 * How many identical movements come before each one in its statement: two
 * equal Nequi transfers on the same day get 0 and 1, and keep those numbers in
 * any other upload that holds both.
 */
export const occurrenceIndexes = (
  movements: readonly MovementIdentity[],
): number[] => {
  const seen = new Map<string, number>();
  return movements.map((movement) => {
    const identity = identityOf(movement);
    const index = seen.get(identity) ?? 0;
    seen.set(identity, index + 1);
    return index;
  });
};

/** SHA-256 hex of the movement's identity, its occurrence index and the version. */
export const transactionFingerprint = (
  movement: MovementIdentity,
  occurrenceIndex: number,
): Promise<string> =>
  sha256Hex(
    `${FINGERPRINT_VERSION}:${identityOf(movement)}:${occurrenceIndex}`,
  );
