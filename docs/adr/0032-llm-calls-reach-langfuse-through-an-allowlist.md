# 0032. LLM calls reach Langfuse through an allowlist

- **Status:** Accepted
- **Date:** 2026-10-30

## Context

Phase 8.2 records each LLM call in Langfuse with its model, tokens, cost and latency (project rules §14), so cost and failures can be watched before Stage 8 sends real texts (8.5b). A call's prompt and answer hold a bank's texts, redacted but still a person's movements, and must never reach Langfuse or Sentry (system design §4).

Langfuse's SDK for TypeScript is built on OpenTelemetry, which Sentry 11 already owns in this app: a second tracer would share Sentry's context and its sampling of a tenth of the traces, and brings five packages whose versions must match Sentry's. Langfuse's older REST ingestion, which took a generation as JSON, closes on 16 November 2026. Its OpenTelemetry endpoint takes OTLP's JSON over HTTP. The AI SDK has telemetry of its own, which hands the prompt to whoever listens, and Sentry's AI integration listens to it.

## Decision

- **One trace per call, written by hand.** `lib/langfuse.ts` posts OTLP's JSON to Langfuse Cloud's US region (`/api/public/otel/v1/traces`, with its current ingestion): a span for the call, named after its prompt and version (`categorize.v1`), and a generation under it for each attempt.
- **An allowlist by construction.** `utils/langfuse-trace.helpers.ts` writes every attribute that leaves: the environment, the prompt's name and version, and each attempt's model, outcome, HTTP status, tokens, cost and times. The record `lib/ai` hands it holds no instructions, input or answer, so none can leak.
- **Cost as an upper bound.** `lib/ai` prices a call at DeepSeek's peak hours and without its cache's discount, in millionths of a dollar; 8.3's limits use the same figure.
- **The AI SDK's telemetry is off on every call,** and Sentry's AI integration is told to record no inputs or outputs, should a call ever turn it on.
- **Off without its keys, both or neither.** Wherever the keys are, a trace is tagged `production` on Vercel's production and `development` elsewhere, so the evals of 8.4 show apart.
- **A failed export never fails a call:** after at most 3 seconds, it reaches Sentry as a code.

## Alternatives considered

- **Langfuse's SDK with a tracer provider of its own:** five packages pinned to Sentry's OpenTelemetry, and the shared context's sampling to work around.
- **The AI SDK's telemetry into Langfuse, with inputs and outputs off:** the SDK would decide what leaves, and a new version could add a field.
- **Langfuse's REST ingestion:** it closes on 16 November 2026.
- **`llm_usage` alone (8.3):** the project rules ask for Langfuse, whose dashboards show cost, latency and failures per prompt without building them.

## Consequences

- Langfuse's free plan shows 30 days and deletes nothing; it gets no personal data, which makes that acceptable.
- A new attribute means changing the helper and its test, which lists every key that leaves.
- An export adds a request of up to 3 seconds after each call, inside a background step.
- Langfuse shows an upper bound: up to twice what DeepSeek charges off-peak.
