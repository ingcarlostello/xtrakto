# Xtrakto

System design (read before planning or changing code):

@docs/ARCHITECTURE.md

## How to treat the system design

The architecture is a plan, not a contract. It was written before most of the code exists, so development will surface things it didn't anticipate.

- Use it as the default direction, not as something to follow to the letter.
- If part of it makes the code more complex than the problem needs, or reality contradicts it, change it. Your judgment counts as much as the document.
- When you deviate, say so explicitly: what changes, why, and what it simplifies or fixes. Don't drift away from it silently.
- Keep `docs/ARCHITECTURE.md` in sync with the code: update it in the same change. Significant decisions also get an ADR in `docs/adr/`.
- The `.claude/rules/` files are different: they are standards, not a plan, and their "Always / Never" rules still apply unless the user agrees to change them.

## Roadmap

What to build and in which order (stages, phases, gates, progress, phase log). Follow its section 1 workflow, one phase at a time:

@docs/ROADMAP.md

- Before starting any work, check section 5 for the next unticked phase and say which phase it is.
- If the roadmap and the Git section below disagree, the Git section wins: don't stage changes (roadmap step 6) unless the user authorizes it. Propose the commit message instead.

## UI

All UI follows `.claude/rules/design-system.md` (tokens, components, copy, accessibility). It loads automatically when you open `.tsx` or `.css` files under `apps/web/src/`. If you start a screen or component before opening one, read it first.

## Git

- **Never** run a git command that changes the repository or the remote (`add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `checkout`/`switch`, `branch`, `tag`, `stash`, opening PRs, etc.) unless the user explicitly asks for it or authorizes it.
- An authorization covers only the task it was given for. It doesn't carry over to later changes.
- Read-only commands (`status`, `diff`, `log`, `show`, `blame`) are allowed.
- When work is ready, propose the commit message and let the user decide.
