# 0025. The user's rules come first and keep the rule's guess

- **Status:** Accepted; amended by [0026](0026-nequi-numbers-and-reference-rules-by-direction.md), where a reference's rule holds the ways its category allows
- **Date:** 2026-10-16

## Context

Phase 6.3 lets the user answer the quick review by group and correct a movement, and design v8 remembers every answer for the next statements ("Recordamos tus respuestas para los próximos extractos"; "Tus reglas" in `docs/ui/v8-05`). An answer names a bank text going one way ("PAGO LLAVE INVERSIONES XY" is the user's investment) or a reference (a Nequi number is the user's), and it must hold for the movements already saved, in any statement, and for those still to come. v8 also keeps the groups the user answered on the review screen, closed and with "Cambiar", so the review must still know which rule guessed a movement after the user decides. [ADR 0023](0023-rules-give-a-best-guess-and-flag-what-to-review.md) allowed a rule's id only on a category a rule gave.

## Decision

- **A `user_category_rules` table** holds each user's rules, with forced Row-Level Security like the other tables with a user's data. A rule is a bank text, folded as `userRuleTextOf` writes it, with the direction of its money; or a reference's HMAC, which holds both ways, with its last 4 digits to show it. A new answer replaces the earlier one for the same text and direction, or the same reference. The bank's `0` never makes a rule, since it says nothing of what a movement was.
- **The user's rules come first.** `categorizeStatement` gives a movement the category of its reference's rule, then of its text's, and only then the table's. The user's category is never a guess.
- **A movement keeps the table's rule that matched.** `category_rule_id` stays when the user decides, so the review shows the groups already answered, and the labels of Stage 14 keep what the rule guessed next to what the user said. The CHECK now allows a rule's id with a category a rule or the user gave, and only a rule's guess may wait for review.
- **Saving a rule recategorizes the user's movements it holds for**, in any statement, hidden or not. SQL can't fold text, so the user's distinct texts going that way are read first and compared in TypeScript.

## Alternatives considered

- **Updating only the movements the user answered:** the next statement would ask again, and an older statement of the same text would keep the guess.
- **Dropping the rule's id when the user decides:** the answered groups would vanish from the review on a reload, and the guess would be lost for Stage 14.
- **Storing a folded copy of each description:** SQL could then match a text rule, but every movement would carry a second text to keep in step with the folding.
- **One rule per review group:** a group gathers several texts, and the rule of each text is what holds for the next statements.

## Consequences

- An answer changes movements of every period and account of the user, as "Tus reglas" promises ("aplicado a todos tus extractos").
- A rule whose text the bank writes differently next time doesn't hold; the review asks again.
- Saving a text's rule leaves the movements already saved that a reference's rule holds, as ingestion does (6.3g); before 6.3g it gave them its category too.
- Undoing an answer (6.3h) must recategorize its movements by the table again, from their texts and the account's holder name.
