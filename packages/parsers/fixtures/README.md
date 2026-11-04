# Synthetic fixtures

Bancolombia exports as `extractSpreadsheet` returns them (`ExtractedContent` JSON), for the parser tests. They follow [Appendix A of the roadmap](../../../docs/ROADMAP.md#appendix-a--bank-formats).

**Every name, number and amount here is invented. Never put real data in this folder.** Real exports may only live in `fixtures/private/`, which git ignores, for the private tests of Phase 2.8.

## Regenerating

The JSON files are generated: don't edit them by hand. Change the data in [`scripts/fixture-data.mjs`](../scripts/fixture-data.mjs) or the format in [`scripts/generate-fixtures.mjs`](../scripts/generate-fixtures.mjs), then run:

```bash
pnpm --filter @xtrakto/parsers generate:fixtures
```

The script computes balances and totals, so every statement reconciles except `quarterly-broken-balance`, and a fixed seed makes `quarterly-large` the same on every run. Prettier skips these files so each spreadsheet row stays on one line.

`pnpm db:seed` also reads `quarterly-basic`, `quarterly-year-rollover` and `movements-basic` from this folder, as development data.

## Fixtures

| Fixture                     | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quarterly-basic`           | Quarterly statement for 2026/06/30–2026/09/30 with 33 movements, all on one page. Interest rows on a few days only; mixed-case names and PSE entities; double spaces; transfers to the holder's own account with the name cut (`TRANSF A Ana Maria Pru`, `TRANSF A ANA MARIA PRUEB`, and `TRANSF DE ANA PRUEBA` with first name and first surname); `CANAL CORRESPONSA` and `VIRTUAL` in SUCURSAL; investment interest (`INTERES INV VIRT …`); interest under one peso (`.85`). |
| `quarterly-previous`        | The quarter before, 2026/03/31–2026/06/30, with 12 movements. It closes on the balance `quarterly-basic` opens with, so `quarterly-basic` is chained to it.                                                                                                                                                                                                                                                                                                                     |
| `quarterly-year-rollover`   | Period 2026/12/31–2027/03/31: `31/12` belongs to 2026 and `1/01` to 2027. Each month holds the fixed payments of design v8-04, for the recurring payments page: a loan in two installments, energy that rises, a gas bill paid by transfer once and by PSE after, a card payment that varies a lot, and savings by key.                                                                                                                                                         |
| `quarterly-repeated-header` | `quarterly-basic` split into pages of 14 movements. Each new page repeats the client, general and movements blocks right after the last movement, so `SUCURSAL` lands in the VALOR column.                                                                                                                                                                                                                                                                                      |
| `quarterly-broken-balance`  | `quarterly-basic` with one misprinted amount: `3/07 COMPRA EN  TIENDA LA ESQUI` shows `-45,090.00` instead of `-45,900.00`. Its balance, the other rows and the summary are right.                                                                                                                                                                                                                                                                                              |
| `quarterly-large`           | The same quarter with one interest row a day: 465 movements on pages of 50.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `movements-basic`           | Movements export for 2026-10-01 to 2026-10-07: newest first, dates at 05:00 UTC, numeric amounts, and text references (phone, `ATM …`, codes with leading zeros, several numbers in one cell, and none). Interest rows move one day later, so 1/10 has none and 7/10, the last day, has two.                                                                                                                                                                                    |
| `movements-overlap`         | July of `quarterly-basic` as a 1/07–31/07 export shows it: the same movements and amounts, with interest rows one day later except the last day's, which stays on 31/07.                                                                                                                                                                                                                                                                                                        |

## XLSX files for manual checks

`xlsx-writer.mjs` turns extracted content back into an XLSX file, stored as the bank's exports store it: text, numbers, and date cells as numbers with a date format, compressed. A test proves extraction reads every fixture back unchanged. To get files to upload by hand:

```bash
pnpm --filter @xtrakto/parsers generate:xlsx
```

It writes into `fixtures/xlsx/`, which git ignores:

| File                                                                                                             | What it's for                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<fixture>.xlsx`                                                                                                 | Each fixture above as a real file.                                                                                                                   |
| `quarterly-basic-account-2.xlsx`, `quarterly-previous-account-2.xlsx`, `quarterly-broken-balance-account-3.xlsx` | The same statements under other account numbers, so they don't land on the seeded account. The two of account 2 are chained, in either upload order. |
| `not-a-statement.xlsx`                                                                                           | A shopping list: no parser recognizes it.                                                                                                            |
| `damaged.xlsx`                                                                                                   | Half of an XLSX file: extraction fails.                                                                                                              |
| `renamed-pdf.xlsx`, `extracto.pdf`                                                                               | PDF bytes, under an XLSX name and under their own.                                                                                                   |
| `movements.csv`                                                                                                  | `movements-basic` as Excel saves it to CSV in Colombia (`;`, `d/mm/yyyy`, decimal commas, Windows-1252): recognized, but not read.                   |
| `too-many-rows.xlsx`                                                                                             | 10,001 rows, over the extraction's bounds.                                                                                                           |
| `quarterly-10mb.xlsx`                                                                                            | `quarterly-large` plus sheets of random text: about 9.2 MB, under the 10 MB limit, and 36 KB of content once minimized (ADR 0017).                   |
| `oversize-11mb.xlsx`                                                                                             | The same with one more sheet: about 11.5 MB, over the limit.                                                                                         |

## PDF files

`quarterly-basic-pdf.json` and `quarterly-large-pdf.json` are `quarterly-basic` and `quarterly-large` as the bank prints them in PDF (Appendix A.3), as the text items `extractPdf` returns (Phase 9.3). `scripts/quarterly-pdf-layout.mjs` lays them out: every page repeats the header box and, left of it, the holder's block; the first page has a promotion and the summary; the table's titles sit centered over their columns, dates and amounts line up on their right and text on its left; from the second page the text comes column by column; and each page ends with the bank's contact and its number. One space stands where the spreadsheet's description has two, as the bank prints it. The basic statement takes two pages, the large one eight. Their parser reads each as its spreadsheet twin.

`movements-basic-pdf.json` and `movements-overlap-pdf.json` are `movements-basic` and `movements-overlap` as the online banking prints them in PDF (Appendix A.2b), two pages each (Phase 9.3b). `scripts/movements-pdf-layout.mjs` lays them out: the first page opens with its titles, the date and time it was downloaded, the holder's name and the account's type and number (`Ahorros 123 - 456789 - 01`); every page holds the table, newest movement first, with one item per line of a cell, as pdf.js reads the bank's; a description or a reference too wide for its column wraps to a second line, a reference starting half a line above its row's date; a transfer from another bank prints its missing reference as `null`; and each page ends with an IP address of the range kept for documentation (`203.0.113.7`). One space stands where the spreadsheet's description has two. Their parser reads each as its spreadsheet twin, naming the account and the holder besides.

`pdf-writer.mjs` turns extracted PDF content back into a letter-size PDF with pdfkit: each text item at its position, in Courier at its height, encrypted with AES-256 when given a password. `scannedPdf` writes pages that hold only an image, as a scanner leaves them. The extraction's tests build their PDFs with it (Phase 9.1), and a statement's PDF fixture written with it reads back the same (9.3, 9.3b).

## Confirmed on real files

The private tests confirmed what these fixtures assume, with refinements from more real files (October 2026, roadmap Appendix A):

- The quarterly statement's first row is empty in some exports and missing in others; the parser reads both.
- Older quarterly statements split a description at `ñí` into two cells; the parser joins them.
- The export's header is its first row.
- Back-to-back quarterly statements share a day: one ends on the day the next starts, as `quarterly-previous` and `quarterly-basic` do, and the next opens with the previous one's closing balance.
- The export dates interest on the day it was paid: the next day, or the same day for a month's last day. A range that ends with a month holds two interest rows on its last day, and a range that starts mid-month holds the previous day's interest on its first day.
- The export writes `null` as the reference of some movements without one, in Excel and in PDF; the parsers read it as none (Phase 9.3b).

Parsers still must not rely on the sheet name.

## Private verification

Real exports may be copied into `fixtures/private/` or its folders, which git ignores, to check the parsers against them:

```bash
pnpm --filter @xtrakto/parsers test:private
```

`src/bancolombia/real-exports.private.test.ts` reads every `.xlsx` there, in any folder, as the app will: it extracts, recognizes and parses each file, reconciles each quarterly statement, checks that back-to-back quarterly statements of an account share the day one ends and the next starts, on the same balance (what "Encadenado" needs), compares an export's movements with the quarterly statement whose period holds them, and checks that minimizing a file (ADR 0017) leaves its parse unchanged and keeps long numbers only in an export's references. It prints only counts, yes/no answers, error codes and row numbers, never a description, amount, name or file name. `pnpm test` and CI never run it, and it skips itself when the folder has no exports.

`src/extraction/pdf-extraction.private.test.ts` reads every `.pdf` there the same way (Phase 9.1): it extracts each file's text, reports their pages and the most text items on a page, and checks that no text keeps letters written apart or ligatures. It prints counts only, and skips itself when the folder has no PDFs.

`src/bancolombia/real-quarterly-pdfs.private.test.ts` reads each quarterly statement's PDF there (Phase 9.3) against its spreadsheet, the one of its account and period: it counts the fields that differ, but for the repeated spaces the PDF prints as one; reconciles it; and checks that once minimized it reads the same and sends no address, city, later page's header, footer or long number. It prints counts only.

`src/bancolombia/real-movements-pdfs.private.test.ts` reads each movements export's PDF there (Phase 9.3b) against its spreadsheet: the one of the same download or, when the two were downloaded for different ranges, the one sharing the most of its movements, on the days both cover. It counts the movements that differ, field by field, but for the repeated spaces the PDF prints as one; checks that each names the account and the holder of a quarterly statement there; and that once minimized it reads the same and sends none of the page's titles, the download's date and time, the IP addresses, or a long number outside the references. It prints counts only.
