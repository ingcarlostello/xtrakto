# 0036. One-click unsubscribe without a session

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Every notice needs a way out that works from the email itself: Gmail and Yahoo ask bulk senders for one-click unsubscribe (RFC 8058), whose request carries no cookies, and a person reading on their phone may not be signed in. So it can't check a session, which project rules §7 asks of everything but the public waitlist.

## Decision

- **A link the server signs.** Its token is the user's id, the notices its email carried and an HMAC-SHA-256 of both. The key is drawn with HKDF from `IDENTIFIER_HASH_KEY` for this purpose alone, so a signature can't stand for a reference's hash, and no new secret has to be kept. It doesn't expire: an old email must still work.
- **It only turns off the notices its email carried, for its person.** An email can carry several (10.4b), and a provider's button means "stop this email": turning off only one part would keep the rest coming. It reads nothing back and turns nothing on; turning a notice on again takes the profile, with a session, where the person can also choose one by one.
- **Only a POST changes anything.** `List-Unsubscribe` and `List-Unsubscribe-Post` point at `/api/unsubscribe`, which a mail provider posts to. The link in the email's body opens `/unsubscribe`, which asks and posts there with a button, because mail scanners open every link they find and would unsubscribe people who never asked.
- **The same answer whatever it gets.** A forged, malformed or valid link reads and answers alike, so the route tells nothing about who exists.

## Alternatives considered

- **Sign in first:** breaks one-click, and loses the person who only wants the emails to stop.
- **A random token stored per user:** one more column and one more read, to protect a link that can only turn a notice off.
- **Changing it on GET:** the scanners above.

## Consequences

- It is the second exception to checking the session. Whoever gets an email's link can turn its notices off for its person, which is what forwarding one can cost.
- Changing `IDENTIFIER_HASH_KEY` would break the links already sent, as it would break the references' hashes.
