# 0031. DeepSeek's own API for LLM calls

- **Status:** Accepted
- **Date:** 2026-10-30

## Context

Stage 8 brings the first LLM calls: a category for the movements no rule knows (8.5) and a title in plain words for the payments no rule names (8.6), from texts redacted first (system design §4, §6). Gate 8.1 chooses who answers them. The calls are short, a batch of bank texts in and category ids or short titles out, and they run in Inngest's background steps. With any small model they cost cents per user and quarter, so the choice turns on privacy and operations, not price.

Xtrakto is a personal, non-commercial project to learn with, free for whoever wants to try it, and its owner has prepaid credits at DeepSeek. DeepSeek's API keeps its data in the People's Republic of China, lists training among the purposes of what it receives (opting out by email) and states no retention period ([privacy policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html), February 2026). Colombia's Ley 1581 lets data go to a country without an adequate level of protection, which the SIC's list doesn't name China as, with the person's express authorization.

## Decision

- **DeepSeek's own API,** with a key made only for this project. Its prepaid balance is the spend limit.
- **`deepseek-flash` answers, and `deepseek-v4-pro` is its fallback,** on the same account. Each attempt gets 20 seconds, no thinking (DeepSeek's V4 models think by default) and no retries of its own: the second model is the retry, and both attempts fit in the Inngest route's 60 seconds. When the whole API is down, the movements wait for the next run (system design §1).
- **Through `lib/ai` only, with `@ai-sdk/deepseek`.** A bare model id would go through Vercel's AI Gateway. DeepSeek offers a JSON mode, not a schema it holds the model to, so the SDK puts the schema in the instructions and Zod validates the answer; an answer it rejects goes to the fallback.
- **Failures as codes.** The SDK's errors carry content: an API error keeps the request's body, and an unreadable answer keeps its text. `lib/ai` returns only the model and what failed (`TIMEOUT`, `INVALID_OUTPUT`, `PROVIDER_ERROR` with its HTTP status), never the error.
- **Whoever uses the app accepts that their redacted bank texts go to DeepSeek,** as the privacy page will say before any is sent (8.5b). From a development machine, only invented texts go.

## Alternatives considered

- **Claude Haiku 5.5, with GPT-6 Luna as fallback, each through its own API:** USD 0.10 and 0.50 per million tokens, no training, 30 days of retention in the United States; two accounts and two more parties on the privacy page.
- **The same through Vercel's AI Gateway:** one account, and failover across the hosts of a model; zero data retention only on Vercel's Pro plan.
- **DeepSeek V4.1 Flash through the AI Gateway, on hosts in the United States that don't train:** the same model with the data in the United States, paid with the gateway's credits instead of the owner's.
- **Gemini's API:** about three times the price, 55 days of retention, and a free tier that trains on what it receives.

## Consequences

- Before 8.5b sends a real text, the privacy page and `docs/data-flow.md` must say that redacted bank texts go to DeepSeek in China, that it may train on them and that it states no retention period. The legal review before a public launch (16.4) stands.
- One provider: while DeepSeek's API is down, no LLM feature works; they are built to wait.
- A JSON mode instead of a held schema: some answers fail validation and cost a second call. The evals (8.4) measure how often.
- Moving to another provider changes `lib/ai` and 8.3's prices, not their callers.
