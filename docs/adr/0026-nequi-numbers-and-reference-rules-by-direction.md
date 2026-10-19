# 0026. Nequi numbers wait for review, and a reference rule holds the ways its category allows

- **Status:** Accepted
- **Date:** 2026-10-19

## Context

Design v8 asks about Nequi sends number by number in the quick review ("¿Alguno de estos números de Nequi es tuyo?", `docs/ui/v8-02`), and counts them among the movements waiting for review, though `v8-03` draws a send as a sure payment to a person. Only movements exports carry the number a send went to; the quarterly statement never does. [ADR 0025](0025-user-rules-come-first-and-keep-the-rules-guess.md) made a reference's rule hold both ways, so its category had to be money that only moves: a number marked as someone else's had no rule to remember it, since a payment to a person is wrong for money coming in from the same number.

## Decision

- **A Nequi send that names its number is a best guess.** A rule can ask what a movement's reference holds (`withReference`), and `nequi_out_number` gives a send with a phone number a payment to a person, waiting for review, before `nequi_out`, which keeps the sends without one sure. The review, its banner and the "Por revisar" count of Movimientos count the same movements.
- **A reference rule holds the ways its category allows** (`referenceRuleDirection`): money that only moves, both; a payment to someone, money going out; an income, money coming in. The categorizer and the recategorization of saved movements read it from the category's kind, with no new column. This amends ADR 0025, where a reference's rule held both ways.
- **The quick review asks by number.** Each number of the quarter shows its sends and an "Es mío" switch; "Guardar" saves a rule for every number, the user's own for those marked and someone else's for the rest, and "Ninguno es mío" someone else's for all. Both are remembered for the next statements: a send to a known number comes categorized, and money in from a number marked as someone else's still asks.

## Alternatives considered

- **Keeping the sends sure, as `v8-03` draws them:** the review would ask about numbers the "Por revisar" count of Movimientos doesn't count.
- **Not remembering a number that isn't the user's:** each new export would ask about it again, as "No sé" does.
- **A direction column on reference rules, or a table of marked numbers:** a migration for what the category's kind already says.

## Consequences

- Sends saved before 6.3d keep `nequi_out` and aren't asked about until they're categorized again.
- A number marked as the user's isn't taken back from the review: its movement's detail undoes it (6.3h), and its movements take the user's rule for their text, else the table's guess again.
- A rule for an income from a reference holds only for money coming in; none is made yet.
