# `@sharpee/text-service` — Removal Audit

**Date**: 2026-05-09
**Branch**: main
**Predecessor doc**: `docs/work/channel-io-unification/text-service-disposition-20260503.md` (R8 disposition — KEEP block-production, deprecate wire-production for first-party). This audit revisits that decision toward complete removal.

---

## TL;DR

`@sharpee/text-service` is still load-bearing in two distinct ways:

1. **Block-production** — the engine calls `textService.processTurn(events) → ITextBlock[]` every turn. Those blocks feed both the legacy `text:output` event and the new `channel:packet` (via `mainChannel.produce(ctx.blocks)` in stdlib). Removing text-service means **someone else has to produce blocks** — channel-service does not produce them today.
2. **Wire-production** — `renderToString` / `renderStatusLine` turn `ITextBlock[]` into a flat string for callers that don't speak channel-packet. R5–R7 migrated platform-browser and the CLI bundle off this path; downstream callers (Zifmia, transcript-tester, story scaffolding, sharpee SDK re-exports, story `run-cli` / `test-runner` scripts) still call them.

Both must be addressed for full removal. They are independent — wire-production removal can ship before block-production removal, or vice versa.

---

## Consumer matrix (current state, 2026-05-09)

### Block-production (`createTextService`, `ITextService.processTurn`, handlers)

| Consumer | File | Call sites | Notes |
|---|---|---:|---|
| `@sharpee/engine` | `src/game-engine.ts` | 4 | Lines 41 (import), 300 (instantiation), 1124 (per-turn call), 1350 + 1690 (additional code paths — quit/restart and meta-command flows) |
| `@sharpee/engine` (test helper) | `src/test-helpers/mock-text-service.ts` | 1 file | Implements `ITextService` for test seams; trivial 48-line no-op-ish mock |
| `@sharpee/text-service` (self) | `src/handlers/audibility.ts` | 1 | Just-added Phase 7a handler — also affected by removal |

**Net consumer of block-production: only `@sharpee/engine`.** No story or downstream package calls `processTurn` directly. The `MockTextService` is purely an internal test fixture and dies with the real one.

### Wire-production (`renderToString`, `renderStatusLine`, `CLIRenderOptions`)

| Consumer | File | Symbols imported | Notes |
|---|---|---|---|
| `@sharpee/interpreter` | `src/components/overlays/ChatOverlay.tsx` | `renderToString` | 2 calls (lines 141, 171) — chat history rendering |
| `@sharpee/interpreter` | `src/context/GameContext.tsx` | `renderToString` | 1 call (line 218) — display block rendering |
| `@sharpee/transcript-tester` | `src/story-loader.ts` | `renderToString` | 1 call (line 115) — test transcript output |
| `@sharpee/bridge` | `src/index.ts` | `ITextService`, `createTextService`, `renderToString`, `renderStatusLine` | Re-export only |
| `@sharpee/runtime` | `src/index.ts` | same set | Re-export only |
| `@sharpee/sharpee` | `src/index.ts` | same set | Re-export to story authors |
| `stories/cloak-of-darkness` | `src/test-runner.ts`, `test-parser-events.js`, `run-platform.js` | `renderToString` | 3 places; also references nonexistent `@sharpee/text-services` (plural — likely stale typo, see Anomalies §) |

### Re-export only (no real coupling)

`bridge`, `runtime`, `sharpee` re-export the wire-production exports for story authors. If those exports go away, the re-exports come out trivially.

### Stale build artifacts (no source coupling)

- `packages/platform-browser/dist-esm/BrowserClient.js` — line 7 imports `renderToString`, but there is **no source import** in `packages/platform-browser/src/`. This is leftover from R5-C and goes away on next build of platform-browser.
- `packages/engine/dist-esm/game-engine.js` and other `dist-esm/` artifacts — reflect current source; will update on rebuild.

---

## What text-service actually does

### Block-production pipeline (the part we'd have to replace)

`TextService.processTurn(events)`:

