# 5.6.3 — a reloaded page keeps its panels and its place

**Status**: PUBLISHED
**Published**: 2026-11-17
**Chord language**: 4.0.3
**Traces to**: [#798](https://github.com/ChicagoDave/sharpee/issues/798)

## What shipped

A story's browser page restores the game from its autosave when it is reloaded. Until now it
restored the transcript, the score and the turn count, and nothing else the page was showing. This
release puts the rest back. It is an interim release, cut so that the Chord manual's reader runs
can go on: the manual's edition is pinned to the release after it.

## Details

- After a reload, the status line names the room the player is in. Before, it showed the score
  and the turns with no room name until the player moved (#798).
- After a reload, a panel fed by one of the story's own channels shows what it showed before. A
  channel in `append` mode keeps every entry it had gathered, in order. Before, the panel was
  empty and hidden (#798).
- The Restore menu does the same. Restoring an earlier save shows that save's room and that
  save's panels, and drops what the channels gathered after it was made (#798).
- `Renderer.replayState` in `@sharpee/channel-service` is the new call a client uses to put a
  saved channel state back on screen. `getStateSnapshot` already returned that state.

## Upgrading

- A save or autosave made before this release still restores. It holds no record of what the
  channels were showing, so it restores as it did before this release, without the room name
  or the panels.
