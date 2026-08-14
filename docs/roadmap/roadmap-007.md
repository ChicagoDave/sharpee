# 007 — Choice-based (CYOA) mode

**Status**: PROPOSED
**Built?**: none — no implementing package; `packages/` has nothing choice- or CYOA-specific
**Created**: 2026-01-14
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: TBD
**Traces to**: ADR-103 · ADR-136 (context-driven action menus) · ADR-137 (input modes) · overlaps [003](./roadmap-003.md)

---

## What it is

Letting an author write a choice-based story — the player picks from offered options rather
than typing commands — on the same platform, rather than reaching for a different tool.

ADR-103's argument: parser IF and choice IF share their underlying needs. State management,
branching logic, and player agency are the same problems. What differs is the input surface.
Twine has a low barrier to entry and suffers at scale; Sharpee's world model and Chord's
declarative story description are what a large choice-based story would want.

## Where it stands

ADR-103's header reads `Proposed`, and here the header and the evidence agree — nothing is
built. It is one of the oldest items on this roadmap by creation date and has not been
revisited since.

## What it shares with the visual novel client

Item [003](./roadmap-003.md) needs the same thing this does: a way to offer the player
options instead of a parser prompt, carried on channels and rendered per client. **Whether
that is one mechanism or two has not been decided**, and deciding it is probably the first
real work on either item — building them independently is how the platform ends up with two
choice systems.

ADR-137 already names a Conversation Mode whose available commands are dialogue choices, so
the input-mode seam exists; what does not exist is the authoring surface in Chord or the
rendering contract for a choice list.
