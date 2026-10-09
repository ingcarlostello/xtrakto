import { hashIdentifier } from "../hashing/identifier-hash.helpers";
import {
  occurrenceIndexes,
  transactionFingerprint,
} from "../hashing/transaction-fingerprint.helpers";
import { sha256Hex } from "../hashing/web-crypto.utils";
import { REFERENCE_KIND } from "./statement.constants";
import type {
  ParsedStatement,
  ParsedTransaction,
  PreparedStatement,
  PreparedTransaction,
} from "./statement.types";

const CONTENT_HASH_VERSION = "xtrakto.stmt.v1";

// Raw references can be phone numbers: only their HMAC goes on.
const referenceHashOf = (
  movement: ParsedTransaction,
  identifierHashKey: string,
): Promise<string> | undefined =>
  movement.referenceRaw === undefined ||
  movement.referenceKind === REFERENCE_KIND.NONE
    ? undefined
    : hashIdentifier(movement.referenceRaw, identifierHashKey);

const prepareTransaction = async (
  movement: ParsedTransaction,
  order: { readonly occurrenceIndex: number; readonly position: number },
  identifierHashKey: string,
): Promise<PreparedTransaction> => ({
  date: movement.date,
  descriptionRaw: movement.descriptionRaw,
  descriptionNormalized: movement.descriptionNormalized,
  amountMinor: movement.amountMinor,
  balanceAfterMinor: movement.balanceAfterMinor,
  referenceKind: movement.referenceKind,
  referenceHash: await referenceHashOf(movement, identifierHashKey),
  fingerprint: await transactionFingerprint(movement, order.occurrenceIndex),
  ...order,
});

// Identifies the upload: the same statement uploaded twice gives the same
// hash; a corrected one for the same period doesn't.
const contentHashOf = (
  statement: ParsedStatement,
  fingerprints: readonly string[],
): Promise<string> =>
  sha256Hex(
    JSON.stringify([
      CONTENT_HASH_VERSION,
      statement.formatId,
      statement.period.from,
      statement.period.to,
      statement.openingBalanceMinor ?? null,
      statement.closingBalanceMinor ?? null,
      statement.totals ?? null,
      fingerprints,
    ]),
  );

/**
 * Readies a parsed statement for saving: fingerprints, occurrence indexes and
 * positions for its movements, HMACs instead of raw references, and a content
 * hash. Nothing that could identify a third party is left in plain text.
 */
export const prepareStatement = async (
  statement: ParsedStatement,
  identifierHashKey: string,
): Promise<PreparedStatement> => {
  const indexes = occurrenceIndexes(statement.transactions);
  const transactions = await Promise.all(
    statement.transactions.map((movement, position) =>
      prepareTransaction(
        movement,
        { occurrenceIndex: indexes[position] ?? 0, position },
        identifierHashKey,
      ),
    ),
  );
  return {
    ...statement,
    transactions,
    contentHash: await contentHashOf(
      statement,
      transactions.map((movement) => movement.fingerprint),
    ),
  };
};