1. **Filter** (`stages/filter.ts`) — strip `system.*` and `platform.*` events.
2. **Sort** (`stages/sort.ts`) — order events for prose per ADR-094 chain metadata.
3. **Route** (`text-service.ts:routeToHandler`) — switch over event type to a handler:
   - `tryProcessDomainEventMessage` first — any event with `data.messageId` resolves through `languageProvider.getMessage`. **This is how every stdlib action's `action.success` / `action.blocked` / `if.event.*` becomes prose.**
   - Then a switch table dispatches to: `handleGameStarted`, `handleRoomDescription`, `handleRevealed`, `handleHelpDisplayed`, `handleAboutDisplayed`, `handleAudibilityHeard` (just added), `handleImplicitTake`, `handleCommandFailed`, `handleClientQuery`, `handleGameMessage`, falling back to `handleGenericEvent`.
4. **Assemble** (`stages/assemble.ts`) — wrap each handler's output in `ITextBlock` shape with decorations parsed from inline `[[...]]` markers.

This is **not** trivial code. Every action's prose flow goes through it. The audibility handler I just wrote is one of ~13 handlers.

### Wire-production (the part platforms have replaced)

- `renderToString(blocks: ITextBlock[]): string` — flatten blocks to a single string for terminal/text consumers.
- `renderStatusLine(blocks): string` — extract status blocks for one-liner display.
- `CLIRenderOptions` — config shape for those.

These are pure formatters with no state.

---

## What channel-service does today

`ChannelService.build({ world, events, blocks, turn })` returns a `ChannelPacket`. Per-channel `produce(ctx)` closures read from `ctx.events`, `ctx.blocks`, `ctx.world`, etc. Today:

- Most channels read `ctx.events` directly (status, score, info, lifecycle, audibility, media).
- **`mainChannel`** specifically reads `ctx.blocks` and routes blocks whose key is in `MAIN_KEYS` (room name/desc/contents, action result/blocked, error, game message/banner) into the append-mode prose stream.

So `mainChannel` is the bridge that depends on text-service blocks existing. Every other channel could survive text-service removal unchanged.

---

## Removal options

Three viable paths. Each is fully self-contained.

### Option A — Inline handlers into `mainChannel.produce` (smallest change to prose path)

Move the text-service handler logic into `mainChannel.produce(ctx)` as a direct event-consuming closure. Specifically:

1. Move every existing handler (`handleRoomDescription`, `handleRevealed`, `handleGameMessage`, `handleGenericEvent`, `handleAudibilityHeard`, plus the inline `tryProcessDomainEventMessage`/`handleImplicitTake`/`handleCommandFailed`/`handleClientQuery` paths) into a new `packages/stdlib/src/channels/main-prose.ts` module owned by stdlib.
2. `mainChannel.produce` reads `ctx.events`, runs them through filter+sort+route, and emits `TextContent[]` arrays directly — no intermediate `ITextBlock` step.
3. Engine stops constructing/calling `TextService`. The `text:output` event continues to fire, but its blocks come from `mainChannel`'s output (round-tripped through a new helper that wraps `TextContent[]` back into `ITextBlock` for legacy consumers — until they migrate too).
4. Wire-production (`renderToString` etc.) replaced with a thin helper in `@sharpee/channel-service` (or a new `@sharpee/text-render` package) that turns `MainChannelOutput` into a flat string for the downstream consumers above.

**Pros**:
- Channel-service becomes the authoritative prose pipeline; text-service goes away cleanly.
- Each event-consuming concern is now a channel, matching the platform's stated direction.
- Smallest refactor of the routing logic — handlers move, signatures barely change.

**Cons**:
- `mainChannel`'s `produce` becomes a fat closure (or split into a helper module). Single-responsibility purists may object.
- `text:output` legacy event needs a temporary shim to preserve `ITextBlock[]` shape until Zifmia/transcript-tester migrate. Or we cut over hard.
- Chain-metadata sorting (ADR-094) currently lives in text-service; moves with the handlers.

### Option B — Make `mainChannel` produce blocks via a `prose-pipeline` module shared between engine and stdlib (cleaner but larger surface)

Keep handlers as a separate pluggable module — call it `@sharpee/prose-pipeline` (replaces text-service in name and scope) — that channel-service composes. Then:

1. New package `@sharpee/prose-pipeline` (or absorb into `@sharpee/channel-service` as a sub-export) with the handler set.
2. `mainChannel.produce` calls `prose-pipeline.processEvents(ctx.events, languageProvider) → TextContent[][]`.
3. Engine no longer instantiates a separate `TextService`; the language provider is wired into the channel service (or to the channel registry) instead.
4. Wire-production helpers move to the same package, taking `MainChannelOutput` directly.

