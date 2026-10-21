# 0027. A private beta by invitation

- **Status:** Accepted
- **Date:** 2026-10-21

## Context

Phase 7.2 turns the whole app on at xtrakto.site, with Clerk's production instance, Inngest Cloud and the production database, as ADR 0022 planned: remove `WAITLIST_ONLY` and add the variables `env.ts` asks for. From then on the app takes real bank statements. Stage 7 is a private beta, though: error monitoring (7.3), the data-flow document and the privacy page (7.5) and the legal review under Ley 1581 come after 7.2. Clerk's development instance lets anyone sign up, and a production instance copies its settings. The waitlist (ADR 0021) already gathers the people who want to try it.

## Decision

- **Sign-up by invitation.** Clerk's production instance runs in its "restricted" sign-up mode: only the people the owner invites from Clerk's dashboard, the first ones from the waitlist, can create an account. Once invited, they sign in as in development: email code, password, or Google through the app's own OAuth client.
- **The app's pages as they are.** A visitor without a session at `/`, or at any page of the app, goes to sign-in, where an email nobody invited can't create an account. The waitlist stays public at `/waitlist`, the address its sitemap and metadata give (decided with the human).
- **Clerk's links open the app.** The instance's paths point invitations and Clerk's emails at the app's own `/sign-in` and `/sign-up`.
- **The switch stays.** `WAITLIST_ONLY` stays in the code: setting it back to `1` and deploying again returns production to the waitlist alone, should the beta have to stop.

## Alternatives considered

- **Open sign-up:** anyone could upload real statements before the privacy page, the error monitoring and the legal review.
- **Clerk's waitlist mode:** a second list beside the app's own, with its own form and consent.
- **The waitlist at `/` for visitors without a session:** keeps the page people found when they joined, but needs a change in the proxy; the human chose sign-in, and the landing page (16.1) takes the root later.
- **Production on the waitlist, the app on another domain for the beta:** a second set of production services and keys for a handful of testers.

## Consequences

- Inviting someone is one action in Clerk's dashboard (Users, Invitations); the invitation's email comes from clkmail.xtrakto.site.
- Opening sign-up for the public launch (16.4) is one setting, the mode back to public, after 7.5 and the legal review.
- Someone who types xtrakto.site sees sign-in, not the waitlist, until 16.1.
- Production's database holds real financial data from the first invitation: nobody reads users' rows as the owner, the Neon MCP included.
