# 0023. Rules give a best guess and flag what to review

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

Stage 6 categorizes movements without an LLM first ([system design §6](../ARCHITECTURE.md#6-categorization)). Most of Bancolombia's texts say what a movement is (`ABONO INTERESES AHORROS`, `TRANSFERENCIAS A NEQUI`), but some can't be classified alone: a Bre-B key payment can go to a person, a store or the user's own savings, and a deposit at a _corresponsal_ can be the user's cash or a payment to them. Design v8 counts those by a best guess until the user answers, and the quick review (Phase 6.3) asks about them by group, so each movement's guess and why it was made must outlive its ingestion. Inngest keeps step outputs ([ADR 0019](0019-two-inngest-steps-with-ids-codes-and-counts.md)). The channel tag of each movement ("PSE", "Nequi") comes from the same texts.

## Decision

- **Rules are data in `@xtrakto/core`** (`CATEGORIZATION_RULES`). Each one matches the description's folded words, never letters inside a word, says which way the money goes, and gives a category, whether it's only a guess, and the reason the movement's detail shows. The first rule that matches wins; with none, the movement keeps no category for the LLM (Stage 8). The table comes from ROADMAP Appendix B, bank texts the private test finds in real files, and public merchant names.
- **A pure step, `categorizeStatement`, runs after `prepareStatement`**, inside `ingest`'s transaction and in the seed. `saveStatement` requires its output, so a statement can't be saved without it.
- **Each movement keeps** its `category_id`, `category_source = 'rule'`, the rule's id (`category_rule_id`) and whether the category waits for review (`pending_review`). CHECK constraints allow a rule's id only with a category a rule gave, and a review only with a best guess. A rule's id is a stored contract: it's never renamed or reused.
- **The channel is worked out when read** (`channelOf`), from the start of the bank's text, and isn't stored.

## Alternatives considered

- **An Inngest step of its own:** it would read and write the movements by ids for nothing while the rules are pure and fast. The LLM fallback may need one.
- **A confidence score instead of a flag:** a rule either knows or guesses, and the quick review needs a yes or a no and a group, which the rule's id gives.
- **Storing the reason's text or the channel:** both follow from the rule's id and the bank's text, and a stored copy would go stale when the copy or the table changes.
- **Categorizing inside `prepareStatement`:** it deals with identity and privacy (fingerprints, HMACs), and categories will also read the account's holder name (6.2) and the user's own rules (6.3).

## Consequences

- A movement keeps the category it was saved with when the rules change (`ON CONFLICT DO NOTHING`): before the private beta (Phase 7.2), the movements whose source is `rule`, never the user's, need categorizing again.
- The detail panel (6.3) shows a rule's reason by its id, with a generic one for an id the table no longer has.
- Filtering by channel (`docs/ui/v8-03`) will need the prefixes in SQL, or the channel stored.
- The rules are Bancolombia's; another bank's (Stage 11) will key them by bank.