**Pros**:
- Handlers stay logically separate from channel projection — easy to extend, easy to test.
- Naming matches what text-service actually does after R8 (it's a prose pipeline, not a "text service").
- One clear place to look for "how does an event become prose."

**Cons**:
- New package (or sub-module) — more surface, more wiring.
- Doesn't simplify Zifmia/transcript-tester's wire-production migration; they still need to switch callers.

### Option C — Defer block-production removal; only retire wire-production now

Leave the engine-internal text-service (renamed in place to `prose-pipeline` or absorbed into `@sharpee/text-blocks` to fix the misleading name) and its handler set. Focus this round on:

1. Migrating Zifmia's `ChatOverlay.tsx` and `GameContext.tsx` to consume `channel:packet` directly (read the `main` channel's `TextContent[][]` payload, render that — no `renderToString` call).
2. Migrating `transcript-tester` to read the `main` channel from `channel:packet` for its transcript output.
3. Migrating story scaffolding (`run-cli.js`, `test-runner.ts`, `test-parser-events.js`, `run-platform.js`) — these are CoD/Dungeo per-story files and likely need a 1-pass cleanup pattern.
4. Removing the wire-production exports from `bridge`, `runtime`, `sharpee` (they're re-exports; no real work).

**Pros**:
- Smallest blast radius — finishes the R8-deferred wire-production migration without touching the prose handler architecture.
- Keeps Phase 7a audibility prose handler exactly where it is.
- Preserves the option to do (A) or (B) later from a cleaner starting point.

**Cons**:
- Doesn't fully retire text-service. If your concern is "the package shouldn't exist anymore," this doesn't satisfy it — it just shrinks the package.
- The misleading "text-service" name persists or requires its own rename pass.

---

## Anomalies surfaced during the audit

1. **`@sharpee/text-services` (plural)** referenced in `stories/cloak-of-darkness/run-platform.js` lines 69, 81 — `TextService` and `CLIEventsTextService`. There is no such package in `packages/`. This is either a stale legacy reference that has been broken for a while, or a typo for `@sharpee/text-service` that compiles only because the file is `.js` and not type-checked. Worth flagging in any cleanup pass.
2. **`platform-browser/dist-esm/BrowserClient.js`** still imports `renderToString` despite no source import — stale build artifact from before R5-C. Will rebuild clean.
3. **Engine has 3 separate `processTurn` call sites** (lines 1124, 1350, 1690), not 1. The two extra paths are the meta-command flow and the restart flow. All three need to migrate together for any block-production change.

---

## Recommendation

The right path depends on your goal:

- If the goal is **architectural purity** ("text-service shouldn't exist; everything is channels"): pick **Option A**. Smallest path that genuinely removes text-service. The prose handlers move into `mainChannel`'s closure (or its helper module). One refactor commit per handler family.
- If the goal is **clean naming + future-proof structure**: pick **Option B**. New `prose-pipeline` package, channel-service composes it. More moving parts but the responsibilities are sharper.
- If the goal is **finish the R8-era cleanup that didn't ship**: pick **Option C**. Wire-production migration only; defer block-production for a later session.

I'd recommend **Option A** as the destination and **Option C as a stepping stone if you want to ship pieces incrementally** — first migrate Zifmia/transcript-tester/stories off `renderToString`, then in a separate session move the block-production into `mainChannel`. That orders the work by blast radius and lets the wire-production removal happen without touching the prose pipeline.

Do not start either path inside ADR-172 Phase 7. The audibility prose handler (just added) lives wherever the prose handlers live; if Option A or B happens later, the audibility handler moves with the others — additive cost, not blocking.

---

## What this means for ADR-172 Phase 7a (just-shipped audibility handler)

The audibility handler is in `packages/text-service/src/handlers/audibility.ts`. It is correctly placed by the current architecture (matches `handleRoomDescription` etc.). It will need to move when text-service moves, but it does not block any of the three options above. The 7 unit tests pass; the block flows through `mainChannel` per `MAIN_KEYS`.

If you want to **defer Phase 7a until the text-service decision is made**, I can revert the new files. They are additive and isolated — clean revert.

If you want to **proceed with Phase 7a (and later move it with the other handlers when text-service goes)**, no further code changes are needed for Phase 7a's prose half — just the engine integration test addendum to verify prose actually shows up in the turn output.
