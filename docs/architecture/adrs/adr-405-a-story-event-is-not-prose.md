# ADR-405: A story event is not prose

**Planning**: OPEN

**Summary**: An event a Chord story raises with `emit` is a story event, a signal for channels and machines; the compiled story declares its story-event types, the engine hands them to the prose pipeline at install, and the pipeline renders none of them. No event carries a rendering flag: `ISemanticEvent.narrate` is removed.

**Status**: **ACCEPTED** (David, 2026-11-19, session 785b7e: "accept", to "Do you accept it?"). Written the same day and session at David's direction ("proceed", approving the plan `docs/work/story-event-not-prose/plan.md` and its recommendation to record the decision). The decisions are his: that the fix says what the event is ("I dislike the narrate: false construct - it is not a DDD construct"), and that the flag is cleaned up in the same change ("if we're going to fix it, let's clean up the flag too - one big happy patch bump change"). All five decisions are built on branch `fix/724-emit-prints-nothing` (2026-11-19). Planning stays `OPEN` until the branch lands on `main`.

## Date: 2026-11-19

**Kind**: technical

**Scope**: `packages/chord` (the IR's `storyEvents` list and `IR_FORMAT`, `src/story-events.ts`, the `emitStoryEvents` pass, `validateIR`), `packages/story-loader` (`ChordStory.storyEvents`), `packages/engine` (the `Story` interface, `installStory`, `setTextService`, the prose pipeline's filter stage), `packages/core` (`ISemanticEvent`, `createEvent`, `createTypedEvent`), and every producer that set `narrate` (`packages/event-processor`, `packages/parser-en-us`, `packages/world-model`, `packages/story-loader/src/runtime`, `stories/dungeo`, `stories/family-zoo-tutorial`)

## Context — read in the source, 2026-11-19

GitHub #724, reported by John on 2026-11-14 while moving Family Zoo to Sharpee 5.6.1: a trait wrote `emit petted` beside `phrase petted`, each animal overrode the phrase, and the player saw the trait's default line and then the animal's own.

- `emit petted` raises an event whose type is the bare `petted`; a story's own event names pass through `translateEventId` unchanged (ADR-256 D3).
- The loader registers every phrase key as a message id, so the trait's default text is registered under `petted`.
- The prose pipeline offers every event to its handlers. The catch-all, `handleGenericEvent`, tries the event's type as a template key, and prints a data field named `message` or `text`; `tryProcessDomainEventMessage` renders a data field named `messageId`. A story event could therefore print three ways, none of them intended.
- The published Chord manual says the opposite: "An event is not prose, and `emit` prints nothing" (chapter 37).
- The same doubled line was in the repository's own `stories/friendly-zoo/zoo.story`.

A first attempt marked each emitted event `narrate: false` and had the filter honour the flag. It failed in two ways. A clause's events are flattened into the `CapabilityEffect` envelope and rebuilt, so the flag had to be threaded through the envelope and three rebuild sites; and the loader's `narrated()` stamped `narrate: true` over it on every scheduler-run clause, so an `emit` in `on every turn` still printed. A mark that rides on the event can be lost wherever an event is rebuilt.

`ISemanticEvent.narrate` itself was read by nothing. A census on 2026-11-19 found only writers: core's `createEvent` (defaulting it to `true`), the engine's refused-meta event and `normalizeEvent`, event-processor, parser-en-us, world-model, the loader's `narrated()`, and about fifty lines across Dungeo and `stories/family-zoo-tutorial`.

## Decision

1. **A story event is a kind of event, and it is not prose.** An event a story raises with `emit` is a story event: a signal the story declares for its channels and state machines to hear. Whether it is rendered is decided by what it is, never by a field the producer sets on the record.

2. **The compiled story declares its story-event vocabulary.** The Story IR carries `storyEvents`: the event id of every `emit` in the story, each once, sorted, in Chord's dotless spelling. Media statements lower to `emit`, so their `media-*` ids are in it: the promise is about the statement, that an `emit` prints nothing. The list is read off the built IR by one function, `collectStoryEvents`, which visits every object in the IR, so an `emit` in a statement family added later is found without the function changing. `validateIR` refuses an IR whose list disagrees with its `emit` statements (`analysis.story-events-mismatch`). `IR_FORMAT` moves to `story language 7`; the language version does not move.

