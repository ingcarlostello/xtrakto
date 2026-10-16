import { describe, expect, it } from "vitest";
import { accountLabel } from "./account-label.helpers";

const SAVINGS = { bankId: "bancolombia", accountType: "savings" };

describe("accountLabel", () => {
  it("names the account by its type, its bank and only its last 4 digits", () => {
    expect(accountLabel(SAVINGS, "8901")).toBe(
      "Cuenta de ahorros · Bancolombia ••••8901",
    );
  });

  it("leaves the digits out until a statement names them", () => {
    expect(accountLabel(SAVINGS, null)).toBe("Cuenta de ahorros · Bancolombia");
  });
});
