# 0017. Extracted content is minimized in the browser before sending

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The browser reads the file and sends its extracted content to the server, which keeps it in the `ingestion_jobs` row until the job ends, 24 hours at most ([ADR 0008](0008-files-read-in-the-browser.md), [system design §4](../ARCHITECTURE.md#4-privacy-boundaries)). Sent whole, that content holds what the parsers never read: the quarterly statement's address, city and branch, its suggested credit line and the full account number, on every page that repeats them; each movement's SUCURSAL and DCTO.; and long numbers in descriptions, which parsers mask only when they parse ([ADR 0012](0012-long-numbers-masked-when-parsed.md)). The system design said PostgreSQL never receives full account numbers, which wasn't true for that temporary row.

## Decision

Every parser has `minimize(content)`, which keeps only what its `parse` reads, and the browser sends the minimized content (Phase 5.2b); the server minimizes it again before storing it (Phase 5.4a). For Bancolombia's formats:

- One sheet, without its name.
- In every block a quarterly statement repeats, only the holder's name, the period, the account type and the account number's last 4 digits; the summary keeps its amounts, not the suggested credit line.
- Each movement keeps its date, its description, with the tails of a split one, and its amounts, which each tail moves one column to the right; its SUCURSAL and DCTO. go.
- Long numbers masked, as ADR 0012 does, in every text but a movement's amounts. The rows the parser only skips or warns about (labels, headers, page breaks, the end marker, stray rows) keep their cells, so it sorts every row as before.
- The movements export keeps the date, the description, the reference and the amount of each movement. References stay whole: the server hashes them with a key the browser doesn't have, and they leave with the job's content.

`minimize` is pure and idempotent, keeps every row in its place, and `parse(minimize(content))` equals `parse(content)`: tests prove it for every fixture, and the private tests for every real file, with counts only.

## Alternatives considered

- **Send the content whole and document it:** simpler, but the address and the full account number would sit in the job row and pass through the server for no use.
- **Parse in the browser and send the parsed statement:** the server would have to trust the browser's parse, against the authoritative server parse of [ADR 0009](0009-deterministic-parsing-first.md) and the system design.
- **Hash references in the browser:** the HMAC key would have to reach the browser, which would let anyone reverse a phone number by trying them all.

## Consequences

- The address, city, branch, suggested credit line, full account number and each movement's SUCURSAL and DCTO. never leave the browser, and neither do long numbers in descriptions.
- Raw references are the only identifiers that reach the server, only in the temporary job row; the system design's privacy table says so.
- A parser that starts reading another cell must keep it in `minimize`, or the parity tests fail.
- The browser parses minimized content for its preview, so the preview shows exactly what the server will read.
