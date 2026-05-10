# ADR-172 Phase 7a — Audibility Prose Handler

**Date**: 2026-05-09
**Branch**: main
**Predecessor**: Phase 6 commit `16d83808` (action integration + ADR ACCEPTED)
**Scope**: Prose half of Phase 7 only. Audio cue rendering deferred to Phase 7b pending tier-to-audio spec.

---

## Goal

Wire `sound.audibility.heard` events into the text-service so audibility events delivered to the player become text blocks rendered through the main text channel. Single-user scope only.

This unblocks ADR-172 AC-6's prose half ("the text channel renders prose for the same events at all clients") at every client (terminal, browser, future surfaces) in one stroke, since the text-service is shared across all clients.

## Why this is necessary

Phase 5 shipped 12 prose templates in `packages/lang-en-us/src/sound-messages.ts`. Phase 6 emitted `sound.audibility.heard` events into the turn stream. **Nothing today consumes those events to produce prose.** `soundMessageId()` has zero call sites outside `language-provider.ts`, which only registers the templates without ever resolving them.

The Phase 6 integration test verifies `audibilityTier` in the event payload, not rendered prose. The gap is invisible to existing tests.

## Naming discipline

Three concepts coexist in this codebase and must not be confused:

| Concept | Owner | Identifier examples |
|---------|-------|---------------------|
| **Audio playback** (HTMLAudioElement, Web Audio graph) | ADR-169 / `platform-browser/audio/` | `AudioManager`, `audio.ambient.play`, `audio.music.stop` |
| **Sound media cues** (channel id reserved by ADR-163) | stdlib media | `media.sound.play`, the `sound` channel id |
| **Audibility** (ADR-172 perception of propagated sound) | engine + stdlib + lang | `audibilityChannel`, `IAudibilityEvent`, `AUDIBILITY_HEARD_EVENT_TYPE` |

The new handler is named for **audibility** — never "sound" or "audio". This matches `audibilityChannel`, `IAudibilityEvent`, the `audibility` channel id, and `AudibilityTier`.

## Approach

Add a single text-service handler in `packages/text-service/src/handlers/audibility.ts` that:

1. Accepts a `sound.audibility.heard` `ISemanticEvent`.
2. Reads `IAudibilityEvent` from `event.data`.
3. Resolves the message id via `soundMessageId(kind, audibilityTier)` — falls back to `soundFallbackMessageId(audibilityTier)` if the kind-specific template is missing.
4. Hydrates the template with `{kind}` and (for content-bearing tiers) `{content}` parameters.
5. Returns a single `ITextBlock` per event.

Multiple events per turn (multiple sounds × multiple listeners) produce multiple blocks. The text-service's existing pipeline merges them into the turn output.

## Behavior Statement (per CLAUDE.md rule 12)

**`handleAudibilityHeard(event, context)`**

- **DOES**: Returns one `ITextBlock` whose text is the resolved-and-formatted prose for the audibility event (`sound.heard.<kind>.<tier>` template, with `{content}` substituted from the event's content payload when present and `{kind}` substituted from the event's kind).
- **WHEN**: Called by the text-service for any `ISemanticEvent` with `type === 'sound.audibility.heard'`.
- **BECAUSE**: ADR-172 §Channel routing guarantees that every surface renders sound prose; the text-service is the prose-rendering pathway. Without this handler, audibility events flow through the engine, get added to `result.events`, and silently disappear from the player's view.
- **REJECTS WHEN**:
  - `event.data` is missing or not an `IAudibilityEvent` shape → returns `[]` (no block) and logs once at `debug` level. The event is malformed; do not throw, since the text-service contract is non-throwing.
  - `audibilityTier === 'silent'` → returns `[]`. Silent should be filtered upstream (the dispatcher does not emit silent events), but defense-in-depth.
  - `languageProvider` is not present in context → returns `[]`. The handler cannot resolve templates without it; matches the pattern in existing handlers.

## Files Modified / Created

### New

- `packages/text-service/src/handlers/audibility.ts` — handler implementation + `handleAudibilityHeard` export
- `packages/text-service/tests/handlers/audibility.test.ts` — unit tests for the handler in isolation

### Modified

