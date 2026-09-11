# 5.3.0 — publish-readiness, and the acting statement

**Status**: PUBLISHED
**Published**: 2026-09-04
**Chord language**: 3.6.0
**Traces to**: ADR-325 · ADR-326 · ADR-327 · ADR-328 · ADR-329 · ADR-330 · ADR-332 · the publish-readiness proposal (40 items)

## What shipped

The largest release of the 5.x line, and the first that was measured against a specific question:
what does an outside author writing a modest Chord story hit in their first hours? Forty defects were
triaged into a plan and worked through in sixteen phases. Underneath it, ADR-327 made clause heads
name who acts, ADR-328 threaded an actor through the whole standard-action library, and ADR-329 gave
Chord the acting statement — one character performing one real action, validated and interceptable,
through the same execution entry a player's command takes.

## Notes

- **5.2.0 is not missing.** It was bumped on 2026-08-29 and never published; everything in it ships
  here. That is why Chord went 3.3.0 → 3.6.0 in one step — 3.4.0 and 3.5.0 are landing history.
- ADR-327 is a Chord major folded into this release: `on <gerund> it` is gone, clause heads name the
  actor (`on the player taking`, `after Jack entering`), and syntactic `it`/`its` left statements and
  conditions outside a `define trait` body.
- The player became a role a named character holds: `playable` marks who is eligible, and
  `change the player to <character>` assigns it and can move it mid-play. `create the player` is gone.
- ADR-325 places and timers; ADR-326's `move <entity> to a random adjacent room`; ADR-330's chapters
  extension; `, one-way` exits; `proper` on any create block.
- The held command (a bare noun answering a disambiguation), possessive entity names in conditions,
  `remove` marking an entity *gone* rather than destroying it, and one-way exits are all
  publish-readiness fixes that an author meets early.
- `@sharpee/world-index` arrived (ADR-321): a story's map, reach and vocabulary gaps derived as JSON,
  surfaced in Chord Writer's World tab.
- Nested Chord imports (ADR-251 D5 amended), with `Span.file` so a diagnostic names the fragment it
  came from.
