import { describe, expect, it } from "vitest";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import { pairCardPayments } from "./card-payments.helpers";

const side = (id: string, date: string, amount: number) => ({
  id,
  date: localDateSchema.parse(date),
  amountMinor: amountMinorSchema.parse(amount),
});

describe("pairCardPayments", () => {
  it("pairs a payment with the card's movement of the same amount, the same day", () => {
    expect(
      pairCardPayments(
        [side("s1", "2026-09-05", -50_000_000)],
        [side("c1", "2026-09-05", 50_000_000)],
      ),
    ).toEqual([{ paymentId: "s1", receivedId: "c1" }]);
  });

  it("pairs one a day apart either way, never two days apart", () => {
    expect(
      pairCardPayments(
        [
          side("s1", "2026-09-05", -50_000_000),
          side("s2", "2026-09-28", -30_000_000),
          side("s3", "2026-10-01", -20_000_000),
        ],
        [
          side("c1", "2026-09-06", 50_000_000),
          side("c2", "2026-09-27", 30_000_000),
          side("c3", "2026-10-03", 20_000_000),
        ],
      ),
    ).toEqual([
      { paymentId: "s1", receivedId: "c1" },
      { paymentId: "s2", receivedId: "c2" },
    ]);
  });

  it("pairs two payments of the same amount one to one, in order, the closest day first", () => {
    expect(
      pairCardPayments(
        [
          side("s2", "2026-09-06", -50_000_000),
          side("s1", "2026-09-05", -50_000_000),
        ],
        [
          side("c1", "2026-09-05", 50_000_000),
          side("c2", "2026-09-06", 50_000_000),
          side("c3", "2026-09-06", 50_000_000),
        ],
      ),
    ).toEqual([
      { paymentId: "s1", receivedId: "c1" },
      { paymentId: "s2", receivedId: "c2" },
    ]);
  });

  it("prefers the same day over one apart, whatever their order, and pairs each card's movement once", () => {
    expect(
      pairCardPayments(
        [side("s1", "2026-09-05", -50_000_000)],
        [
          side("c1", "2026-09-06", 50_000_000),
          side("c2", "2026-09-05", 50_000_000),
        ],
      ),
    ).toEqual([{ paymentId: "s1", receivedId: "c2" }]);
    expect(
      pairCardPayments(
        [
          side("s1", "2026-09-05", -50_000_000),
          side("s2", "2026-09-05", -50_000_000),
        ],
        [side("c1", "2026-09-05", 50_000_000)],
      ),
    ).toEqual([{ paymentId: "s1", receivedId: "c1" }]);
  });

  it("pairs nothing of another amount, or without the card's movement", () => {
    expect(
      pairCardPayments(
        [side("s1", "2026-09-05", -50_000_000)],
        [side("c1", "2026-09-05", 49_999_900)],
      ),
    ).toEqual([]);
    expect(
      pairCardPayments([side("s1", "2026-09-05", -50_000_000)], []),
    ).toEqual([]);
  });
});
