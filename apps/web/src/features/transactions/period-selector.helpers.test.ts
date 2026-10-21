import { amountMinorSchema, periodSchema } from "@xtrakto/core";
import type { AccountRow } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  monthOptions,
  quarterOptions,
} from "@/components/period-controls/period-options.helpers";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  listHrefOf,
  listLinkOf,
  meetsPeriod,
  periodText,
} from "./period-selector.helpers";
import type { AccountTransactions } from "./transaction.types";

const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8901",
};
const OTHER: AccountRow = { ...ACCOUNT, id: "a2", last4: null };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

const NOTHING = { amountMinor: amountMinorSchema.parse(0), count: 0 };

const view = (
  period: MovementPeriod,
  accounts: AccountRow[] = [ACCOUNT],
): AccountTransactions => ({
  accounts,
  account: ACCOUNT,
  quarters: [{ year: 2026, quarter: 3, status: "verified" }],
  unreconciled: [],
  period,
  total: 0,
  list: {
    days: [],
    shownLines: 0,
    shownMovements: 0,
    lineCount: 0,
    groupedInterest: 0,
  },
  detail: null,
  kindTotals: {
    income: NOTHING,
    spending: NOTHING,
    moved: { out: NOTHING, back: NOTHING },
  },
  pendingReview: 0,
  currentYear: "2026",
});

describe("meetsPeriod", () => {
  it.each([
    {
      name: "the quarter it covers",
      from: "2026-07-01",
      to: "2026-09-30",
      meets: true,
    },
    {
      name: "one of its months",
      from: "2026-08-01",
      to: "2026-08-31",
      meets: true,
    },
    {
      name: "the quarter of its opening balance's day",
      from: "2026-04-01",
      to: "2026-06-30",
      meets: false,
    },
    {
      name: "the next quarter",
      from: "2026-10-01",
      to: "2026-12-31",
      meets: false,
    },
  ])("finds whether a statement's days meet $name", ({ from, to, meets }) => {
    const statement = periodSchema.parse({
      from: "2026-06-30",
      to: "2026-09-30",
    });

    expect(meetsPeriod(statement, periodSchema.parse({ from, to }))).toBe(
      meets,
    );
  });
});

describe("periodText", () => {
  it.each([
    [
      { kind: "quarter", year: 2026, quarter: 3 },
      "Del 1 de julio al 30 de septiembre de 2026",
    ],
    [AUGUST, "Del 1 de agosto al 31 de agosto de 2026"],
  ] as const)("says the days of %o", (period, expected) => {
    expect(periodText(period)).toBe(expected);
  });
});

describe("the list's links", () => {
  it("keeps the search and the filter in every period's link", () => {
    const searching = {
      ...view(AUGUST),
      search: "nequi",
      filter: "moved" as const,
    };
    const hrefOf = listHrefOf(searching);

    expect(quarterOptions(searching, hrefOf)[0]?.href).toEqual({
      pathname: "/transactions",
      query: { period: "2026-q3", q: "nequi", filter: "moved" },
    });
    expect(monthOptions(searching, hrefOf)[0]?.href.query).toEqual({
      period: "2026-07",
      q: "nequi",
      filter: "moved",
    });
  });

  it("keeps the account in links only when there are several", () => {
    expect(listLinkOf(view(AUGUST))).toEqual({ period: AUGUST });
    expect(listLinkOf(view(AUGUST, [ACCOUNT, OTHER]))).toEqual({
      accountId: "a1",
      period: AUGUST,
    });
  });
});
