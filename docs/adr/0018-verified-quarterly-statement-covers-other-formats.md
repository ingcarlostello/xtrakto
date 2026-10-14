# 0018. A verified quarterly statement covers the other format's movements

- **Status:** Accepted
- **Date:** 2026-10-14

## Context

Bancolombia gives the same movements in two formats: the quarterly statement, with balances, and the movements export, without them. Users download both, and several export ranges of the same month. Each movement is saved once per account by its fingerprint ([system design §3](../ARCHITECTURE.md#3-ingestion-flow)), but the fingerprint includes the balance after the movement, which only the quarterly statement prints: the same purchase in both formats gets two fingerprints, and Stage 6 would count it twice. Matching the two formats movement by movement is Phase 10.1's work, and it has its own difficulties: the export dates interest one day later, and the quarterly statement can cut a description before an accented letter (roadmap, Appendix A.2).

A quarterly statement can also fail to reconcile (a page or a row missing), and the user can download another version of the same quarter. Its numbers stay out of every summary until it reconciles (decided with the human, design v8).

## Decision

- **Coverage.** A verified quarterly statement covers its days: those after its opening balance's day (`period_from`, the previous quarter's last day, 2026-06-30 for July to September) through its closing balance's (`period_to`). The four real statements open that way, with no movement on the opening day. On those days, a statement without balances (a movements export) keeps its movements, hidden: `transactions.covered_by_statement_id` points at the quarterly statement. It works in both orders: an export saved after the quarterly statement has its movements on those days saved hidden, and a verified quarterly statement saved after an export hides its movements then.
- **What counts.** A movement counts when no statement hides it and its statement reconciles or prints no balances. Every reader uses that predicate, through `@xtrakto/db`: the movements list, the monthly limit's `added`, and Stage 6.
- **A quarterly statement that doesn't reconcile** hides nothing and counts nowhere; its movements show only in "Ver dónde no cuadra" (5.7c), with the closing difference and the positions where the chain of balances breaks, as `reconcile` reports them, saved on the statement.
- **Versions of a period.** A statement with balances is one version of its account's period, unique by index. Another version replaces one that doesn't reconcile, movements included; one that reconciles keeps later versions out. The same content is the same statement. Movements exports have no versions: overlapping ranges are normal and deduplicate by fingerprint.
- **`added`** is the exact change in movements that count, measured in the save's transaction, so a quarterly statement that hides 48 exported movements and brings 379 adds 331.
- The coverage key is `(covered_by_statement_id, account_id, user_id)`, with no action on delete: a statement that hides movements can't be deleted without them, which only happens when a user's data is deleted.

## Alternatives considered

- **Match the two formats now:** Phase 10.1's fuzzy matching, by date with a day's tolerance for interest, normalized description and amount, is far more work than Stage 5 needs to stop counting twice. Coverage keeps every export movement, so 10.1 can match them later and carry their references over.
- **Delete the export's movements on the quarterly statement's days:** simpler to read, but it loses the references (the Nequi numbers' HMACs) that only the export has, and that 10.1 brings to the quarterly statement's movements.
- **Count only quarterly statements:** an export of the current month, which no quarterly statement covers yet, would count for nothing.
- **Replace every earlier version of a period:** re-downloaded movements exports would delete each other's movements; the rule applies only to statements with balances.

## Consequences

- No movement counts twice across the two formats, whichever arrives first, and no statement that doesn't reconcile reaches a summary.
- Every query that reads movements for the user must apply the predicate; it lives in `@xtrakto/db`, next to the queries.
- An export's movements on a covered day stay hidden even when the quarterly statement differs from it; until 10.1, the quarterly statement is the reference.
- Phase 10.1 clears the coverage of the movements it matches, and keeps the rest hidden.
