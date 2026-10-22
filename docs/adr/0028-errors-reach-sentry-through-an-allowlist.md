# 0028. Errors reach Sentry through an allowlist

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Phase 7.3 sends the app's errors to Sentry, from the browser and from the server, and samples traces to measure latency (system design §1). The private beta handles real statements, so an error must never carry one: no movement's text or amount, no search (Movimientos keeps it in `?q=`), no server action's arguments (a statement's content), no name, email, phone or account number (system design §4).

`@sentry/nextjs` 11 replaced `sendDefaultPii` with `dataCollection`, and its defaults collect everything: cookies, request and response headers, request bodies, query strings, the user's IP, a stack frame's local variables, a database query's parameters. Sentry's own server-side scrubbing matches values by their key's name, so it's a best effort, and it runs after the data has left the app. Sentry also derives the user's country, region and city from the IP it receives, even when it doesn't store the IP.

## Decision

- **Nothing collected by default.** `dataCollection` turns every category off, except the request's `User-Agent`: the browser's name and version.
- **An allowlist after it.** The SDK's hooks (`beforeSend`, `beforeSendSpan`, `beforeBreadcrumb`) keep only what has a reason to go: an error's class, message and stack without variables, the request's path and method, the runtime, browser, device and route, and the breadcrumbs of navigations and requests, by path. Text loses query strings and fragments, emails, amounts and runs of six digits or more. A span keeps what ran and how it went (method, status, route, a query's text without its parameters) and loses the full URL, headers, the client's address and the user.
- **Less to scrub in the browser.** No breadcrumbs of the console or of clicks and typing, and no Session Replay, which records the screen.
- **Two settings in Sentry's project.** "Prevent Storing of IP Addresses", and an advanced scrubbing rule that removes `$user.geo.**`.
- **Off where it isn't production.** Without a DSN, locally and in CI, Sentry doesn't start; the source maps go up only from Vercel's builds, and are deleted before the deployment serves them.

## Alternatives considered

- **Sentry's server-side scrubbing alone:** it matches key names, and the data has already left the app.
- **A blocklist in `beforeSend`:** a field a later SDK version adds would go through.
- **The server only:** the browser's errors, such as the Web Worker reading a file, would go unseen.
- **Tunneling events through the app (`tunnelRoute`):** it hides the person's IP from Sentry, but adds a function call per event and a route through the proxy; the project's rule removes the location more simply.

## Consequences

- What we can't recognize, such as a name in free text, still depends on not putting it in a message: the server throws sanitized errors (system design §4), and the browser's code must not quote data in its errors either.
- Debugging has less context: no request body, no variables. An error's class, stack, route and trace are what's left to go on.
- Upgrading the SDK means checking `dataCollection`'s defaults and the hooks again; v12 removes `beforeSendTransaction`, which span streaming already replaces.
