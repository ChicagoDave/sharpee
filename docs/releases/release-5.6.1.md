# 5.6.1 — a story's test run in seconds, and Chord guards that say who owns what

**Status**: PUBLISHED
**Published**: 2026-11-13
**Chord language**: 4.0.2
**Traces to**: ADR-392 · ADR-393 · ADR-394 · ADR-395 · [#664](https://github.com/ChicagoDave/sharpee/issues/664) · [#667](https://github.com/ChicagoDave/sharpee/issues/667) · [#668](https://github.com/ChicagoDave/sharpee/issues/668) · [#697](https://github.com/ChicagoDave/sharpee/issues/697) · [#698](https://github.com/ChicagoDave/sharpee/issues/698)

## What shipped

`sharpee test` is much faster on a large story. A test tree's branch now starts from a save taken
at its fork instead of a fresh game replayed from the top, and a derived suite boots one game and
restores it before every row. A 480-entity story with 106 lines and 1,737 derived rows went from
257 seconds to 14, with the same verdicts. Beside that, Chord gains a handful of trait words and a
set of compile-time guards that refuse a story which puts a rule on the wrong owner. Chord moves to
4.0.2.

## Details

- A branch line of a test tree starts from the engine's save at its fork card. A line whose own
  cards type `undo`, and a fork before any command, still boot fresh and replay.
- A derived suite boots one game, saves it as booted, and restores that save before every row.
- Test runs boot the engine with no undo snapshots unless a command can ask for undo.
- A restore to a point before the first random draw starts the Chord random stream from the story
  seed again, where it used to continue from the stream in memory.
- A claims walk stops when the engine refuses a save or a restore (#698), and a save fork hands
  the engine's save and restore hooks back to every caller (#697).
- `wearable on the <part>` places a wearable on a body part; two placed things on one part refuse
  the second. `opens when unlocked` and `closes when switched off` let an openable act by itself.
  `smelly` and `loud` give a thing a scent and a sound that smelling and listening read (ADR-392).
- A story trait classifies after `is a`, and a classifier must name something: a word that is
  neither a kind nor a trait is `analysis.unknown-classifier` (ADR-394).
- `the sword is scenery` holds when the thing's block composes that trait word. Until now every
  trait adjective but `dark` compiled and read false.
- A `define action` that tests which thing was named (`the item is the sword`) no longer compiles;
  the rule belongs on the thing, as an `on the player <gerund>` clause. Its refusals lead the
  block.
- A story action that repeats a standard action's grammar no longer compiles; the fix-it names the
  owner clause, `extend action` and `remove from action`. A bare `smell` or `listen` asks the room.
- A story action runs no thing's own `on` clause and no bare head; it runs a thing's `after`
  clauses and the `on` clauses of its traits.
- Switching a light reads the room's darkness, not a count of lamps (#667).
- `ClimbableTrait.destination` is removed. A climbed thing is a place to be; a way between rooms
  is the room's `passage` block.
- `@sharpee/bridge` and `@sharpee/runtime` are retired (ADR-393), and the umbrella's
  `runtime-surface` subpath went with them. Neither was ever published.

## Upgrading

- A story that tested a named thing inside a `define action`, or defined an action over a standard
  action's grammar, stops compiling. Each diagnostic carries its fix-it.
- TypeScript that set `destination` on a `ClimbableTrait` or called
  `ClimbableBehavior.getDestination()` should use a passage between the two rooms.
