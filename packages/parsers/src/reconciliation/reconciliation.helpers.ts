import { sumAmounts } from "@xtrakto/core";
import type { ParsedStatement } from "@xtrakto/core";
import { RECONCILIATION_ISSUE } from "./reconciliation.constants";
import type {
  Reconciliation,
  ReconciliationIssue,
} from "./reconciliation.types";

const hasBalanceData = ({
  openingBalanceMinor,
  closingBalanceMinor,
  transactions,
}: ParsedStatement): boolean =>
  (openingBalanceMinor !== undefined && closingBalanceMinor !== undefined) ||
  transactions.some(({ balanceAfterMinor }) => balanceAfterMinor !== undefined);

// Each row's balance must be the previous balance plus its amount. The
// printed balance is the next row's reference, so a misprinted amount is
// reported once, at its row; a row without a balance can't be checked and
// leaves the next one unchecked too.
const rowIssues = ({
  openingBalanceMinor,
  transactions,
}: ParsedStatement): ReconciliationIssue[] => {
  const issues: ReconciliationIssue[] = [];
  let previous = openingBalanceMinor;
  for (const { amountMinor, balanceAfterMinor, sourceRow } of transactions) {
    if (
      previous !== undefined &&
      balanceAfterMinor !== undefined &&
      sumAmounts([previous, amountMinor]) !== balanceAfterMinor
    ) {
      issues.push({ code: RECONCILIATION_ISSUE.ROW_BALANCE, sourceRow });
    }
    previous = balanceAfterMinor;
  }
  return issues;
};

const closingIssues = ({
  openingBalanceMinor,
  closingBalanceMinor,
  transactions,
}: ParsedStatement): ReconciliationIssue[] => {
  if (openingBalanceMinor === undefined || closingBalanceMinor === undefined) {
    return [];
  }
  const amounts = transactions.map(({ amountMinor }) => amountMinor);
  return sumAmounts([openingBalanceMinor, ...amounts]) === closingBalanceMinor
    ? []
    : [{ code: RECONCILIATION_ISSUE.CLOSING_BALANCE }];
};

const totalIssues = ({
  totals,
  transactions,
}: ParsedStatement): ReconciliationIssue[] => {
  const amounts = transactions.map(({ amountMinor }) => amountMinor);
  const credits = sumAmounts(amounts.filter((amount) => amount > 0));
  // The debits total is money out as a positive amount.
  const debits = -sumAmounts(amounts.filter((amount) => amount < 0));
  const issues: ReconciliationIssue[] = [];
  if (totals?.creditsMinor !== undefined && totals.creditsMinor !== credits) {
    issues.push({ code: RECONCILIATION_ISSUE.TOTAL_CREDITS });
  }
  if (totals?.debitsMinor !== undefined && totals.debitsMinor !== debits) {
    issues.push({ code: RECONCILIATION_ISSUE.TOTAL_DEBITS });
  }
  return issues;
};

/**
 * Checks a statement's balances and totals against its movements, with exact
 * integer sums. A statement that prints no balances can't be verified; that
 * isn't an error, just the `NO_BALANCE_DATA` issue.
 */
export const reconcile = (statement: ParsedStatement): Reconciliation => {
  if (!hasBalanceData(statement)) {
    const issues = [{ code: RECONCILIATION_ISSUE.NO_BALANCE_DATA }];
    return { balanceVerified: false, issues };
  }
  const issues = [
    ...rowIssues(statement),
    ...closingIssues(statement),
    ...totalIssues(statement),
  ];
  return { balanceVerified: issues.length === 0, issues };
};
