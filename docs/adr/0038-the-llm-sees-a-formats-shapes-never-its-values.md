# 0038. The LLM sees a format's shapes, never its values

- **Status:** Accepted
- **Date:** 2026-11-11

## Context

For a spreadsheet no parser knows, an LLM proposes what each column holds (Phase 11.2b), the person confirms it (11.3) and the code proves it by reconciling ([ADR 0037](0037-other-banks-formats-proven-where-the-file-is.md)). The LLM is DeepSeek's API, which keeps data in China, may train on it and states no retention ([ADR 0031](0031-deepseek-api-for-llm-calls.md)). The roadmap's outline sent the header and up to 10 sample rows, redacted; but redaction keeps what makes a row useful to a model, and that is what makes it the person's: their dates, their amounts and their merchants. The proposal also runs before the person confirms anything, and the server receives no value of a file until then ([ADR 0017](0017-content-minimized-before-sending.md)).

## Decision

- **Names and shapes only.** The browser, which holds the file, builds the sample (`formatSample`, `@xtrakto/parsers`): the header's names, as the format's fingerprint writes them (uppercase, without accents, each digit a 9) and redacted with `redactPii`; and the shapes of the first 10 rows of the table, a shape for each column. In a shape each letter is an `A` or an `a`, each digit a `9`, spaces and ASCII punctuation stay and anything else is a `?`; a date cell is `9999-99-99`, and a shape keeps 40 characters at most. "15/03/2026" reaches DeepSeek as "99/99/9999", "-85.400,00" as "-99.999,99", and "COMPRA EN TIENDA" as "AAAAAA AA AAAAAA".
- **The server checks it.** `proposeFormatMapping` takes the sample through `formatSampleSchema` (`@xtrakto/core`), which refuses any shape with a letter or a digit but `A`, `a` and `9`, or a character outside ASCII; it redacts the names again with the user's holder names, and the user's ledger pays for the call (8.3).
- **The LLM answers roles only.** The prompt `propose-mapping` v1 asks for each column's role; its schema refuses roles that read no table or a count other than the columns', so the fallback model answers instead.
- **The code reads the formats, from the cells, in the browser.** `mappingFromRoles` takes the order that reads every date of the date column (the day first when more do), the decimal separator most amounts say by the digits after their last separator, and a direction column's words for each way from the words banks use ("D" and "C", "Débito" and "Crédito", "+" and "-"). A shape can't say which word is money in, and the cells can prove the formats; the balances then prove the mapping, as ADR 0037 has them.

## Alternatives considered

- **Redacted sample rows, as the outline had it:** merchants, amounts and dates would still leave, and `redactPii` misses names without a transfer's prefix.
- **The header's names alone:** abbreviated or English names, a second date or two balances can't be told apart without seeing how the cells are written.
- **No LLM, rules on the names:** they break on every bank's own words; the person would map most files by hand.
- **The LLM reading the formats too:** it would need the values; and the code can prove a format against every cell, where a model guesses from ten.

## Consequences

- No value of another bank's file reaches the server or DeepSeek before the person confirms its mapping: tests prove it over the parsers' five invented banks and the eval's 48 layouts, and the schema refuses a sample that holds one.
- The model can't tell which of two balances changes with each movement, nor a reference column that is mostly empty: it guesses from names, and the person, the balances (11.3) and the agent's repairs (11.4) correct it.
- A direction column whose words aren't a bank's usual ones gets no mapping from the code: the person says which word is which (11.3b).
- The eval measures the proposal on invented formats only (11.2a), never on a real file: DeepSeek gets nothing of one from a development machine.
