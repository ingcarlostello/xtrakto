# 0011. SheetJS for spreadsheet extraction

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The browser reads statement files in a Web Worker and sends only their content ([ADR 0008](0008-files-read-in-the-browser.md)); tests read the same files in Node. Bank exports are XLSX, and CSV must work too. Dates are the riskiest part: an XLSX date cell is a serial number, and turning it into a JavaScript `Date` can shift the day with the machine's time zone, which [ADR 0007](0007-transaction-dates-as-local-date.md) rules out. Phase 2.2 of the roadmap is the decision gate for this library.

## Decision

`@xtrakto/parsers` reads spreadsheets with SheetJS Community Edition (Apache 2.0), installed from its official CDN as a versioned tarball (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`); the lockfile pins its integrity hash. `extractSpreadsheet` accepts only XLSX and CSV. It reads XLSX with date cells as serial numbers (`cellDates: false`) and their number formats to tell dates from amounts, and CSV with every value as text (`raw: true`), so nothing guesses numbers or dates.

## Alternatives considered

- **ExcelJS:** turns date cells into `Date` objects, reads CSV only in Node, needs Node polyfills in the browser and doesn't read legacy XLS. Its latest release, 4.4.0, is from October 2023.
- **The `xlsx` package on the npm registry:** frozen at 0.18.5 (March 2022), with known vulnerabilities (CVE-2023-30533, prototype pollution; CVE-2024-22363, ReDoS) fixed only in the CDN releases.

## Consequences

- Updates are manual: Dependabot and Renovate don't follow the CDN URL. Watch the SheetJS changelog for security fixes and bump the tarball URL.
- `pnpm install` needs access to `cdn.sheetjs.com`.
- SheetJS is the largest part of the package's browser build (about 190 kB gzipped for the whole package before minification). Only the upload worker loads it (Phase 5.2).
- Its types are loose (`SSF` is `any`), so the code declares the subset it uses. It also writes into the options it receives, so every read builds new ones.
- Legacy XLS, XLSB and ODS are rejected although SheetJS reads them: ODS stores dates as text that SheetJS converts through `Date`, and each new format needs its own tests before it is accepted.
