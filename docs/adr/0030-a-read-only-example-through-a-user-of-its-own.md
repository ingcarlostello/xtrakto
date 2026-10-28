# 0030. A read-only example through a user of its own

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

Phase 7.8 lets someone without statements at hand see every screen with sample data: "Ver con datos de ejemplo" on the empty summary and "Explorar con datos de ejemplo" on the welcome's last step (design v8-12 and v8-17). Every page reads a user's data through services that take the session's Clerk id, in the database's user context (ADR 0014), and every action writes for the session's user. The example must never mix with the person's own data, never be changed by anyone, and show the same screens the person will see with their own statements.

## Decision

- **A user of its own.** The example is a user in the database with a reserved id that isn't Clerk's (`xtrakto_example`; Clerk's ids start with `user_`), so nobody signs in as it. Its data is an invented quarterly statement of a Bancolombia savings account, July to September 2026, written for the demo so that each screen has something to show; it's saved the first time someone opens the example, through the steps ingestion takes after parsing (prepared, categorized with the holder's name, checked and saved), and saving it again adds nothing. Development and production hold the same example.
- **A mode in a cookie.** Opening the example sets a cookie that only says yes; the example's id is a constant of the server, never the cookie's. While it's set, Resumen, Movimientos, Pagos fijos, Categorías and the quick review read the example's user instead of the person's (`requireViewer`) and show a banner with "Volver a mis datos". Subir and Perfil stay the person's. Leaving, or sending a statement, deletes the cookie.
- **Read-only by construction.** Every action keeps acting for the session's user, so none can write to the example: an id of the example's rows is another user's, which the services and Row-Level Security already refuse. The pages also disable what would save: the corrections and "Es mío" of a movement's detail and the quick review's answers stay in sight but disabled, under a note, and "Descargar CSV" isn't offered.

## Alternatives considered

- **The example as one more account of the person's:** it mixes with their data, counts in their totals and has to be deleted afterwards.
- **A shared Clerk account for the example:** the person leaves their own session to see it, and every action would have to refuse that account.
- **Pages computed from the fixtures in memory:** every service would need a second source of data, and the screens could drift from what real statements show.
- **The seed's fixtures as the example:** they reach into 2027, so the summary would open on a quarter that hasn't happened yet.

## Consequences

- One more user in production, with invented data only.
- Changing the example's statement isn't enough to change the example: a verified statement keeps another version of its period out (ADR 0018's versions), so its user's rows have to be deleted first.
- A page that reads a user's data and should show the example calls `requireViewer`; one that writes, or shows the person's account, keeps `requireSignedIn`.
- Product analytics don't count the example's summary as one viewed.
