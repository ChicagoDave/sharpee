# 5.7.1 — an `emit` prints nothing

**Status**: PUBLISHED
**Published**: 2026-11-19
**Chord language**: 4.1.0
**Traces to**: [#724](https://github.com/ChicagoDave/sharpee/issues/724)

## What shipped

A Chord `emit` raises a story event: a signal for the story's own machines, channels and sounds.
It is not prose, and from this release it prints nothing, whatever the event is named and whatever
fields it carries. Before this release an `emit` whose name was also a phrase key printed that
phrase, in the trait's default wording rather than the wording the thing itself gave, so a line
could appear twice with two different texts.

The Chord language stays at 4.1.0. No grammar changed and no story stops compiling. *The Chord
Manual* already said that an event is not prose; its edition is now pinned to this release, with
every example compiled and every tree replayed on the published 5.7.1.

## Details

- **An `emit` never prints.** The compiled story lists the events its `emit` statements name, and
  the platform renders none of them. This holds for an event that shares its name with a phrase,
  and for one whose payload has a field named `message`, `text` or `messageId`.
- **Prose comes from `phrase` and `say`, as before.** A clause that should both raise an event and
  print a line says both.
- **The compiled story format moved.** A story compiled before this release is refused when it is
  loaded, with an "Unsupported IR format" error. Compiling it again clears it.
- **Events no longer carry a `narrate` flag.** In `@sharpee/core`, `ISemanticEvent.narrate`, the
  `narrate` metadata key of `createEvent` and `CreateEventOptions.narrate` are removed. Nothing
  read the flag once the platform knew which events are story events.
- **A TypeScript story can state the same list.** `Story` in `@sharpee/engine` has an optional
  `storyEvents` field, a list of event types the platform never renders.
- **A host with its own prose pipeline may take the list.** `IProsePipeline` has an optional
  `setStoryEvents` method; the engine calls it when a story is installed.

## Upgrading

- Compile every Chord story again. A build is enough; no source needs to change.
- A story that relied on an `emit` to print a line loses that line. Add a `phrase` or `say`
  statement beside the `emit` to keep it.
- TypeScript code that set `narrate` on an event drops the field. Setting it is now a type error.

## Known in this release

- When the player role changes hands on the same turn the outgoing character walks into another
  room, that turn's reply shows the new character's room name over the entered room's
  description, with a garbled listing line. The next `look` is right
  ([#815](https://github.com/ChicagoDave/sharpee/issues/815)).
