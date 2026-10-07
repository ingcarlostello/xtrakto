# Architecture decision records

An ADR records one significant decision: why it was needed, what was decided, which alternatives were rejected and what follows from it. ADRs explain the reasoning behind the [system design](../ARCHITECTURE.md); the design document describes the result.

## When to write one

Write an ADR when a decision is hard to reverse or shapes how other code is written: a technology choice, a data model rule, a privacy boundary, a deviation from the system design. Routine implementation choices don't need one.

## How to write one

1. Copy [`0000-template.md`](0000-template.md) to `NNNN-short-title.md`, using the next free number.
2. Fill in every section. Keep it to one page.
3. Start with the status **Proposed**; it becomes **Accepted** when the change that applies it is merged.
4. Never rewrite an accepted decision. To change it, write a new ADR and mark the old one **Superseded by NNNN**.
5. Add it to the index below, in the same commit as the change it records.

## Index

| ADR | Title | Status |
| --- | ----- | ------ |

No ADRs yet. The first ones are recorded in Phase 0.9 of the [roadmap](../ROADMAP.md).
