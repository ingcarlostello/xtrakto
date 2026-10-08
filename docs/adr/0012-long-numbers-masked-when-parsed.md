# 0012. Long numbers in descriptions are masked when parsed

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The [privacy boundaries](../ARCHITECTURE.md#4-privacy-boundaries) forbid storing full account or phone numbers. Bank descriptions can contain them: the quarterly statement prints `INTERES INV VIRT <investment account number>`, and other descriptions may carry IDs or phone numbers. Descriptions are stored for months, shown in the UI, compared across formats to deduplicate movements, and redacted before any LLM call.

## Decision

Parsers mask every run of six or more digits in a description, keeping the last four and the text's length: `INTERES INV VIRT 27608017525` becomes `INTERES INV VIRT *******7525`. The mask applies to both `descriptionRaw` and `descriptionNormalized`, so `descriptionRaw` is the printed text with those digits hidden. Every parser uses the same function, `maskLongNumbers` in `@xtrakto/parsers`.

## Alternatives considered

- **Mask at persistence (Phase 5.5):** the full number would still travel through the browser preview, the server and any log or error built from a parsed statement.
- **A placeholder such as `[NUMBER]`, as `redactPii` does for LLMs:** the user could no longer recognize the account, and descriptions would change length.
- **A fixed `****` before the last four digits:** six- and seven-digit numbers would grow, and a long description could exceed the 500-character bound of the parsed statement schema.

## Consequences

- Full account, ID and phone numbers in descriptions never leave the parser; the last four digits stay visible, as with `accountLast4`.
- Deduplication across formats still works: both formats print the same description, so it masks to the same text.
- Categorization rules can't rely on long numbers in descriptions; none in Appendix B does.
- A merchant code of six or more digits is masked too; the description stays recognizable by its words.
- `redactPii` still runs before any LLM call.
