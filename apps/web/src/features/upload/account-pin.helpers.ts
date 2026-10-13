import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { AccountType, Result } from "@xtrakto/core";
import type { AccountChoice, UploadAccount } from "./upload.types";

/** The account a job is pinned to, if any: without one, it's found when processed. */
export type AccountPin = {
  readonly accountId?: string;
  readonly accountLast4?: string;
};

/** What a format says of its statements' account (`BankParser`). */
type FormatAccount = {
  readonly bankId: string;
  readonly accountType: AccountType;
  readonly identifiesAccount: boolean;
};

const ACCOUNT_NOT_EXPECTED: Result<never> = err({
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "account" },
});

/**
 * Where a submitted statement goes, as far as it's known before processing.
 * A quarterly statement names its account, found by its digits then. A
 * movements export goes to the account chosen on the upload screen, which
 * must be one of the user's of its kind; without a choice, to the user's only
 * account of its kind, or to none yet if they have none. With several, the
 * user has to choose.
 */
export const pinAccount = (
  format: FormatAccount,
  choice: AccountChoice | undefined,
  accounts: readonly UploadAccount[],
): Result<AccountPin> => {
  if (format.identifiesAccount) return choice ? ACCOUNT_NOT_EXPECTED : ok({});
  if (choice && "accountLast4" in choice) return ok(choice);
  const ofKind = accounts.filter(
    ({ bankId, accountType }) =>
      bankId === format.bankId && accountType === format.accountType,
  );
  if (choice) {
    return ofKind.some(({ id }) => id === choice.accountId)
      ? ok(choice)
      : err({ code: APP_ERROR_CODE.NOT_FOUND });
  }
  if (ofKind.length > 1) return err({ code: APP_ERROR_CODE.ACCOUNT_REQUIRED });
  const [only] = ofKind;
  return ok(only ? { accountId: only.id } : {});
};
