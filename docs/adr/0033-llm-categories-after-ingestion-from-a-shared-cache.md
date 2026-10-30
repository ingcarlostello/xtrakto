# 0033. LLM categories after ingestion, from a shared cache

- **Status:** Accepted
- **Date:** 2026-10-30

## Context

The rules name most movements, but not a purchase at a merchant the table doesn't know, which counts as "Otros", nor money in that no rule knows ([ADR 0023](0023-rules-give-a-best-guess-and-flag-what-to-review.md)). Phase 8.5 asks DeepSeek for those ([ADR 0031](0031-deepseek-api-for-llm-calls.md)), with the categorization prompt and its eval (8.4). Ingestion saves a statement in one transaction ([ADR 0019](0019-two-inngest-steps-with-ids-codes-and-counts.md)), which must not wait on an outside service: a provider failure or a reached limit must never fail an upload (system design §1). The same texts repeat across statements and users ("COMPRA EN AUDIFARMA"), and every call costs: the user's month and the platform's budget cap it (8.3). An LLM call takes up to two attempts of 20 seconds, and the Inngest route stops at 60.

## Decision

- **Rounds after `ingest`.** Once the job is done, the same function runs up to 8 steps, `categorize-0` to `categorize-7`, each one round: it reads the user's texts that wait (no category, or only the table's `unknown_merchant`; never a guess, the user's, the LLM's or a hidden movement), redacts each with the user's holder names (`redactPii`), gives the movements the cache's answers, and sends one batch of 25 texts the cache hasn't, within the user's limits. Another round follows only while texts are left; 8 rounds take 200 texts at most, and the rest wait for the next upload.
- **A shared cache.** `llm_category_answers` keeps every answer by prompt version, redacted text and direction, with its category, its title in plain words (since 8.6b, none when it doesn't read as one), confidence and model, and no user's id: any user's context reads it and adds to it, none changes it. A text another user's upload asked about costs nothing. Answers under the confidence threshold (0.7) stay too, so their texts aren't sent again.
- **From the threshold, to every movement with the text.** An answer of 0.7 or more becomes the category of every waiting movement of the user with its text going its way, in every statement, as the LLM's (`category_source = llm`), and the movement keeps it apart (`llm_category_id`), so undoing a user's rule gives it back ([ADR 0025](0025-user-rules-come-first-and-keep-the-rules-guess.md)).
- **Failures are values.** A provider failure, a timeout, an answer the schema rejects twice, a reached limit or a missing key end the round with a code (`AI_FAILED`, `AI_LIMIT_REACHED`, `AI_OFF`); the job stays done and the texts wait. A step returns counts and codes only, and its errors are sanitized. An unexpected error retries the step; after the last retry, the failure handler finds the job done and leaves it.
- **One batch a round, rounds early in a request.** Inngest's checkpointing runs consecutive steps in one request; this function lets it go on only for 15 seconds, so a round, at most 40 seconds of attempts, ends within the route's 60.

## Alternatives considered

- **The LLM inside `ingest`'s transaction:** a slow or failing provider would hold the transaction and fail uploads.
- **A function of its own, triggered by an event after ingestion:** it would free the user's turn sooner, but adds an event and a function for what a few steps do; the user's next file waits a few seconds at most.
- **Every waiting text in one step:** a large first statement would pass the route's time; batches in one step can't stop between calls.
- **A cache per user:** every user would pay again for the same merchants, and the cache would hold their data.
- **Only answers above the threshold in the cache:** a text the model isn't sure of would be sent on every upload.
- **The answer looked up in the cache on undo, instead of kept on the movement:** the cache keys redacted texts, which only TypeScript writes.

## Consequences

- A new upload's unknown merchants get their categories a few seconds after its result shows; the summary and the lists show them on the next visit.
- The user's next file of the same upload waits for the rounds, since the function holds the user's turn.
- DeepSeek receives each distinct text once, redacted, with its direction, and never an amount, a date, a reference or the account; the privacy page says so, with the transfer to China and that DeepSeek may train on them. The cache keeps texts with no user's id and outlives a deleted account; a name the redaction doesn't know, such as a person's after "PAGO QR", can stay in it.
- A new prompt version asks again for every text, under its own cache entries. A movement an earlier version categorized waits no more, so it keeps that answer: those of prompt v1 have no title, and read their category's (8.6b).
