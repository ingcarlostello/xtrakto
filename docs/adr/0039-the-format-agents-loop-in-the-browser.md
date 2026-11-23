# 0039. The format agent's loop runs in the browser, without LangGraph.js

- **Status:** Accepted
- **Date:** 2026-11-11

## Context

For a spreadsheet no parser knows, the LLM proposes each column's role from its names and shapes ([ADR 0038](0038-the-llm-sees-a-formats-shapes-never-its-values.md)), and the person confirms the reading the code makes with them ([ADR 0037](0037-other-banks-formats-proven-where-the-file-is.md)). When the proposal is wrong, the person corrects it alone (11.3b), though the file's own balances often say what's wrong: debits read as money in break every balance, and a column the model left out may say each movement's way. System design §7 drew an agent that proves a proposal by reconciling it, retries with a stronger model and asks the person last; the roadmap's outline built it with LangGraph.js, which Stage 13's chat will use.

The loop needs the file at every step, to read a proposal, try a repair and choose the best reading, and the file never leaves the browser ([ADR 0008](0008-files-read-in-the-browser.md)): it waits in its Web Worker. Only the LLM's calls go to the server, at most two of them.

## Decision

- **A pure transition function in `features/format-mappings`** (`nextStep`): from where the agent is and what the page tells it, the next command. It looks up the mapping saved for the format and reads the file with it; without one, or when it doesn't read the file, it asks the LLM for roles and reads the file with them; when their balances don't chain, it tries the code's repairs; when neither verifies, it proposes once more; then it asks the person, with the best reading. The page carries out each command (`use-file-readers`): the worker reads and repairs, the server actions look up and propose. Tests run the transitions without a browser, and the eval (11.5) can too.
- **Repairs the balances prove, in the worker** (`repairChoices`, `@xtrakto/parsers`): money in and out the other way round, and, for an amount read as signed, a column left out whose words say each movement's way, as banks write them ("D" and "C"). A repair counts only when every balance chains to the cent; a file without balances gets none, since nothing proves it.
- **A second proposal told what failed, in codes** (`propose-mapping-retry` v1): `deepseek-v4-pro` alone gets the same sample, the roles it was given and what failed: a column by its number and why it doesn't read, no movement, or the share of movements whose balance doesn't follow. `proposeFormatMapping` validates the retry with a strict schema of roles and codes, so no value of the file rides along.
- **The person always has the last word:** the reading that verifies, else the latest that reads the whole file, else the one that reads furthest down it, opens "Confirma cómo leer tu extracto" as before. A new format is still confirmed once, as v8-14 draws it.

## Alternatives considered

- **LangGraph.js on the upload page:** a graph runtime downloaded with the upload screen for a loop of two calls and one question, and its state would still have to live beside the worker that holds the file. Stage 13's chat, with tools and turns on the server, is where it pays.
- **The loop on the server:** the file would have to reach it before the person confirms anything, which ADR 0008 and ADR 0038 rule out.
- **A third proposal, or the person sooner:** each call costs the person's month and time; the balances prove most mistakes for free, and the person confirms the format anyway.
- **The signed amount's sign turned as a repair:** it needs a field the saved mapping doesn't have, and no file has shown that convention yet (decided with the human).

## Consequences

- A format whose balances prove a repair costs one call and opens already adding up; one the first proposal misreads costs two, the second about USD 0.0016 of the person's month.
- DeepSeek receives, beside names and shapes, the roles it proposed and what failed, in codes: a column's number, a cause, a whole percent. Never a date, an amount or a text of the file.
- The loop is plain TypeScript the page drives, so it adds no dependency. Its figures, after the first proposal, the repairs and the second, come with its eval (11.5).
