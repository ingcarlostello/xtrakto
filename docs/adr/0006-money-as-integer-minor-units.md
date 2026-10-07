# 0006. Money as integer minor units

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Balances must reconcile to the cent: previous balance plus amount equals the next balance, on every row. Floating-point arithmetic drifts (`0.1 + 0.2 !== 0.3`). Statements give amounts as text (`"1,234.56"`, `".00"`) or as numeric spreadsheet cells.

## Decision

Represent every amount as an integer number of minor units (cents), with a branded `AmountMinor` type, always paired with an ISO 4217 currency (`COP` first). Parsers convert text and numeric cells to minor units without floating-point arithmetic. PostgreSQL stores amounts as `bigint`. Amounts are formatted only for display, with `Intl.NumberFormat` and the `es-CO` locale.

## Alternatives considered

- **JavaScript numbers with decimals:** rounding drift breaks exact reconciliation.
- **A decimal library (big.js, decimal.js):** exact, but adds a dependency and a non-JSON type that crosses every boundary.
- **PostgreSQL `numeric`:** exact in the database, but reaches TypeScript as strings.

## Consequences

- Reconciliation compares integers exactly.
- A JavaScript number holds integers exactly up to about 9 × 10^15 minor units (about 90 trillion COP), well above any personal statement.
- Money functions live in `@xtrakto/core` and are covered by table-driven tests.
