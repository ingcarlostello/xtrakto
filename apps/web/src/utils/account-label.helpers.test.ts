import { describe, expect, it } from "vitest";
import { accountLabel, accountShortLabel } from "./account-label.helpers";

const SAVINGS = { bankId: "bancolombia", accountType: "savings" };

describe("accountLabel", () => {
  it("names the account by its type, its bank and only its last 4 digits", () => {
    expect(accountLabel(SAVINGS, "8901")).toBe(
      "Cuenta de ahorros · Bancolombia ••••8901",
    );
  });

  it("keeps the digits in a short label", () => {
    expect(accountShortLabel(SAVINGS, "8901")).toBe(
      "Cuenta de ahorros ••••8901",
    );
    expect(accountShortLabel(SAVINGS, null)).toBe("Cuenta de ahorros");
  });

  it("leaves the digits out until a statement names them", () => {
    expect(accountLabel(SAVINGS, null)).toBe("Cuenta de ahorros · Bancolombia");
  });
});
