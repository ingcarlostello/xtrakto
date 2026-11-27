# 0043. A card's rate against the usury of its statement's month, rounded as its bank prints it

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

From 12.4b, "Tu tarjeta" and a purchase's detail compare a card's rate with the usury rate the Superintendencia Financiera certifies each month for consumer credit (12.4a, [ADR 0042](0042-usury-rates-from-the-superintendencias-history.md)). Saying that a bank charges past the usury is saying that it breaks the law, so the comparison must never say it wrongly. Four things had to be settled:

- **Which rate.** Bancolombia prints a table of rates by kind (purchases in one installment and in 2 to 36, advances, late interest), monthly with four decimals and effective annual; until 12.4b no parser read it. Nu prints a monthly rate with two decimals on each purchase, a purchase in one included, and one statement can print two different rates.
- **Which month.** A card's statement spans two calendar months, Nu's from the 12th to the 10th (ADR 0041).
- **Rounding.** A rate printed with two decimals may be up to half a hundredth of a percent from the one charged: a bank that charges exactly the usury's monthly rate can print one that converts to a hair above it.
- **Display.** An annual rate reads with two decimals, like the usury the Superintendencia certifies.

The human's real statements, read locally with yes/no answers only:

- every printed rate is under the usury of the month its statement closes in;
- Bancolombia's rates, and one of Nu's three statements, are above the usury of the month the cycle starts in;
- Bancolombia's annual rates are its monthly ones compounded, within a millionth.

## Decision

- **The rate** (decided with the human): the rate Bancolombia prints for purchases in 2 to 36 installments, now read from its rates' table in Excel and PDF (`card.purchaseRatePpm`); the highest Nu prints on the purchases of its statement; and in a purchase's detail, its own installment's rate. The annual rate is the monthly one compounded twelve times.
- **The month:** the usury of the month the statement closes in, the card's month (ADR 0041). The real statements show both banks' printed rates follow it.
- **Three states** (decided with the human), judged on the annual rate as it reads, to a hundredth of a percent:
  - _past the usury_ only when, however its bank rounded the monthly rate it prints (half of its last decimal: Bancolombia's fourth, Nu's second), the annual rate reads above the usury;
  - _below_ only when it reads below however it was rounded;
  - _at the usury_ ("en el tope") otherwise.
- **The words:** the attention surface and "Por ley no puede cobrar más: pídele a tu banco que la revise." only past the usury. Below and at it, a plain line or fact. Without the month's usury, the rate alone.

## Alternatives considered

- **The usury of the month the cycle starts in, or the highest of the cycle's months:** the first would have flagged the human's real statements; the second would miss a real excess when the usury falls.
- **Bancolombia's highest installment rate, without reading its rates' table:** works for statements already saved, but a balance transfer's rate isn't the purchase rate (decided with the human).
- **Two states, as the roadmap first said:** a rate within rounding of the usury would read either "below" beside an annual figure above it, or "past it" from a rounding.
- **One tolerance for every bank, Nu's:** Bancolombia's four decimals would hide a real excess of up to 0.07 points a year.

## Consequences

- A rounding never makes Xtrakto say a bank breaks the law, and the state always agrees with the figures shown. An excess smaller than the bank's own rounding reads as "en el tope".
- Bancolombia's statements saved before 12.4b keep no purchase rate. Uploading the same file again stays out as another version of its period, since the saved one reconciles: "Tu tarjeta" shows its rate from the next statement on.
- The comparison needs the month's usury saved: a month the cron hasn't brought shows the rate alone.
- Another bank's card needs its decimals in `PRINTED_RATE_DECIMALS`, in `@xtrakto/core`.
