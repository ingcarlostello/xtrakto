# 0004. Clerk for authentication

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Users need to sign up, sign in and delete their account, with a Spanish interface. A single developer should not build and secure session handling, email verification and password resets. The identity provider must never receive financial data.

## Decision

Use Clerk through `@clerk/nextjs` with Spanish localization. The internal `users` table only maps `clerk_user_id` to an internal id; every other table references the internal id. A signed `user.deleted` webhook deletes all of the user's data.

## Alternatives considered

- **Auth.js:** free and self-hosted, but sessions, email flows and their security become our responsibility.
- **Supabase Auth:** ties authentication to the database provider, which is decided separately at gate 3.1.

## Consequences

- Clerk receives email, name and sign-in data only.
- The production instance needs the domain (Phase 7.2), and the webhook signature must be verified.
- Switching providers later means migrating users, which the identity mapping table keeps contained.
