import type { AccountRow } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  type MovementPeriod,
  periodParam,
} from "@/utils/transactions-url.helpers";
import type {
  HrefOf,
  PeriodChoices,
  QuarterChoice,
} from "./period-controls.types";
import {
  accountOptions,
  monthOptions,
  periodLinkOf,
  quarterOptions,
} from "./period-options.helpers";

const QUARTERS: QuarterChoice[] = [
  { year: 2026, quarter: 3, status: "verified" },
  { year: 2026, quarter: 2, status: "unverified" },
];
const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8901",
};
const OTHER: AccountRow = { ...ACCOUNT, id: "a2", last4: null };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

// A page's own links, as Pagos fijos writes them.
const hrefOf: HrefOf = ({ accountId, period }) => ({
  pathname: "/recurring",
  query: {
    ...(accountId === undefined ? {} : { account: accountId }),
    ...(period === undefined ? {} : { period: periodParam(period) }),
  },
});

const choices = (accounts: AccountRow[] = [ACCOUNT]): PeriodChoices => ({
  accounts,
  account: ACCOUNT,
  quarters: QUARTERS,
  period: AUGUST,
});

describe("period options", () => {
  it("lists the quarters with their status, marking the shown one, as the page's links", () => {
    expect(quarterOptions(choices(), hrefOf)).toEqual([
      {
        key: "2026-q3",
        label: "Jul – sep 2026",
        href: { pathname: "/recurring", query: { period: "2026-q3" } },
        isCurrent: true,
        badge: { label: "Verificado", variant: "ok" },
      },
      {
        key: "2026-q2",
        label: "Abr – jun 2026",
        href: { pathname: "/recurring", query: { period: "2026-q2" } },
        isCurrent: false,
        badge: { label: "Sin verificar", variant: "neutral" },
      },
    ]);
  });

  it("lists the quarter's months and the whole quarter", () => {
    expect(
      monthOptions(choices(), hrefOf).map(({ label, isCurrent }) => [
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

  it("keeps the account in period links only when there are several", () => {
    expect(monthOptions(choices(), hrefOf)[0]?.href.query).toEqual({
      period: "2026-07",
    });
    expect(
      monthOptions(choices([ACCOUNT, OTHER]), hrefOf)[0]?.href.query,
    ).toEqual({ account: "a1", period: "2026-07" });
  });

  it("links to the page's period, with the account only when there are several", () => {
    expect(periodLinkOf(choices())).toStrictEqual({ period: AUGUST });
    expect(periodLinkOf(choices([ACCOUNT, OTHER]))).toStrictEqual({
      accountId: "a1",
      period: AUGUST,
    });
  });

  it("opens each account on its latest quarter", () => {
    expect(accountOptions(choices([ACCOUNT, OTHER]), hrefOf)).toEqual([
      {
        key: "a1",
        label: "Cuenta de ahorros · Bancolombia ••••8901",
        href: { pathname: "/recurring", query: { account: "a1" } },
        isCurrent: true,
      },
      {
        key: "a2",
        label: "Cuenta de ahorros · Bancolombia",
        href: { pathname: "/recurring", query: { account: "a2" } },
        isCurrent: false,
      },
    ]);
  });
});
