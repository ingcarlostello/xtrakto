import { describe, expect, it } from "vitest";
import { hashIdentifier } from "../hashing/identifier-hash.helpers";
import { prepareStatement } from "./prepared-statement.helpers";
import { parsedStatementSchema } from "./statement.schemas";

const KEY = "test-key-with-at-least-32-characters!";
// The content hash of `statement()` as phases before 12.3a computed it.
const SAVINGS_CONTENT_HASH =
  "5adafb975d0e51d3d1b172c40c4277a859eee7dacb12b970c020906bfb4be67f";

const MOVEMENTS = [
  {
    date: "2026-10-01",
    descriptionRaw: "TRANSFERENCIAS A NEQUI",
    descriptionNormalized: "TRANSFERENCIAS A NEQUI",
    amountMinor: -5_000_000,
    referenceRaw: "3001234567",
    referenceKind: "phone",
    sourceRow: 3,
  },
  {
    date: "2026-10-01",
    descriptionRaw: "TRANSFERENCIAS A NEQUI",
    descriptionNormalized: "TRANSFERENCIAS A NEQUI",
    amountMinor: -5_000_000,
    referenceRaw: "3001234567",
    referenceKind: "phone",
    sourceRow: 2,
  },
  {
    date: "2026-10-02",
    descriptionRaw: "ABONO INTERESES AHORROS",
    descriptionNormalized: "ABONO INTERESES AHORROS",
    amountMinor: 12,
    referenceKind: "none",
    sourceRow: 1,
  },
];

const statement = (movements: readonly object[] = MOVEMENTS) =>
  parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: "bancolombia-movements-export",
    accountType: "savings",
    currency: "COP",
    period: { from: "2026-10-01", to: "2026-10-02" },
    periodSource: "rows",
    transactions: movements,
    warnings: [],
  });

const PURCHASE = {
  date: "2026-08-20",
  descriptionRaw: "Almacen Ropa",
  descriptionNormalized: "Almacen Ropa",
  amountMinor: -12_000_000,
  installment: {
    number: 1,
    count: 12,
    monthlyMinor: 1_000_000,
    monthlyRatePpm: 20_500,
    remainingMinor: 11_000_000,
  },
  sourceRow: 4,
};

const PAYMENT = {
  date: "2026-09-01",
  descriptionRaw: "Gracias por tu pago",
  descriptionNormalized: "Gracias por tu pago",
  amountMinor: 5_000_000,
  sourceRow: 6,
};

const CARD = {
  creditLimitMinor: 500_000_000,
  availableMinor: 488_000_000,
  minimumPaymentMinor: 1_200_000,
  totalPaymentMinor: 7_000_000,
  dueDate: "2026-10-04",
  cutDate: "2026-09-11",
  summary: {
    kind: "nu",
    dueThisMonthMinor: 1_000_000,
    interestMinor: 200_000,
    advanceFeesMinor: 0,
    serviceFeesMinor: 0,
    conversionChargesMinor: 0,
    paymentsToMinimumMinor: 0,
    refundsMinor: 0,
    paymentsToTotalMinor: 5_000_000,
    remainingDebtMinor: 11_000_000,
  },
};

// A month of a card: a purchase in installments and a payment.
const cardStatement = (
  card: object = CARD,
  movements: readonly object[] = [PURCHASE, PAYMENT],
) =>
  parsedStatementSchema.parse({
    bankId: "nu",
    formatId: "nu-credit-card-pdf",
    accountType: "credit_card",
    accountLast4: "5678",
    currency: "COP",
    period: { from: "2026-08-12", to: "2026-09-10" },
    periodSource: "statement",
    card,
    transactions: movements,
    warnings: [],
  });

describe("prepareStatement", () => {
  it.each([
    { name: "a phone number", kind: "phone", raw: "3001234567", last4: "4567" },
    { name: "a code", kind: "code", raw: "0000123456", last4: "3456" },
    { name: "contract numbers", kind: "code", raw: "123 4567", last4: "4567" },
    {
      name: "a code of 5 digits",
      kind: "code",
      raw: "12345",
      last4: undefined,
    },
    { name: "an ATM", kind: "atm", raw: "ATM 123456 CENTRO", last4: undefined },
  ])("keeps the last 4 digits of $name", async ({ kind, raw, last4 }) => {
    const [movement] = (
      await prepareStatement(
        statement([
          { ...MOVEMENTS[0], referenceKind: kind, referenceRaw: raw },
        ]),
        KEY,
      )
    ).transactions;

    expect(movement?.referenceLast4).toBe(last4);
  });

  it("replaces raw references with their HMAC, and keeps no source rows", async () => {
    const [first, , interest] = (await prepareStatement(statement(), KEY))
      .transactions;

    expect(first?.referenceHash).toBe(await hashIdentifier("3001234567", KEY));
    expect(interest?.referenceHash).toBeUndefined();
    expect(first).not.toHaveProperty("referenceRaw");
    expect(first).not.toHaveProperty("sourceRow");
  });

  it("numbers twins and keeps the statement's order", async () => {
    const prepared = (await prepareStatement(statement(), KEY)).transactions;

    expect(
      prepared.map(({ occurrenceIndex, position }) => ({
        occurrenceIndex,
        position,
      })),
    ).toEqual([
      { occurrenceIndex: 0, position: 0 },
      { occurrenceIndex: 1, position: 1 },
      { occurrenceIndex: 0, position: 2 },
    ]);
    expect(new Set(prepared.map((t) => t.fingerprint)).size).toBe(3);
  });

  it("gives the same statement the same content hash, and a changed one another", async () => {
    const original = await prepareStatement(statement(), KEY);
    const again = await prepareStatement(statement(), KEY);
    const corrected = await prepareStatement(
      statement(
        MOVEMENTS.map((movement, index) =>
          index === 2 ? { ...movement, amountMinor: 13 } : movement,
        ),
      ),
      KEY,
    );

    expect(again.contentHash).toBe(original.contentHash);
    expect(corrected.contentHash).not.toBe(original.contentHash);
  });

  // Saved statements are found again by it: re-uploading a file must match.
  it("keeps the content hash a statement without a card had", async () => {
    const prepared = await prepareStatement(statement(), KEY);

    expect(prepared.card).toBeUndefined();
    expect(prepared.contentHash).toBe(SAVINGS_CONTENT_HASH);
  });

  it("keeps a card's installments with its figures, by their purchase's fingerprint", async () => {
    const prepared = await prepareStatement(cardStatement(), KEY);
    const [purchase, payment] = prepared.transactions;

    expect(prepared.card).toEqual({
      ...CARD,
      installments: [
        { ...PURCHASE.installment, fingerprint: purchase?.fingerprint },
      ],
    });
    expect(purchase).not.toHaveProperty("installment");
    expect(purchase?.amountMinor).toBe(-12_000_000);
    expect(payment?.amountMinor).toBe(5_000_000);
  });

  it.each([
    ["its figures", cardStatement({ ...CARD, minimumPaymentMinor: 1_300_000 })],
    [
      "an installment",
      cardStatement(CARD, [
        {
          ...PURCHASE,
          installment: { ...PURCHASE.installment, remainingMinor: 10_000_000 },
        },
        PAYMENT,
      ]),
    ],
  ])(
    "gives a card's statement another content hash when %s change",
    async (_, changed) => {
      const original = await prepareStatement(cardStatement(), KEY);
      const again = await prepareStatement(cardStatement(), KEY);

      expect(again.contentHash).toBe(original.contentHash);
      expect((await prepareStatement(changed, KEY)).contentHash).not.toBe(
        original.contentHash,
      );
    },
  );
});
