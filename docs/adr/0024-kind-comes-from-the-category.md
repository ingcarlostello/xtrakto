# 0024. A movement's kind comes from its category

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

What a movement means for the headline numbers, its kind (real spending, income, or money that only moved), drives the summary, the colors and the filters. Schema v1 gave `transactions` a `kind` column next to `category_id`, but `categories.json` already gives each category one kind, and design v8 never lets the two disagree: the detail panel's "Tipo" only narrows the categories to choose from. The rules (Phase 6.1), the user's corrections (6.3), the model (Stage 14) and the LLM (Stage 8) all set the category; a stored kind would have to follow each of them.

## Decision

- **A movement's kind is its category's** (`categoryKind` in `@xtrakto/core`), worked out wherever it's read; a filter by kind in SQL lists the categories of that kind.
- **The `kind` column goes** (migration 0012). Nothing ever wrote it.
- A movement without a category has no kind: money in that no rule knows, which waits for a later stage or the user.

## Alternatives considered

- **Storing the kind with the category:** a second field every writer must keep in step, and a CHECK can't tie them without a migration each time `categories.json` changes.
- **A generated column:** it would need the categories' kinds written in SQL, a copy of `categories.json` to keep in step.

## Consequences

- Moving a category to another kind in `categories.json` changes every movement of it at once, with no migration.
- Summaries (6.4) and the list's filters (6.2b) map categories to kinds in code; a query by kind passes the category ids of that kind.
