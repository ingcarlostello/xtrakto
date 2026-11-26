# 0041. A card's months are its statements' cycles

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

From 12.3c a card has a summary of its own, and it joins the account switch of every page with period controls (Resumen, Movimientos, Pagos fijos, Categorías). Until then, every period was a calendar month, quarter or year (`periodDays`), and an account's quarters to choose from were those its movements fall in.

A card's statement doesn't follow the calendar. Nu's September statement runs from 12 August to 10 September; Bancolombia's, from 31 August to 30 September (Appendix A.4, A.5). Each bank titles it by the month it closes in ("Llegó tu extracto de Septiembre"), and 12.3b names it the same way on the upload screen and in "Lo que tienes".

A calendar September of a Nu card would join the end of one statement and the start of the next. Its real spending would match neither statement's "Compras del mes". The debt, the minimum and the due date that "Tu tarjeta" shows belong to one statement, not to a calendar month.

## Decision

- **A card's month is its statement's cycle,** named by the month it closes in: Nu's "Septiembre" is 12 August to 10 September. Its quarter runs from its first month's cycle through its third's, and its year through the cycles that close in it. Decided with the human (12.3c).
- **The days are worked out when read,** from the periods of the card's statements (`listCardPeriods`), by `pageDays` in `apps/web`. A month without its statement runs between its neighbors' cycles, or to its nearest cycle's cut day, so a purchase a later statement lists from it still falls in a month. Any other account's periods stay the calendar's.
- **A card's quarters to choose from are those its statements close in,** verified when each one there reconciles by its bank's sums, and "No cuadra" when one doesn't. A card's months in its coverage, its years' "N de 12 meses" and its missing months follow the same closing months (12.3b).
- **Every page with period controls reads those days,** since the account switch and the period controls are shared, and the summary's tiles link to Movimientos with the same period.
- **The URL doesn't change:** `?period=2026-09` is a card's September cycle as much as a savings account's calendar September.

## Alternatives considered

- **Calendar months for a card, like a savings account's:** no change to how periods are read, but a month would mix two statements, so its real spending would match neither statement, and "Tu tarjeta" couldn't say which statement its figures come from.
- **Cycles on the summary alone:** less to change, but the summary's "Ver en qué gastaste" would open Movimientos on other days, with other totals.
- **A period kind of its own in the URL (a statement's id):** exact, but every page's period controls, links and year would need a second kind of period, and a month without its statement couldn't be chosen.

## Consequences

- A card's figures match its bank's statement: a month's real spending is the cycle's purchases, interest and fees, and "Tu tarjeta" shows that statement's debt and what's due.
- A card's calendar month can't be read. Comparing a card with a savings account month by month (12.3e and later) has to say that a card's month is its cycle.
- Code that turns a period into days must use the account's cycles: `pageDays(period, cycles)` instead of `periodDays(period)`, wherever the account may be a card. The quick review and the upload's notices stay by calendar quarter, since a card's statement has nothing to review.