3. **The loader hands the vocabulary to the engine as data on the story.** `ChordStory.storyEvents` is the IR list through `translateEventId`, so it names runtime event types. `Story.storyEvents` is optional; a story that leaves it out (every TypeScript story today) declares none and its events render as they always have.

4. **The prose pipeline renders no story event.** `GameEngine.installStory` tells its pipeline the installed story's vocabulary (`IProsePipeline.setStoryEvents`, optional on the interface), and `setTextService` tells a replacement pipeline the same. The filter stage drops every event whose type is in the vocabulary before any handler is offered it, compared in lower case because the turn's event processor lowercases every type. Channels and plugins read the turn's events, not the filtered list, and are unaffected.

5. **No event carries a rendering flag.** `ISemanticEvent.narrate` is removed, with `createEvent`'s `narrate` metadata key, `CreateEventOptions.narrate`, the loader's `narrated()`, and every write of the field. There is no replacement.

## Records this one amends

- **ADR-256 D3** stands: a story's own event names still pass through untranslated. This record adds that the set of them is declared.
- **ADR-082** and **ADR-001** show `narrate` in their samples; each takes a dated note when Decision 5 lands.
- **ADR-388** is the precedent for recording a fact about the story at compile time and for an `IR_FORMAT` move shipped as a patch.

## Acceptance

- `packages/story-loader/tests/gh-724-emit-prints-nothing.test.ts`, through a real compile, loader, parser and `GameEngine.executeTurn`: an `emit` prints nothing from a thing's `on` clause, a thing's `after` clause, a trait's clause, an action's body, a media `emit`, an every-turn clause, a timer's `meanwhile`, a timer's expiry clause, a sequence step and a machine state's `on enter`; with an event named like a phrase key; and with fields named `message`, `text` and `messageId`. The event keeps its name and payload, a channel fed by it receives its field, a machine triggered by it steps, and a trait's default phrase prints once for an entity with no override.
- An `emit` before the game starts is refused at compile (`analysis.start-block-narration`), so the opening has no runtime path to test.
- `packages/chord/tests/story-events-ir.test.ts`: the list is complete, sorted and unique, and `validateIR` refuses one that is not.
- `packages/engine/tests/unit/story-events.test.ts` and `tests/prose-pipeline/stages/filter.test.ts`: the engine tells its pipeline, and a swapped-in pipeline, the vocabulary; the filter drops by type and leaves an undeclared type rendering.
- The Dungeo walkthrough chain is unchanged: 949 passed, every golden matched.

## Consequences

- An author's `emit` can share a name with a phrase, and can carry any field names, without printing. Stories that relied on the accident (an `emit` printing a same-named phrase) lose that line; `stories/friendly-zoo` and two Chord fixtures were printing it.
- A new way to raise a story event must be an `emit` in the IR, or add its type to the vocabulary where the loader builds it. `play sound` raises `media.sound.play` from its own IR statement, not an `emit`; that event carries only a source and is not in the vocabulary unless the story also emits it.
- A TypeScript story's events still render by type and by `message`, `text` and `messageId`, as the generic handler documents. A TypeScript story that wants the same guarantee sets `Story.storyEvents`.
- A host that supplies its own `IProsePipeline` may implement `setStoryEvents`; without it that pipeline renders story events like any other event.
- IR compiled before this change is refused by the loader's format gate and must be compiled again.
- Removing `ISemanticEvent.narrate` removes a field from a published type. David called the whole change a patch; versions move at publish.
- Nothing may reintroduce a per-event rendering flag. An event that must not render is given a kind the pipeline does not render.

## Session

Session 785b7e, 2026-11-19, branch `fix/724-emit-prints-nothing`. Plan: `docs/work/story-event-not-prose/plan.md`. Issue: #724.
