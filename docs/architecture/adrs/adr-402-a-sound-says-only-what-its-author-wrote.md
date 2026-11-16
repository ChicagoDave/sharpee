# ADR-402: A sound says only what its author wrote

**Planning**: IMPLEMENTED

**Summary**: A Chord sound prints only the `heard:` and `heard from afar:` lines its `define sound` block states and prints nothing when it states none; the platform's default "You hear <name>." line never stands in for a declared sound, and an empty kind template is silence in the engine, not a fallback; an `emit` event name is one word.

**Status**: **ACCEPTED** (David, 2026-11-15, session 5f3320: "yes", after ruling the change ADR-worthy on GH #750: "a"). Every decision below is a ruling David gave in session 58d051 on GH #713, quoted where it decides a point, and all of it is built and pushed (`58ce321c4`). The record was written after the build. No question is open.

## Date: 2026-11-15

**Kind**: technical

**Scope**: `packages/chord` (the `define sound` block, the one-word `emit`, `ir.sounds`), `packages/story-loader` (the `sound.heard.<name>.<tier>` registration), `packages/engine` (the audibility handler's empty-template rule).

## Parent

- **ADR-374 D6** (a sound is one thing with two sides; a listener hears its world side). The construct this record gives words to.
- **ADR-172** (spatial sound propagation). The four clarity tiers the lines are registered for.
- **ADR-216** (declared assets, payloaded `emit`). The `define sound` and `emit` productions this record changes.
- **ADR-401** (hearing is authored). Rules who hears a sound and how far it carries; it does not rule what a sound prints. Its D3 and D4 read the same `sound.heard.<kind>.<tier>` templates.

## Context — read in the source, 2026-11-15

**Before GH #713, `play sound` always printed the sound's name as prose.** The audibility handler resolves `sound.heard.<kind>.<tier>` and falls back to `sound.heard.default.<tier>` (`packages/engine/src/prose-pipeline/handlers/audibility.ts:81-82`), and the default line prints the kind verbatim: `'{You} {hear} {verbatim:kind}.'` (`packages/lang-en-us/src/sound-messages.ts:39`). A Chord author had no way to say what a sound sounds like, and no way to have it print nothing: a sound declared as `tolling` printed "You hear tolling."

**A multi-word `emit` name compiled.** `emit` collected several words into one event name, which names an event with spaces in it; nothing in the platform is called that, and no story, test or guide page used the form.

## Decision

**D1 — A `define sound` block states what the sound prints.** (David, 2026-11-15, on GH #713: "b".) `define sound <name> [from "<file>"]` may take a block closed by `end sound`, holding at most one `heard: <text>` line and one `heard from afar: <text>` line (`packages/chord/chord.ebnf:1811-1821`; `parseSoundBody`, `packages/chord/src/parser.ts:8567`). The two one-line forms without a block are unchanged. The diagnostics are `parse.sound-heard`, `parse.sound-heard-repeated`, `parse.sound-body` and `parse.sound-end`. The analyzer carries every declared sound to the IR as `ir.sounds` (`packages/chord/src/ir.ts:215`), with or without lines.

**D2 — A line the sound does not state prints nothing.** A sound with no `heard:` line is silent in prose where it is made, and one with no `heard from afar:` line is silent where it arrives from elsewhere. It is still played, and listeners still hear it; only the player's prose is absent. The platform's default line never stands in for an author. The loader does this by registering all four clarity tiers for every declared sound: `heard` at `full`, `heardFromAfar` at `muffled`, `fragments` and `presence-only`, and the empty string where the line is not stated (`packages/story-loader/src/loader.ts:294-298`, `HEARD_TIERS` at `:539`).

**D3 — An empty kind template is silence, not a fallback.** (David, 2026-11-15: "yes", after the first test run showed an empty template rendered an empty block.) The engine's audibility handler returns no block when the kind's own template is registered as the empty string, and does not fall through to `sound.heard.default.<tier>` (`packages/engine/src/prose-pipeline/handlers/audibility.ts:84-87`). The rule is the engine's, not Chord's: any language provider that registers `''` for a `sound.heard.<kind>.<tier>` id gets silence.

**D4 — An `emit` event name is one word.** Several words are the error `parse.emit-name`, which offers the hyphenated spelling (`packages/chord/src/parser.ts:9059-9069`). This removes a form that compiled. It rides the unpublished working number 4.0.3 with a dated grammar-hash re-pin in `packages/chord/tests/language-version.test.ts` and no version bump.

### On paper

```
define sound tolling
  heard: The bell tolls, close and brassy.
  heard from afar: Somewhere a bell is tolling.
end sound

## Played and heard by listeners; the player reads nothing.
define sound ticking

create the bell
  in the Refectory

  A brass handbell.

  after the player taking it
    play sound tolling
    emit bell-rung
  end after
```

## Consequences

- A story that relied on "You hear <name>." for a declared sound prints nothing there until its author writes a `heard:` line. This is a content change for every Chord story that plays a sound.
- The fallback to the default line survives for a sound kind nobody registered a template for: a TypeScript story's `emitSound` with its own kind still prints the default line unless that story registers the kind's templates. Only a registered empty string is silence.
- The lines are keyed by clarity tier, not by room (`loader.ts:296`): `heard:` is the `full` line and `heard from afar:` is every lesser tier. ADR-401's tier table makes a `subdued` or `whisper` sound less than `full` in its own room, so when ADR-401 is built such a sound will read its `heard from afar:` line to a player standing beside it. ADR-401's plan must decide whether the two lines stay keyed by tier or move to same-room and other-room.
- ADR-401 D3's heard lines for standard actions are templates in `lang-en-us` under the same ids; D3 here means an action sound whose line is registered empty would also be silent.
- The manual's Part VII snapshot can give the lamp catch and the per-turn toll a sound (GH #752), and the IDE's lexer corpus needs a sound-block line and a one-word `emit` before the next publish (GH #729).
- Nothing new is saved: the templates are registration, redone at every load.

## Acceptance

All discharged in session 58d051; results as that session's summary recorded them.

1. The block parses, each diagnostic fires on its defect, and `ir.sounds` carries every sound: `packages/chord/tests/define-sound-heard.test.ts` (10 tests).
2. A played sound with a `heard:` line prints exactly that line in a real engine turn, and one with no line prints nothing of its own: `packages/story-loader/tests/gh-713-sound-heard-lines.test.ts` (3 tests, real engine through `bootTurns`).
3. An empty kind template returns no block: `packages/engine/tests/prose-pipeline/handlers/audibility.test.ts` (1 case).
4. Not covered: `heard from afar:` in a played turn from another room is pinned only by a registration test (GH #751).

## Session

Decisions: session 58d051, 2026-11-15, branch `main` (GH #713, commit `58ce321c4`). Record: session 5f3320, 2026-11-15, at David's ruling on GH #750.
