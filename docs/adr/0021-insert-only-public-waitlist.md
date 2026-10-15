# 0021. An insert-only public waitlist

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

The waitlist page (roadmap 16.0b and 16.0c) takes a name, an email and a consent from people who have no account. It is the first server action without a session, while the project rules ask every action to check one, and the first table with personal data that no user owns. The list must not leak: not through a flaw in the app, not through its answers (whether an email is already on it), not through logs. Ley 1581 asks to keep proof of each person's consent.

## Decision

- **Insert only.** `waitlist_entries` has forced Row-Level Security, and the application role gets `INSERT` on it with a policy that accepts any row, and nothing else: it can't read, count, change or delete the list. Exporting it, and deleting someone who asks, take the owner role.
- **No conflict target.** The insert ends in `ON CONFLICT DO NOTHING` without naming the email: PostgreSQL needs `SELECT` on a conflict target, and on `RETURNING`. The table's only unique keys are its id and the email, so any conflict is a repeated email, and the first entry stays.
- **The same answer.** `joinWaitlist` answers `ok` whether the email was there or not.
- **Consent kept by the database.** Each entry stores `consent_version`, set by the server from the text the page shows, and `consent_accepted_at`, the insert's own time; the action's schema is strict, so neither can come from the browser. A new consent text gets a new version.
- **A public action, in the rules.** The project rules' session check has one exception: an action a public page needs that touches no user's data, validated with Zod, answering the same whatever the database holds, and logging nothing of its input (its errors are sanitized, and Next.js's development log of action arguments is off).
- **Normalized emails.** Zod trims and lowercases the email before checking it, and a CHECK keeps it that way in the database, so one address can't join twice.

## Alternatives considered

- **A form or mailing service (Tally, Resend audiences):** a third party would hold the list, which the consent text rules out ("No los vendemos ni los usamos para nada más").
- **A conflict target with a `SELECT` policy:** the application could read the whole list.
- **A `SECURITY DEFINER` function to insert:** a second function with its owner's rights, where the catalog test allows only the daily cleanup, for what a grant already does.
- **Hashing the email:** nobody could write to the people on the list.
- **Telling people they were already on the list:** anyone could check whether an address joined.

## Consequences

- Only the owner role (or the Neon console) reads, exports or deletes the list; requests to delete arrive at hola@xtrakto.site and are done by hand.
- Deleting an Xtrakto account doesn't touch the waitlist: the two aren't linked.
- A bot can fill the list with junk until the page has protection when it's published (Vercel Firewall, Phase 16.0c and later); the length checks and the unique email bound what one request can do.
- The legal review of the consent text and of the data-treatment policy (Ley 1581) must happen before the page goes public.