- `packages/text-service/src/handlers/index.ts` — re-export `handleAudibilityHeard`
- `packages/text-service/src/text-service.ts` — wire the new handler into the event-type dispatch table for `sound.audibility.heard`

### Possibly modified (TBD during implementation)

- `packages/text-service/src/handlers/types.ts` — only if `HandlerContext` needs a player-id field; current expectation is **no**, since single-user defaults make filtering unnecessary today.

## Listener filtering — single-user scope

`event.entities.target` carries the listener id (set by `buildAudibilityEvent` in the dispatcher). Today only the player has `ListenerTrait` automatically, so every audibility event is for the player by definition; **no filter needed in Phase 7a**.

When NPCs gain `ListenerTrait` (L2's NPC reactivity work), the handler will need to filter `event.entities.target === playerId` before rendering. The seam is already in place on the wire side; the handler-side filter is a future change. This is documented in the handler's file header so the future change is obvious.

## Tests (per CLAUDE.md rule 13 — derived from Behavior Statement)

| # | Asserts | Source line |
|---|---------|-------------|
| 1 | `full`-tier speech event with content produces `'sound.heard.speech.full'` resolved with content interpolation | DOES |
| 2 | `muffled`-tier ambient event produces `'sound.heard.ambient.muffled'` resolved with kind interpolation | DOES |
| 3 | Unknown kind (`'thunderclap'`) at `presence-only` tier falls back to `'sound.heard.default.presence-only'` template | DOES + fallback rule from sound-messages.ts |
| 4 | Multiple events in one turn produce one block per event, in input order | DOES |
| 5 | Missing `event.data` returns empty array, no throw | REJECTS WHEN |
| 6 | `audibilityTier === 'silent'` (defense-in-depth) returns empty array | REJECTS WHEN |
| 7 | Missing `languageProvider` in context returns empty array, no throw | REJECTS WHEN |

All tests assert on the returned `ITextBlock[]` content (not just on language-provider mock invocation), per the integration-reality discipline. Test 4 asserts on the block array's length and order, both are state checks.

## Acceptance check

After this phase:

- A scripted action that emits `emitSound({kind: 'speech', volume: 'normal', content: {messageId: '...'}, source_location: room.id})` produces a text block in the turn output containing the rendered template — verifiable by adding one assertion to the existing `packages/engine/tests/sound/integration.test.ts` (the tapestry scenario).
- The block content uses `{You}/{hear}/{catch}` formatter chains, so it picks up second-person POV and verb agreement from lang-en-us.

## What this does NOT do

- Audio cue rendering in the browser. That is Phase 7b, blocked on the tier-to-audio spec.
- Per-listener filtering for NPCs. That is L2 work; handler is documented for the future but not gated by it.
- Direction prose ("you hear voices to the north"). The `entry_room` field is exposed on `IAudibilityEvent` but the templates don't render it yet. Per ADR-172 §What this does *not* specify, directional language is deferred to a future ADR covering both rendering and parser.
- Sound stacking, suppression, or repeat-coalescing. One event in → one block out; ordering deferred to a future ADR.

## Risk and rollback

Additive only. New file + small edits in `index.ts` and `text-service.ts`. Rollback by reverting the commit; nothing else depends on this handler.

Test surface is fully unit-testable; the integration-test addendum is a single assertion on existing infrastructure.

## Implementation order (tight, single session)

1. Read `packages/text-service/src/text-service.ts` to find the dispatch-table pattern and confirm the registration shape.
2. Read one existing handler (`generic.ts` or `revealed.ts`) for the conventional structure.
3. Write `audibility.ts` + 7 tests.
4. Wire into dispatch table + index re-export.
5. Run `pnpm --filter '@sharpee/text-service' test` and `pnpm --filter '@sharpee/engine' test`.
6. Add one prose assertion to `packages/engine/tests/sound/integration.test.ts` and re-run engine tests.
7. Build via `./build.sh -s dungeo --skip` (skip earlier packages — text-service is the smallest unit).
8. Optional smoke: `node dist/cli/sharpee.js --play` in a Dungeo session that triggers an audibility event (none exist yet — this is just to confirm no regression in the silent-stories case).

Stop after step 7 and report. Do not start Phase 7b without explicit instruction.
