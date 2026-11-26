# 0040. A card's purchases count in full when made, and its payments only move money

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

Stage 12 reads credit card statements (Bancolombia's in Excel and PDF, Nu's in PDF; ROADMAP Appendix A.4, A.5) and, from 12.3a, saves them. A card statement doesn't look like a savings account's:

- A purchase in 24 installments appears in the month it was made ("1 de 24"), and again in every later statement ("2 de 24", Bancolombia's "Movimientos antes del periodo"), with the same date and value, until it's paid.
- Each statement prints what it charges of each purchase that month: the installment, the rate and what remains.
- A payment reaches the card from the person's savings account. That account already has it as a payment to the card (`credit_card_payment`), money that only moved.
- The bank's own sums check a card statement, not a chain of balances.
- Its texts are a merchant's name ("SUPERMERCADO EL ARCO"), the card's own words ("INTERESES CORRIENTES", "Gracias por tu pago"), or a balance transfer ("COMPRA DE CARTERA").

Real spending has to count the purchase once, and the two sides of a payment can't both count as spending or income.

## Decision

- **A purchase counts in full on the day it was made**, as real spending of its whole value, as the bank's "Compras del mes" counts it. Installments are no movements: what a statement charges of each purchase is kept with the statement's figures, by the purchase's fingerprint, in its `card` column (JSON that core's `preparedCardSchema` reads back). A later statement that lists the purchase again adds no movement, but keeps its own installment.
- **A card's movement belongs to the statement of its own period.** The first statement that lists a purchase saves it. When the statement of the purchase's month arrives later, the purchase moves to that statement, at the position that statement prints. So whether it counts depends on its own month's statement, in either upload order.
- **A payment to the card only moves money** (`credit_card_payment`, money in), never income, as the savings side of the payment is never spending. A balance transfer ("COMPRA DE CARTERA") moves another bank's debt to the card: `credit_card_payment` going out, never spending.
- **What the card costs is real spending:** interest, late interest, the card's fee and conversion charges go to "Costos del banco" (`taxes_and_fees`), and an advance to "Efectivo". A refund is income (`refund`).
- **A card's rules hold only on a card's account** (`accountType` on a rule and in the categorization's context), so "ABONO …" or "INTERESES …" in a savings account never takes them. On a card, the rules for purchases (those that start with `PAYMENT_PREFIXES`) read the whole text, since a card writes no "COMPRA EN": a merchant no rule names is "Otros", which the LLM may name (8.5).
- **A card statement is a version of its period**, as a quarterly statement is: its Excel and its PDF are two versions, and the second adds nothing once the first reconciles. One that doesn't reconcile counts nowhere until a version that does replaces it.

## Alternatives considered

- **Each installment as spending in the month it's charged:** it matches the money that leaves the savings account each month, but the spending happened when the purchase was made. Then the two months each count part of the same purchase, and the bank's "Compras del mes" doesn't add up to Xtrakto's figure.
- **A payment to the card as spending on the savings side, and the card's purchases left out:** a payment that covers several months' purchases would count as spending in one month, and the purchases would never get their categories.
- **The installment on the movement, as the statement that saved it printed it:** simpler, but a later statement's installment would be lost, and "Cuotas que te faltan" (12.3d) needs what the latest statement still charges.
- **Columns for the card's figures and a table for installments:** more checks in SQL, but each bank's summary differs, so it would be JSON anyway, and nothing filters or adds up these figures in SQL. The human chose JSON (12.3a).
- **Keeping a purchase with the first statement that listed it:** whether it counted would depend on the upload order whenever one of the two statements doesn't reconcile.

## Consequences

- Real spending and categories hold across a card and the savings account that pays it. 12.3e links the two sides of a payment, which both already count as moved.
- **Amended in 12.3e (decided with the human):** the two sides are paired when either statement is saved, in either order, and the link is kept on the payment (`paid_card_movement_id`), rather than worked out when read. The same amount, out of the savings account and into the card, the same day or one apart, the oldest payment first with the closest day, each side once. A paired payment waits for no review, so the quick review, its banner, Movimientos and the email count the same; when the card's movement goes, only the link empties, and the next save pairs it again. Worked out when read, every reader that counts what waits for review would pair on its own, and two payments of the same amount on one day can't pair one to one in a query.
- Readers of installments (12.3d, 12.5b) read the statements' `card` column and join by fingerprint, outside SQL.
- A statement that doesn't reconcile counts none of its own period's movements, including the purchases a later statement lists again.
- Card texts beyond those the human's statements show (another bank's refunds or fees) fall to "Otros" or no category until a rule names them; the private test reports how the rules read the real statements, in percentages only.
