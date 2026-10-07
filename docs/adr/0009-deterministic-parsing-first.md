# 0009. Deterministic parsing first, LLM as a fallback

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Known bank formats can be parsed exactly and proven correct by reconciling balances. LLMs are probabilistic, cost money on every call, and must never see personal data. The free tier caps LLM spend at USD 1 per user per month.

## Decision

Known formats are parsed by deterministic parsers and verified by `reconcile()`. Categorization falls through user rules, global rules, the project's own model (Stage 14) and, only then, an LLM (Stage 8); whatever remains waits for the user. The LLM never computes amounts and only receives redacted text. For unknown formats, an agent proposes a column mapping that must reconcile before it is saved, so the next file from that bank is parsed deterministically (Stage 11).

## Alternatives considered

- **LLM extraction for every file:** non-deterministic amounts, a cost per file, personal data sent to a provider, and results that are hard to test.

## Consequences

- Deterministic paths are free, exact and covered by tests.
- If every LLM provider fails, statements still load and summaries still compute; only uncategorized rows wait.
- Supporting a new bank means adding a parser or saving a verified mapping.
