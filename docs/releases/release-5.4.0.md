# 5.4.0 — the explicit ending release

**Status**: PUBLISHED
**Published**: 2026-09-11
**Chord language**: 3.6.0
**Traces to**: ADR-347 · ADR-345 · [#414](https://github.com/ChicagoDave/sharpee/issues/414) · [#415](https://github.com/ChicagoDave/sharpee/issues/415) · [#416](https://github.com/ChicagoDave/sharpee/issues/416)

## What shipped

The end of a story is now something the platform can say. It had four names and no owner — a
world-state flag, the `story.victory`/`story.defeat` events, the engine's own `game.won`/`game.lost`
pair, and a `Story.isComplete()` hook polled once a turn — so five different places re-derived the
same fact and none of them held it. A player who reached an ending in the browser could not type
`restart`, and reloading the page put them back in the same dead prompt. The ending is now a
first-class member of the world, declared by one verb, and the three defects behind that report close
with it.

## Details

- The ending is a record on the world (ADR-347): `IStoryEnding` carries the kind, the turn, the
  ending phrase's message id and a cause, and it is absent while play continues. A story that has not
  ended has no Ending, which is a different statement from one that says nothing.
- One verb declares it. `endStory(world, kind, opts)` sets the Ending and returns the blessed ending
  event, and Chord's `win`/`lose` lowers onto it rather than carrying its own implementation — the
  same shape `kill` has always had with `killPlayer`. The first ending wins: a second call on an
  ended world writes nothing and emits nothing.
- **`Story.isComplete()` is gone.** An ending is declared at the moment it becomes true, never polled
  for once a turn. Nothing in the tree actually polled for completion, and an optional hook that
  could report complete while the world carried no Ending was the split state the change exists to
  prevent.
- The engine reads the Ending instead of recomputing it. The turn's ending stage used to reconstruct
  the answer from three unrelated sources every turn; it now asks the world one question.
- **A Chord `lose` ends the story as a defeat.** It previously set the world flag, which the
  completion poll read, which stopped the engine as a *victory* — the engine only ever watched for
  `story.victory`.
- Every ending reports itself. A death is declared by the engine rather than by the story, and it now
  emits `story.defeat` onto the turn's event stream like any other ending, where before it recorded
  the Ending silently.
- The engine's phase is derived from the Ending when a save is restored: a save carrying an Ending
  restores stopped, one without it restores to play. That retires the reconciling patch 5.3.2 needed,
  and it is why RESTORE and UNDO now work at an end-game prompt.
- Clients are told in state, not in prose. A new `story-ending` channel carries the record, alongside
  the existing `endgame` notification it deliberately does not replace, and the browser drives its
  input box from it — disabled when the story ends, live again the moment a restore or undo returns
  the player to a turn they can type into.
- The end-game prompt comes from the language layer, derived from the same Ending, so every host gets
  it rather than each client inventing one.
- Reloading an ended game no longer strands the player. The ended world is still saved, faithfully;
  what changed is that the reload lands at an end-game prompt that works, instead of the save being
  suppressed to dodge a state the platform could not represent.

## Upgrading

Breaking, which is why this is a minor rather than a patch:

- `Story.isComplete?()` is removed from the `Story` interface. A story that ended itself by returning
  `true` from it calls `endStory(world, kind, { turn })` at the moment its condition becomes true.
- `ChordStory.triggerEnding` and `RuntimeHost.triggerEnding` take `(world, ending, turn, messageId?)`
  and return `ISemanticEvent | undefined` — `undefined` when the story had already ended.
- `TurnStageContext.victory` is removed. A hand-emitted `story.victory` event no longer stops the
  engine on its own; `endStory` is the declaring route.
- A Chord `lose` now ends as a defeat rather than a victory, and a death turn emits `story.defeat`.
- New public surface: `IStoryEnding`, `endStory`, `WorldModel.getEnding`/`setEnding`, the
  `story-ending` channel, and `EndGamePrompt`.

Saved games written before this release carry the old world-state flag and are not read for an
ending. No story has been released, so no save in the world needs migrating, and no compatibility
shim ships.
