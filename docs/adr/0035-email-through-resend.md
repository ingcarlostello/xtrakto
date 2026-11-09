# 0035. Email through Resend

- **Status:** Accepted
- **Date:** 2026-11-09

## Context

Stage 10 tells people by email when their files are ready. Vercel sends no email, and a solo developer shouldn't run a mail server. The email is personal data leaving the app: its address goes to a third party, and whatever the message says stays in that party's logs and in a mailbox nobody here controls.

## Decision

- **Resend, on `mail.xtrakto.site`,** a subdomain of its own, so its reputation stays apart from the root domain's, where Clerk's and Forward Email's records live. It signs with DKIM and takes `rsend.mail.xtrakto.site` as its return path for SPF; the root's DMARC record covers it.
- **Through `lib/email.ts` only,** as `lib/ai.ts` is for the LLM. Without `RESEND_API_KEY`, as in CI and previews, nothing leaves; Vercel's production requires it.
- **An email holds counts and links.** Never an amount, a bank's text, a name, an account's digits or a file's name: a mailbox outlives the person's account, and an email can be forwarded.
- **The address comes from Clerk when an email goes,** inside the step that sends it, outside any database transaction. It isn't stored, and it isn't in any step's output.
- **Failures as codes.** Resend's messages can quote the address, so only its error's name leaves the module. A failure that may pass is thrown for Inngest to retry, and Resend's idempotency key, one job's id, keeps a retry from sending twice.
- **HTML written by hand, with its text version.** Tables and inline styles, and the logo as a PNG (`docs/brand.md`). React Email would be a dependency for one short template.
- **The reserved domain `example.com` receives nothing.** A local server with the key would otherwise email the Clerk test users, and those bounces would cost a young domain its reputation.

## Alternatives considered

- **Amazon SES directly:** cheaper at volume, and what Resend sends through; it needs an AWS account and its own bounce handling.
- **Postmark:** a good reputation for delivery; nothing this project needs that Resend lacks.
- **Clerk's emails:** only its own authentication messages.
- **The root domain as sender:** one DNS name less, and its reputation shared with everything else the domain sends.

## Consequences

- `.site` domains and new senders start with little trust: the first emails can land in spam until the domain has a history.
- Resend joins the privacy page and `docs/data-flow.md`, with the address and the email's words.
- From a development machine with the key, an upload emails the Clerk user's real address.
