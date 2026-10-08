# Synthetic fixtures

Bancolombia exports as `extractSpreadsheet` returns them (`ExtractedContent` JSON), for the parser tests. They follow [Appendix A of the roadmap](../../../docs/ROADMAP.md#appendix-a--bank-formats).

**Every name, number and amount here is invented. Never put real data in this folder.** Real exports may only live in `fixtures/private/`, which git ignores, for the private tests of Phase 2.8.

## Regenerating

The JSON files are generated: don't edit them by hand. Change the data in [`scripts/fixture-data.mjs`](../scripts/fixture-data.mjs) or the format in [`scripts/generate-fixtures.mjs`](../scripts/generate-fixtures.mjs), then run:

```bash
pnpm --filter @xtrakto/parsers generate:fixtures
```

The script computes balances and totals, so every statement reconciles except `quarterly-broken-balance`, and a fixed seed makes `quarterly-large` the same on every run. Prettier skips these files so each spreadsheet row stays on one line.

## Fixtures

| Fixture                     | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quarterly-basic`           | Quarterly statement for 2026/06/30–2026/09/30 with 33 movements, all on one page. Interest rows on a few days only; mixed-case names and PSE entities; double spaces; transfers to the holder's own account with the name cut (`TRANSF A Ana Maria Pru`, `TRANSF A ANA MARIA PRUEB`, and `TRANSF DE ANA PRUEBA` with first name and first surname); `CANAL CORRESPONSA` and `VIRTUAL` in SUCURSAL; investment interest (`INTERES INV VIRT …`); interest under one peso (`.85`). |
| `quarterly-year-rollover`   | Period 2026/12/31–2027/03/31: `31/12` belongs to 2026 and `1/01` to 2027.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `quarterly-repeated-header` | `quarterly-basic` split into pages of 14 movements. Each new page repeats the client, general and movements blocks right after the last movement, so `SUCURSAL` lands in the VALOR column.                                                                                                                                                                                                                                                                                      |
| `quarterly-broken-balance`  | `quarterly-basic` with one misprinted amount: `3/07 COMPRA EN  TIENDA LA ESQUI` shows `-45,090.00` instead of `-45,900.00`. Its balance, the other rows and the summary are right.                                                                                                                                                                                                                                                                                              |
| `quarterly-large`           | The same quarter with one interest row a day: 465 movements on pages of 50.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `movements-basic`           | Movements export for 2026-10-01 to 2026-10-07: newest first, dates at 05:00 UTC, numeric amounts, and text references (phone, `ATM …`, codes with leading zeros, several numbers in one cell, and none). Interest rows move one day later, so 1/10 has none and 7/10, the last day, has two.                                                                                                                                                                                    |
| `movements-overlap`         | July of `quarterly-basic` as a 1/07–31/07 export shows it: the same movements and amounts, with interest rows one day later except the last day's, which stays on 31/07.                                                                                                                                                                                                                                                                                                        |

## Confirmed on real files

The private tests of Phase 2.8 confirmed what these fixtures assume: the quarterly statement's first row is empty; the export's header is its first row; and the export dates interest one day later, so the last day of its range holds two interest rows and the first day none. Parsers still must not rely on the sheet name.

## Private verification

Real exports may be copied into `fixtures/private/`, which git ignores, to check the parsers against them:

```bash
pnpm --filter @xtrakto/parsers test:private
```

`src/bancolombia/real-exports.private.test.ts` reads every `.xlsx` there as the app will: it extracts, recognizes and parses each file, reconciles each quarterly statement, and compares an export's movements with the quarterly statement whose period holds them. It prints only counts, yes/no answers, error codes and row numbers, never a description, amount, name or file name. `pnpm test` and CI never run it, and it skips itself when the folder has no exports.
