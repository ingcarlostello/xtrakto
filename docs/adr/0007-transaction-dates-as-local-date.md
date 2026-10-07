# 0007. Transaction dates as `LocalDate`

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

A transaction happens "on August 4" in Colombia, not at a UTC instant. The movements export stores local midnight as 05:00 UTC, and the quarterly statement prints `d/mm` without a year. Converting through JavaScript `Date` objects or UTC timestamps can move a transaction to the previous or next day.

## Decision

Transaction dates are calendar dates without time: a branded `LocalDate` string (`"YYYY-MM-DD"`) in TypeScript and a `date` column in PostgreSQL. Each parser converts once, when reading the file, using its bank's time zone (`America/Bogota` by default) with `date-fns` and `@date-fns/tz`. Statement text is never parsed with `new Date(string)`. Real instants, such as an upload time, use `timestamptz` in UTC.

## Alternatives considered

- **UTC timestamps:** a time zone conversion can shift the day near midnight.
- **JavaScript `Date` objects:** they carry the implicit time zone of whichever server or browser creates them.

## Consequences

- `"YYYY-MM-DD"` strings sort and compare correctly as plain strings.
- Each parser must declare how its bank stores dates.
- Dates without a year are inferred from the statement period, including periods that cross from December to January.
