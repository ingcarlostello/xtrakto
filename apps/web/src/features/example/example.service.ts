import "server-only";
import {
  categorizeStatement,
  normalizeHolderName,
  prepareStatement,
} from "@xtrakto/core";
import {
  findAccountHolderName,
  findOrCreateUser,
  resolveIdentifiedAccount,
  saveStatement,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { EXAMPLE_CLERK_USER_ID } from "@/lib/example-mode";
import { balanceCheckOf } from "@/utils/balance-check.helpers";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { EXAMPLE_HOLDER } from "./example-quarter.constants";
import { exampleQuarter } from "./example-quarter.helpers";

/**
 * Saves the example's quarter for its user (7.8), through the same steps
 * ingestion takes after parsing: prepared, categorized with the account's
 * holder name, checked and saved. Saving it again adds nothing, so every
 * visit can ask for it. Its data is invented, and no action writes to it:
 * they all act for the session's user.
 */
export const ensureExampleData = (): Promise<void> =>
  withSanitizedErrors("EXAMPLE_NOT_SAVED", async () => {
    const db = getDb();
    const userId = await findOrCreateUser(db, EXAMPLE_CLERK_USER_ID);
    const parsed = exampleQuarter();
    const prepared = await prepareStatement(
      parsed,
      getServerEnv().IDENTIFIER_HASH_KEY,
    );
    const saved = await withUserContext(db, userId, async (ctx) => {
      const accountId = await resolveIdentifiedAccount(ctx, {
        bankId: parsed.bankId,
        accountType: parsed.accountType,
        last4: parsed.accountLast4 ?? "",
        currency: parsed.currency,
        holderNameNormalized: normalizeHolderName(EXAMPLE_HOLDER),
      });
      const holderName = await findAccountHolderName(ctx, accountId);
      return saveStatement(ctx, {
        accountId,
        statement: categorizeStatement(prepared, { holderName }),
        balance: balanceCheckOf(parsed),
      });
    });
    if (!saved.ok) throw new Error(saved.error.code);
  });
