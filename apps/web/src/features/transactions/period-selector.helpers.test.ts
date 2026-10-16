import type { AccountRow, MovementQuarter } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  accountOptions,
  listLinkOf,
  monthOptions,
  periodText,
  quarterOptions,
  selectPeriod,
} from "./period-selector.helpers";
import type { AccountTransactions } from "./transaction.types";

const QUARTERS: MovementQuarter[] = [
  { year: 2026, quarter: 3, verified: true },
  { year: 2026, quarter: 2, verified: false },
];
const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8901",
};
const OTHER: AccountRow = { ...ACCOUNT, id: "a2", last4: null };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

const view = (
  period: MovementPeriod,
  accounts: AccountRow[] = [ACCOUNT],
): AccountTransactions => ({
  accounts,
  account: ACCOUNT,
  quarters: QUARTERS,
  period,
  total: 0,
  items: [],
  currentYear: "2026",
});

describe("selectPeriod", () => {
  it("shows the period asked when its quarter has movements", () => {
    expect(selectPeriod(AUGUST, QUARTERS)).toEqual(AUGUST);
  });

  it.each([
    ["no period", undefined],
    [
      "a quarter without movements",
      { kind: "quarter", year: 2025, quarter: 4 },
    ],
    ["a month of such a quarter", { kind: "month", year: 2026, month: 11 }],
  ] as const)("shows the latest quarter for %s", (_, requested) => {
    expect(selectPeriod(requested, QUARTERS)).toEqual({
      kind: "quarter",
      year: 2026,
      quarter: 3,
    });
  });

  it("shows nothing for an account without quarters", () => {
    expect(selectPeriod(AUGUST, [])).toBeUndefined();
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

describe("options", () => {
  it("lists the quarters with their status, marking the shown one", () => {
    expect(quarterOptions(view(AUGUST))).toEqual([
      {
        key: "2026-q3",
        label: "Jul – sep 2026",
        href: { pathname: "/transactions", query: { period: "2026-q3" } },
        isCurrent: true,
        badge: { label: "Verificado", isOk: true },
      },
      {
        key: "2026-q2",
        label: "Abr – jun 2026",
        href: { pathname: "/transactions", query: { period: "2026-q2" } },
        isCurrent: false,
        badge: { label: "Sin verificar", isOk: false },
      },
    ]);
  });

  it("lists the quarter's months and the whole quarter", () => {
    expect(
      monthOptions(view(AUGUST)).map(({ label, isCurrent }) => [
        label,
        isCurrent,
      ]),
    ).toEqual([
      ["Julio", false],
      ["Agosto", true],
      ["Septiembre", false],
      ["Trimestre", false],
    ]);
  });

  it("keeps the search in every period's link", () => {
    const searching = { ...view(AUGUST), search: "nequi" };

    expect(quarterOptions(searching)[0]?.href.query).toEqual({
      period: "2026-q3",
      q: "nequi",
    });
    expect(monthOptions(searching)[0]?.href.query).toEqual({
      period: "2026-07",
      q: "nequi",
    });
  });

  it("keeps the account in links only when there are several", () => {
    expect(listLinkOf(view(AUGUST))).toEqual({ period: AUGUST });
    expect(listLinkOf(view(AUGUST, [ACCOUNT, OTHER]))).toEqual({
      accountId: "a1",
      period: AUGUST,
    });
  });

  it("opens each account on its latest quarter", () => {
    expect(accountOptions(view(AUGUST, [ACCOUNT, OTHER]))).toEqual([
      {
        key: "a1",
        label: "Cuenta de ahorros · Bancolombia ••••8901",
        href: { pathname: "/transactions", query: { account: "a1" } },
        isCurrent: true,
      },
      {
        key: "a2",
        label: "Cuenta de ahorros · Bancolombia",
        href: { pathname: "/transactions", query: { account: "a2" } },
        isCurrent: false,
      },
    ]);
  });
});
