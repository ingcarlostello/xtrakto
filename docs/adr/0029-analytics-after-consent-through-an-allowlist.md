# 0029. Product analytics only after consent, from the browser, through an allowlist

- **Status:** Accepted
- **Date:** 2026-10-27

## Context

Phase 7.4 measures how the private beta is used: a statement uploaded, an ingestion that failed, the summary opened, a category corrected (system design §4). The roadmap asks for explicit events only, with format ids, count buckets and error codes, no autocapture or session recording, and nothing before the person's consent. Colombian law (Ley 1581 de 2012) lets a person withdraw an authorization at any time, so withdrawing has to be as easy as giving it.

`posthog-js` captures a lot by default: page views and leaves, clicks with their elements' text, the full URL with its query (Movimientos keeps a search in `?q=`), the referrer, the raw user agent, the screen and the time zone, person properties with the first URL seen, and session replay, surveys and feature flags loaded from the project's remote configuration. PostHog derives the city from the request's IP, and its "Discard client IP data" setting still lets that enrichment use the IP before it's discarded.

## Decision

- **Consent first, in the browser.** The app asks once per browser, in a notice above the dock with two answers of the same weight, and keeps the answer in localStorage with a version, so that a change the person should hear about asks again. `/settings` changes it at any time. Without an answer, or with a no, PostHog isn't even downloaded: `lib/analytics.ts` imports the SDK the first time an event goes, and only with consent.
- **Only the app's events.** Everything the SDK would capture on its own is off, and so are remote configuration, external scripts, surveys, replay and feature flags. Nobody is identified: events are anonymous, with a random id in localStorage, never in a cookie.
- **An allowlist in `before_send`.** Only the events of `ANALYTICS_EVENTS` go, each with its own properties, what PostHog needs to receive it (token, the random ids, the library, the time) and the browser, system, kind of device and host. No URL, referrer, title, raw user agent, screen, time zone or person properties, and `$geoip_disable` keeps PostHog from working out the city.
- **Withdrawing forgets the browser.** Turning it off opts PostHog out, which deletes the id it kept; only PostHog's own opt-out mark stays. A later consent starts with a new id.
- **Two settings in PostHog's project.** Discard client IP data, and the GeoIP transformation off.
- **Off where it isn't production.** Without `NEXT_PUBLIC_POSTHOG_KEY`, locally and in CI, the notice doesn't show and nothing loads. The project is in PostHog Cloud US, where the app's other services keep their data.

## Alternatives considered

- **Events from the server (`posthog-node`):** the server would need the browser's consent with every request, and Vercel's functions would send the person's IP as theirs.
- **PostHog's cookieless mode on rejection:** it still counts the people who said no, with a hash of their IP and user agent made on PostHog's servers.
- **The answer kept in the account:** one answer for every device, but a migration, an action and a read on every page; the browser's answer is enough for the private beta.
- **A blocklist in `before_send`:** a property a later SDK version adds would go through.
- **A reverse proxy through the app:** it gets past ad blockers, but adds a route and a function call per event; blocked events are an accepted loss.

## Consequences

- An event or a property joins the allowlist only with a reason, and never carries an amount, a description, a name, a period or a digit of an account.
- A person is counted once per browser and device, and asked once in each.
- Ad blockers stop some events; the numbers are a floor, not a census.
- Upgrading the SDK means checking its defaults and the allowlist again.
