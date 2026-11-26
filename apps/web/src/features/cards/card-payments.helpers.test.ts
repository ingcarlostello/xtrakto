import { localDateSchema } from "@xtrakto/core";
import type { CardPaymentPair } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { pairedText } from "./card-payments.helpers";

const pair = (
  direction: CardPaymentPair["direction"],
  account: CardPaymentPair["account"],
): CardPaymentPair => ({
  direction,
  movementId: "m1",
  date: localDateSchema.parse("2026-09-05"),
  account,
});

describe("pairedText", () => {
  it("names the card a payment reached, and the account a card's payment came from", () => {
    expect(
      pairedText(
        pair("to", {
          id: "c1",
          bankId: "nu",
          accountType: "credit_card",
          last4: "5678",
        }),
      ),
    ).toBe("Llegó a tu tarjeta Nu ••••5678");
    expect(
      pairedText(
        pair("from", {
          id: "s1",
          bankId: "bancolombia",
          accountType: "savings",
          last4: "8901",
        }),
      ),
    ).toBe("Salió de tu cuenta de ahorros ••••8901");
  });
});
