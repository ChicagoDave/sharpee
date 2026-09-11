# 5.3.2 — the Chord `playable` release

**Status**: PUBLISHED
**Published**: 2026-09-11
**Chord language**: 3.6.0
**Traces to**: ADR-343 · ADR-344 · ADR-345 · ADR-346 · [#400](https://github.com/ChicagoDave/sharpee/issues/400) · [#401](https://github.com/ChicagoDave/sharpee/issues/401) · [#402](https://github.com/ChicagoDave/sharpee/issues/402) · [#404](https://github.com/ChicagoDave/sharpee/issues/404) · [#410](https://github.com/ChicagoDave/sharpee/issues/410)

## What shipped

The Chord `playable` keyword finally reaches the runtime. It had been in the language since
2026-08-26 and the analyzer had enforced it from that day, but the loader step that writes the flag
onto the actor was never built and the trait defaulted to *true* — so every actor in every story read
as playable, and the guard that checks it could never fire. Connecting it opened three more seams,
and all four are in this release.

## Notes

- The player role holder is validated where the story is installed (ADR-344): it must exist, be
  placed, carry an actor trait, and be `playable`. The loader's old fallback of dropping an unplaced
  protagonist into the first declared room is gone — every story places its own.
- The engine is never handed a player. `GameEngine` no longer takes one at construction; it comes
  from the story source, for Chord and TypeScript stories alike.
- `ActorTrait.isPlayable` now defaults to **false**, matching what Chord means by the word's absence.
  A protagonist built through the author-facing builder says so with `.playable()`.
- The engine's lifecycle is an explicit phase — `empty → ready → playing ⇄ stopped` (ADR-345) — rather
  than something each method re-derived from whichever field was nearest. `resume()` emits
  `game.resumed`, which it previously did silently.
- Traits no longer police completeness (ADR-346): a door may be one-sided and an exit half-built while
  a story is still composing the passage. Detection belongs where the world is checked as a whole.
- Gate work rode along: `pnpm typecheck` became a real gate (it had been compiling zero files), test
  files entered it, seven packages' suites entered the `test:ci` sweep, and engine tests stopped
  running on the wall clock.
