import { PERIOD_SOURCE, periodSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { exportDestination } from "./account-destination.helpers";
import type { StatementPreview, UploadAccount } from "./upload.types";

const SAVINGS = "Cuenta de ahorros · Bancolombia";

const movements: StatementPreview = {
  bankId: "bancolombia",
  formatId: "bancolombia-movements-export",
  accountType: "savings",
  period: periodSchema.parse({ from: "2026-10-01", to: "2026-10-07" }),
  periodSource: PERIOD_SOURCE.ROWS,
  movementCount: 17,
};

const quarterly = (accountLast4: string): StatementPreview => ({
  bankId: "bancolombia",
  formatId: "bancolombia-savings-quarterly",
  accountType: "savings",
  accountLast4,
  period: periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
  periodSource: PERIOD_SOURCE.STATEMENT,
  movementCount: 33,
});

const account = (id: string, last4: string | null): UploadAccount => ({
  id,
  bankId: "bancolombia",
  accountType: "savings",
  last4,
});

describe("exportDestination", () => {
  it("starts a new account when the user has none and no statement names one", () => {
    expect(exportDestination(movements, [], [movements])).toEqual({
      kind: "known",
      label: SAVINGS,
    });
  });

  it.each([
    ["the user's only account", [account("a", "8901")], [movements]],
    [
      "the account a quarterly statement of the batch names",
      [],
      [quarterly("8901"), movements],
    ],
    [
      "an account the batch's statement also names",
      [account("a", "8901")],
      [quarterly("8901"), movements],
    ],
    [
      "the account without a number, which the statement takes over",
      [account("a", null)],
      [quarterly("8901"), movements],
    ],
  ])("goes to %s", (_case, accounts, batch) => {
    expect(exportDestination(movements, accounts, batch)).toEqual({
      kind: "known",
      label: `${SAVINGS} ••••8901`,
    });
  });

  it("asks when the user has several accounts", () => {
    const accounts = [account("a", "8901"), account("b", "2109")];

    expect(exportDestination(movements, accounts, [movements])).toEqual({
      kind: "choose",
      options: [
        { key: "account:a", label: `${SAVINGS} ••••8901` },
        { key: "account:b", label: `${SAVINGS} ••••2109` },
      ],
    });
  });

  it("asks when a statement of the batch names another account", () => {
    expect(
      exportDestination(movements, [account("a", "8901")], [quarterly("2109")]),
    ).toEqual({
      kind: "choose",
      options: [
        { key: "account:a", label: `${SAVINGS} ••••8901` },
        { key: "last4:2109", label: `${SAVINGS} ••••2109` },
      ],
    });
  });

  it("leaves out accounts of another type", () => {
    const card: UploadAccount = {
      ...account("c", "4321"),
      accountType: "credit_card",
    };

    expect(
      exportDestination(movements, [account("a", "8901"), card], [movements]),
    ).toEqual({ kind: "known", label: `${SAVINGS} ••••8901` });
  });
});
