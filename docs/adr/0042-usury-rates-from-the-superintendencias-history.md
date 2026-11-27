# 0042. Usury rates from the Superintendencia Financiera's history, read every day

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

From 12.4b, a card's purchase rate is compared with its month's usury rate. In Colombia no credit may charge more than the usury rate, one and a half times the "interés bancario corriente" the Superintendencia Financiera certifies each month by resolution; credit cards fall under consumer and ordinary credit. Xtrakto needs the rate of every month a saved statement can name, from the oldest a person uploads to the month that just started.

Gate 12.4 asked the human to confirm the official publication. The Superintendencia's site links a "Histórico Tasa de Usura", an Excel 97–2003 file (`historicousura.xls`) at one address, which gains each month once it's certified, in the last days of the month before, on no fixed day. It holds every modality's rates since 2007, in blocks under the modalities' names, each row a period's first and last days; the early periods are quarters.

The rates are public figures, linked to no one, and the cron that saves them has no user. Work without a user, such as the daily cleanup's and the monthly email's, goes through functions that run with their owner's rights (ADR 0014), and none of them took a parameter until now.

## Decision

- **The history is the source** (gate 12.4, confirmed by the human). `readUsuryHistory`, in `@xtrakto/parsers`, reads consumer and ordinary credit's usury rate from every block under that modality's name: a quarter's rate for each of its months, and the later row's for a month two rows give. A row with dates and no rates only marks another modality's period and is skipped. A missing block, or a date or a rate that doesn't read, fails naming where, never a value.
- **Read every day:** an Inngest cron at 06:00 in Bogotá downloads the history and adds the months the table doesn't have, so the coming month's rate arrives as soon as it's certified, before the month starts. Its first run adds every month since April 2007, so there's no seed of its own. A history that can't be had or read fails the run; after Inngest's 3 retries, Sentry gets an error. A month that started without its rate sends Sentry a warning, each day until it's there. The step returns counts only.
- **A month's rate is never changed:** `usury_rates` keeps the month's first day, the effective annual rate in parts per million (28,34 % is 283,400, as a card's rates are) and its source, with a check on each. Any user's context reads it; the application can't add, change or delete a row.
- **A SECURITY DEFINER function with one parameter:** `save_usury_rates(rates jsonb)` adds the months it gets that the table doesn't have, and returns how many. It is the first such function with a parameter, so this amends ADR 0014:
  - what it receives can only become new rows of public figures that the table's checks hold;
  - it never changes or deletes a row, and it touches nothing of a user's.
  - Like the others, its `search_path` is fixed, its table qualified, and only the application may run it.
  - The catalog test names it with its one parameter.

## Alternatives considered

- **Each month's resolution, as a PDF:** the legal text itself, but one file a month at a new address, read by its words. The history gathers them in one table.
- **Banco de la República's series, or a site that republishes the rates:** one step away from the certification, with delays and formats of its own.
- **Each month typed by hand in a migration:** no download, but a month would wait for a deployment, and a typo would reach every card.
- **A monthly cron on the first:** the publication's day varies, so a rate published late would wait a month. A daily run costs one 80 KB download.
- **An insert policy for the application:** no new kind of function, but any buggy query of the app could add a wrong month, which nothing could then change.

## Consequences

- Each environment has every month since 2007 from the cron's first run. Locally, the Inngest Dev Server's UI runs it on demand.
- A change in the history's layout fails the run and Sentry tells the owner; the months saved stay.
- The link is the one the Superintendencia's page gives today. Should a new version get another link, the month's warning says so on the month's first day, and the constant in `features/usury-rates` changes.
- A month saved wrong stays wrong until a migration corrects it, since no code may change one.
- A future SECURITY DEFINER function with a parameter must likewise only add public figures its table's checks hold, and be named in the catalog test.
