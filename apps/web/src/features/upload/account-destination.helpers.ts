import { accountLabel } from "@/utils/account-label.helpers";
import { ACCOUNT_KEY_PREFIX } from "./upload.constants";
import type {
  AccountKey,
  StatementPreview,
  UploadAccount,
} from "./upload.types";

/** An account a movements export can go to; its key is what gets sent. */
export type AccountOption = {
  readonly key: AccountKey;
  readonly label: string;
};

/** Where a movements export will be saved: one account, or the person's choice. */
export type AccountDestination =
  | { readonly kind: "known"; readonly label: string }
  | { readonly kind: "choose"; readonly options: readonly AccountOption[] };

type AccountKind = Pick<StatementPreview, "bankId" | "accountType">;
type Candidate = { readonly key: AccountKey; readonly last4: string | null };

// A quarterly statement chosen in the same batch names its account by its
// last 4 digits: an account the user has, the only one without a number,
// which the statement takes over, or a new one.
const withStatementAccount = (
  candidates: readonly Candidate[],
  last4: string,
): readonly Candidate[] => {
  if (candidates.some((candidate) => candidate.last4 === last4)) {
    return candidates;
  }
  const unnumbered = candidates.filter(({ last4: digits }) => digits === null);
  if (unnumbered.length === 1) {
    return candidates.map((candidate) =>
      candidate.last4 === null ? { ...candidate, last4 } : candidate,
    );
  }
  return [...candidates, { key: `${ACCOUNT_KEY_PREFIX.LAST4}${last4}`, last4 }];
};

/**
 * Where a movements export will be saved, since the file doesn't name its
 * account: among the user's accounts of its bank and type and those named by
 * the quarterly statements chosen with it. With none, a new account; with
 * one, that account; with several, the person chooses.
 */
export const exportDestination = (
  preview: StatementPreview,
  accounts: readonly UploadAccount[],
  batch: readonly StatementPreview[],
): AccountDestination => {
  const isSameKind = (other: AccountKind) =>
    other.bankId === preview.bankId &&
    other.accountType === preview.accountType;
  const owned = accounts.filter(isSameKind).map(({ id, last4 }): Candidate => ({
    key: `${ACCOUNT_KEY_PREFIX.ACCOUNT}${id}`,
    last4,
  }));
  const named = batch
    .filter(isSameKind)
    .flatMap(({ accountLast4 }) => (accountLast4 ? [accountLast4] : []));
  const candidates = named.reduce(withStatementAccount, owned);
  if (candidates.length <= 1) {
    return {
      kind: "known",
      label: accountLabel(preview, candidates[0]?.last4 ?? null),
    };
  }
  return {
    kind: "choose",
    options: candidates.map(({ key, last4 }) => ({
      key,
      label: accountLabel(preview, last4),
    })),
  };
};
