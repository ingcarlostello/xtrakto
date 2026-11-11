# 0037. Another bank's formats: proven where the file is, shared once their balances prove them

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

Stage 11 reads a spreadsheet no parser knows through a mapping that says what each column holds (Phase 11.1a): the LLM proposes one (11.2) and the person confirms it (11.3). The file never leaves the browser ([ADR 0008](0008-files-read-in-the-browser.md)) and only what its parser reads goes up ([ADR 0017](0017-content-minimized-before-sending.md)), so only the browser has the whole file, while the server's parse is the authoritative one ([ADR 0009](0009-deterministic-parsing-first.md)). A mapping holds no one's data (a header's names, each column's role, its formats and a bank), so the roadmap's outline kept them all global; but a person can confirm a wrong one, and a shared mapping reads everyone's files of its format. Every table forces Row-Level Security: a user's id on each row of a user's data, or no id on a table any user reads ([ADR 0014](0014-forced-rls-with-transaction-local-user.md), [ADR 0033](0033-llm-categories-after-ingestion-from-a-shared-cache.md)).

## Decision

- **Proven where the file is, then on the server.** The browser reads the whole file with each proposal and shows how it adds up (11.3); once the person confirms, it sends the mapped columns under the header, with the mapping. The server finds the content's table (`findTable`), requires the mapping's header to be that table's, reads the table whole and reconciles it. It reads every later file of the format the same way, when it's submitted and when it's ingested.
- **Two tables.** `format_mappings` keeps a mapping its balances proved, by the SHA-256 of its header's names (`formatFingerprint`): linked to no one, any user's context reads one and adds one, none changes or deletes one, and a format keeps the first. `user_format_mappings` keeps the mapping each person confirmed for a format, under the per-user policy: their next confirmation replaces it, and deleting them takes it.
- **A confirmed mapping is always its person's, and everyone's once its balances add up,** unless the format has a shared one already. A person's mapping reads their files before the shared one, so their latest confirmation is theirs and a mistake stays theirs.
- **No job keeps its mapping:** ingestion finds it again by the content's header, as the submission did.
- **The rules hold for every bank** ([ADR 0023](0023-rules-give-a-best-guess-and-flag-what-to-review.md), amended): they read Colombia's banking words (PSE, compra, retiro, 4x1000), not Bancolombia's layout; what no rule names goes to the LLM, as Bancolombia's does.

## Alternatives considered

- **One table with an optional user id:** a row of a user's data without its id breaks ADR 0014's rule, which the catalog's test enforces.
- **Every mapping global, as the outline had it:** one person's wrong confirmation would misread everyone's files of its format.
- **The whole table to the server, proven there:** the columns no mapping reads (a branch, a document's number) and the title rows above the table, with the holder's name and account, would leave the browser, against ADR 0017.
- **The job keeping its mapping's id:** a person's mapping is replaced in place, and two tables share no key.

## Consequences

- The balances prove the amounts, not which column is the description: a shared mapping that reads the wrong one reaches everyone with its format until the owner role fixes it, and a person who confirms another reads their own files their way.
- Two banks with the same header share a format, read under the first one's bank; their numbers stay right.
- A saved mapping the schema no longer reads counts as none, so its format is asked about again.
- Another bank's file prints no holder's name, so a transfer to the person's own name there reads as a payment to someone until they correct it.
