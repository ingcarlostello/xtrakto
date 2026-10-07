# 0008. Files are read in the browser

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Statements contain personal and financial data. PDF statements are password-protected, usually with the holder's ID number. Storing uploaded files creates retention and breach risk, and Vercel limits request bodies to 4.5 MB.

## Decision

The browser reads the file in a Web Worker and sends only the extracted content (spreadsheet rows or PDF text items) to a server action. The original file and the PDF password never leave the device, and there is no file storage. The server parses the content again, and its result is the authoritative one. Extracted content is kept in the ingestion job row only until the job ends, and for 24 hours at most.

## Alternatives considered

- **Upload to object storage and parse on the server:** simpler parsing, but it stores the original file and requires sending the PDF password to the server.

## Consequences

- Extraction and parsers must run both in the browser and in Node (`@xtrakto/parsers` stays isomorphic).
- Payload size bounds are enforced in the browser and again on the server.
- There is no way to download the original file again; the user keeps it.
