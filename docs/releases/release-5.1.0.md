# 5.1.0 — conversation

**Status**: PUBLISHED
**Published**: 2026-08-18
**Chord language**: 3.3.0
**Traces to**: ADR-310 · ADR-318 · ADR-320 · ADR-141 through ADR-146 (prior art)

## What shipped

The character model reached Chord. `@sharpee/character` had existed since April 2026 and passed
its tests with **zero consumers**; ADR-310 and ADR-318 gave it a Chord surface, and ADR-320 built
conversation on top across eleven phases. Authors can now write manner, greetings, exchanges,
initiative and whole conversation threads in a `.story` file, and The Ides of March was written
as the story that proves it.

## Details

- Chord 3.1.0, 3.2.0 and 3.3.0 all landed inside this release: the conversation grammar arrived in
  three slices, each with its vocabulary frozen by the owner the same day.
- NPC-to-NPC scenes, with earshot derived from spatial sound, player intrusion into a scene in
  progress, and mid-scene save/restore.
- Trait-level conversation memory: what a character has been told, and how recently, is world state
  that persists.
- Chord Writer gained an explain-NPC-turn panel — an author channel that reports why a character
  did what it did on a given turn.
- Goals, influence and information propagation are in scope rather than deferred, on the owner's
  ruling that they are the point of the character model.
