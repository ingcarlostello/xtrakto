import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import {
  recurringPaymentInText,
  recurringPaymentService,
  recurringPaymentTitle,
} from "./recurring-title.helpers";
import type { RecurringPayment } from "./recurring.types";

const amount = (value: number) => amountMinorSchema.parse(value);

// A payment of each month of a quarter, to `label`, as the bank wrote it.
const paidTo = (
  label: string,
  text: string,
  categoryId: CategoryId,
): RecurringPayment => ({
  label,
  referenceLast4: null,
  bankTexts: [text],
  categoryId,
  channels: ["pse"],
  months: [7, 8, 9].map((month) => ({
    month: { year: 2026, month },
    amountMinor: amount(-11_000_000),
    payments: [amount(-11_000_000)],
  })),
  typicalAmountMinor: amount(-11_000_000),
  days: { first: 10, last: 10 },
  lastDate: localDateSchema.parse("2026-09-10"),
  trend: { kind: "stable" },
});

const GAS = paidTo(
  "GAS NATURAL CIUDAD",
  "PAGO PSE GAS NATURAL CIUDAD",
  "utilities",
);
const LOAN = paidTo(
  "Financiera Andes S",
  "PAGO PSE Financiera Andes S",
  "loan_payment",
);
const GYM = paidTo("GIMNASIO FIT", "COMPRA EN  GIMNASIO FIT", "entertainment");
const NEQUI: RecurringPayment = {
  ...paidTo("TRANSFERENCIAS A NEQUI", "TRANSFERENCIAS A NEQUI", "investment"),
  referenceLast4: "1270",
  channels: ["nequi"],
};

describe("recurringPaymentTitle", () => {
  it("names a home service as its words say it", () => {
    expect(recurringPaymentTitle(GAS)).toBe("Gas");
  });

  it.each([
    ["loan_payment", "Cuotas de tu crédito"],
    ["credit_card_payment", "Pago de tu tarjeta"],
    ["investment", "Ahorro o inversión"],
    ["own_account_transfer", "A otra cuenta tuya"],
    ["utilities", "Servicios del hogar"],
  ] as const)("says what a payment of %s pays for", (categoryId, title) => {
    expect(
      recurringPaymentTitle(paidTo("EPM", "PAGO PSE EPM", categoryId)),
    ).toBe(title);
  });

  it("takes the LLM's title of a payment no rule names before its category's", () => {
    expect(
      recurringPaymentTitle({ ...GYM, llmTitle: "Pago de gimnasio" }),
    ).toBe("Pago de gimnasio");
    expect(
      recurringPaymentTitle({
        ...paidTo(
          "HOGAR CONECTADO SA",
          "PAGO PSE HOGAR CONECTADO SA",
          "utilities",
        ),
        llmTitle: "Pago de internet y televisión",
      }),
    ).toBe("Pago de internet y televisión");
  });

  it("keeps who was paid when nothing says what it pays for", () => {
    expect(recurringPaymentTitle(GYM)).toBe("GIMNASIO FIT");
  });

  it("names a number paid by its channel, whatever its category", () => {
    expect(recurringPaymentTitle(NEQUI)).toBe("Nequi ••• 1270");
  });
});

describe("recurringPaymentInText", () => {
  it.each([
    ["a home service", GAS, "gas"],
    ["a category", LOAN, "cuotas de tu crédito"],
    ["the LLM", { ...GYM, llmTitle: "Pago de gimnasio" }, "pago de gimnasio"],
    ["who was paid", GYM, "GIMNASIO FIT"],
    ["a number paid", NEQUI, "Nequi ••• 1270"],
  ])("writes a title by %s as running text does", (_, payment, text) => {
    expect(recurringPaymentInText(payment)).toBe(text);
  });
});

describe("recurringPaymentService", () => {
  it("names the home service of its latest text", () => {
    expect(
      recurringPaymentService({
        ...GAS,
        bankTexts: ["PAGO PSE VANTI SA ESP", "PAGO PSE Electrificadora de"],
      }),
    ).toBe("gas");
  });

  it("names none for a payment of another category", () => {
    expect(recurringPaymentService(LOAN)).toBeUndefined();
  });
});
