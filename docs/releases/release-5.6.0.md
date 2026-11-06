# 5.6.0 — finished food leaves the world, and packages that export what they mean

**Status**: PUBLISHED
**Published**: 2026-11-06
**Chord language**: 4.0.1
**Traces to**: ADR-388 · ADR-389 · ADR-390 · ADR-391 · [#641](https://github.com/ChicagoDave/sharpee/pull/641) · [#645](https://github.com/ChicagoDave/sharpee/issues/645) · [#394](https://github.com/ChicagoDave/sharpee/issues/394)

## What shipped

One small language change and a round of cleanup underneath it. A thing that is fully eaten or
drunk now leaves the world, and Chord gains `servings <n>` so a story can say a thing lasts more
than one bite. Chord moves to 4.0.1. The rest is the platform getting smaller: three packages now
export only what something uses, and state that had two writers has one.

## Details

- A fully eaten or drunk thing leaves the world. A vessel that holds liquid stays when it is
  emptied.
- `servings <n>` is a new line on an edible or drinkable thing: how many bites or sips it has
  before it is finished. A thing with no line has one serving, as before.
- The player is a role the session holds (ADR-390). `WorldModel.playerCharacter` replaces
  `getPlayer()` and `playerId`; `setPlayer` assigns the role at the start and `changePlayer` moves
  it during play.
- The Chord compiler and the loader refuse an invalid story by one rule (ADR-389), and a Chord
  entity's id in the world is the id the compiler gave it.
- `@sharpee/core` names its contract (ADR-391): the barrel lists each export by name, and the
  unused `constants`, `extensions`, `debug` and `execution` subsystems are deleted.
- `@sharpee/event-processor` writes no state for a standard action; the action's behavior is the
  one writer. Its barrel exports six names, and opening and closing each report one event.
- `@sharpee/bootstrap` takes the engine's `Story` type where it took `any` (#645).
- 5.5.1 was published on 2026-10-30 without a note of its own. It carried ADR-388: what a Chord
  save records is keyed by the names the author wrote, so a save still restores after the story is
  edited.
