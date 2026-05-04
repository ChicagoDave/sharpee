# Plan: ADR-163 Rewrite — Master Implementation Plan

**Created**: 2026-05-02
**Branch**: main
**ADR**: ADR-163 (rewritten 2026-05-02) + ADR-165 (alignment-updated 2026-05-02)
**Supersedes**: `plan-20260501-adr-163-platform.md`,
`plan-20260502-adr-163-phase-4-platform-browser.md`

---

## Goal

Migrate Sharpee's channel-I/O implementation to the closure-per-channel
architecture defined in the rewritten ADR-163 (2026-05-02 / refined
2026-05-03), plus the consumer-side contract in ADR-165. End state:

- **`@sharpee/if-domain`** owns the channel types — `IOChannel<T>`,
  `IChannelRegistry`, wire packet types (`HelloPacket`, `CmgtPacket`,
  `TurnPacket`, `CommandPacket`), `ChannelContentType`, `ChannelMode`,
  `ChannelEmitPolicy`, `ClientCapabilities`, `ChannelProduceContext`.
  Pure types; no implementation.
- **`@sharpee/channel-service`** exports the `ChannelService` class only.
  Constructor takes an `IChannelRegistry` + `ClientCapabilities`.
  Methods: `buildManifest()` produces `CmgtPacket` (capability-filtered);
  `build(ctx)` produces `TurnPacket` (walks registry, calls each
  channel's `produce` closure, applies mode + emit policy).
- **`@sharpee/stdlib`** owns the channel registry instance — populated
  at module init with the standard `IOChannel`s (main, prompt, location,
  score, turn, info, ifid, death, endgame, score_notify, plus media).
  Each standard channel is co-located with the stdlib subsystem that
  owns its data source.
- **`@sharpee/engine`** has-a `ChannelService` (standard composition).
  `engine.start({ capabilities })` invokes `Story.registerChannels?(registry)`,
  instantiates `new ChannelService(registry, capabilities)`, emits
  `channel:manifest`. Per turn after `textService.processTurn`, calls
  `channelService.build({world, events, blocks, turn})` and emits
  `channel:packet`.
- The CLI bundle and `@sharpee/platform-browser` consume
  `channel:packet` events through ADR-165 `Renderer` instances. Default
  `ChannelRenderer` implementations ship with each consumer package.
- AC-13 (CLI), AC-14 (browser real-path), AC-15 (story-renderer parity),
  AC-16 (ADR-101 emission cleanup) all pass.
- `@sharpee/text-service` retains its block-production role (engine
  calls `processTurn`); its wire-producing role (`renderToString`,
  `renderStatusLine`) stays for Zifmia and downstream consumers but
  is deprecated for first-party platform consumers.

---

## State at plan-creation time

**ADR work** (done):
- ADR-163 rewritten whole-cloth on 2026-05-02. 17 numbered decisions.
  Closure-per-channel; standard vocabulary in stdlib; engine hosts
  evaluation.
- ADR-165 references aligned to new ADR-163 section numbering.

**Existing implementation that survives** (Phase 1/2/3 of the old plan):
- `packages/channel-service/` package scaffold (workspace registration,
  build wiring, `.d.ts` exports). Wire packet types
  (`HelloPacket`, `CmgtPacket`, `TurnPacket`, `CommandPacket`).
  Capability filter machinery in `produceCmgtManifest`.
- `packages/channel-service/src/wire/` and `decoder` — wire-protocol
  module survives unchanged.
- `stories/channel-service-test/` test fixture with scenarios.
- AC-13's real-path CLI bundle test exists in concept (existing test
  proves the production bundle path; needs adaptation to the new
  consumer model).
- `bundle-entry.js` Phase 3 wiring stays partially — channel-service
  bootstrap moves into the engine, but the consumer-side handoff to
  the renderer is new.

**Existing implementation that does NOT survive** (gets removed/replaced):
- `ChannelRule`, `ChannelRuleWhen`, `ChannelRuleEmit`,
  `ChannelRuleExtract`, `ChannelRuleInput`, `ChannelRuleChannelResolver`
  types (all of `packages/channel-service/src/types.ts` rule schema).
- `addRule`, `addRules` registry functions.
- `produce-turn.ts`'s rule-matching machinery (matches/applyExtract/
  contributions/applyMatchingRules etc.). The producer loop survives;
  its insides change.
- `packages/channel-service/src/standard-channels.ts`,
  `platform-rules.ts`, `media-channels.ts`, `media-rules.ts` — these
  move to stdlib.
- All Phase 1/2 tests that exercise rule predicates / extract
  strategies / rule-conflict resolution.

**No consumer migration has shipped under the new model.** Phase 3's
CLI bundle work calls `produceTurnPacket` directly (rule-based);
under the new model the engine calls it. That code path needs replacement.

---

## Phase Dependencies

```
ADR rewrite (done)
  └── Phase R1: channel-service redesign
        └── Phase R2: stdlib channel vocabulary
              └── Phase R3: engine integration + Story.registerChannels
                    ├── Phase R4: ADR-165 renderer scaffolding
                    │     └── Phase R5: platform-browser default renderers + migration (AC-14)
                    └── Phase R6: CLI bundle migration (AC-13 refresh)
                          └── Phase R7: story-renderer parity (AC-15)
                                └── Phase R8: ADR-101 cleanup + text-service disposition (AC-16)
```

R1 → R2 → R3 is strict. R4 can run in parallel with R3 once the
`Renderer` interface is stable, but in practice we'll sequence
R3 → R4 to avoid contention. R5 and R6 both depend on R3 + R4 and can
parallelize. R7 depends on R5 + R6 (needs both consumer surfaces). R8
is the final cleanup.

---

## Phases

---

### Phase R1: types to if-domain + channel-service becomes the ChannelService class

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Move channel types out of channel-service into
  if-domain. Replace the rule-based machinery with a `ChannelService`
  class whose constructor takes a registry + capabilities and whose
  `build(ctx)` walks the registry calling each `IOChannel.produce`
  closure. Remove standard / platform / media channel definitions
  (they move to stdlib in R2).
- **Entry state**: `@sharpee/channel-service` exists with the rule-based
  model (Phases 1/2/3 of the original plan landed). Wire types and
  decoder are stable but currently live in channel-service.
- **Deliverable**:
  - **Add to `@sharpee/if-domain`** (new module — likely
    `packages/if-domain/src/channels/`):
    - `IOChannel<T>` interface (id, contentType, mode, emit, gatedBy?,
      produce closure signature).
    - `IChannelRegistry` interface (`add`, `get`, `all`).
    - `ChannelContentType`, `ChannelMode`, `ChannelEmitPolicy`,
      `CapabilityFlag`, `ClientCapabilities`, `ChannelProduceContext`.
    - Wire packet types: `HelloPacket`, `CmgtPacket`, `TurnPacket`,
      `CommandPacket`.
  - **Rewrite `@sharpee/channel-service`**:
    - `packages/channel-service/src/channel-service.ts` — new
      `ChannelService` class. Constructor `(registry, capabilities)`.
      Methods `buildManifest()`, `build({world, events, blocks, turn})`.
      Internal state: per-channel prevValue map, registry snapshot,
      capability cache.
    - `packages/channel-service/src/index.ts` — exports
      `ChannelService` plus re-exports of if-domain types for caller
      convenience.
    - `packages/channel-service/src/wire/decoder.ts` — survives;
      decoder ships here for clients receiving packets.
    - `packages/channel-service/src/utils/flatten.ts` — `flattenContent`
      helper survives (small TextContent utility; useful to consumers).
    - **Delete**: `standard-channels.ts`, `platform-rules.ts`,
      `media-channels.ts`, `media-rules.ts`, `produce-turn.ts`,
      `produce-cmgt.ts`, `registry.ts` (the registry primitives —
      stdlib provides the instance now), `types.ts` (rule schema).
  - **Delete or rewrite** Phase 1/2 tests that exercise the rule
    machinery. Keep tests that exercise wire types (now imported from
    if-domain), capability filtering, prev-value diffing, mode
    semantics. Refactor against the `ChannelService` class.
  - The `channel-service-test` story's scenarios stay; tests using
    them are rewritten to construct `IOChannel` objects and feed them
    via a registry to a `ChannelService` instance.
- **Exit state**: `@sharpee/if-domain` exports the channel types.
  `@sharpee/channel-service` exports `ChannelService` class and the
  decoder. Tests pass. No standard channels in either package; no
  rule schema anywhere.
- **AC coverage**: AC-1, AC-2, AC-4, AC-5, AC-9, AC-11 (subset). AC-3,
  AC-6, AC-7, AC-8, AC-10, AC-12 land partially in R1 (the
  `ChannelService` runtime is correct; the standard channels they
  reference register in R2).
- **Integration-reality boundary**: Unit tests against if-domain types
  + ChannelService class in isolation. Build registry by hand for tests.
  No real-path tests in this phase.
- **Cross-package**: `packages/channel-service/` (rewrite),
  `packages/if-domain/` (new types module). Workspace config:
  `if-domain` may need to add an export entry for the channels module.
- **Prerequisite**: ADR-163 rewrite + 2026-05-03 refinement (done).
- **Status**: DONE (2026-05-03)

---

### Phase R2: stdlib channel registry instance + standard IOChannels

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Stdlib owns the channel registry instance and the
  standard `IOChannel` definitions. Each standard channel is an
  `IOChannel` co-located with its data source (score channel near
  scoring capability, location channel near looking action, etc.).
  Registry is populated at module init.
- **Entry state**: Phase R1 complete. `IOChannel` and `IChannelRegistry`
  types live in if-domain. `ChannelService` class lives in
  channel-service. No standard channel definitions exist anywhere.
- **Deliverable**:
  - `packages/stdlib/src/channels/` — new module.
    - `registry.ts` — `StdlibChannelRegistry` class implementing
      `IChannelRegistry` from if-domain. Exports a singleton
      `channelRegistry` instance.
    - `standard.ts` — exports the 10 standard `IOChannel` instances:
      `mainChannel`, `promptChannel`, `locationChannel`, `scoreChannel`,
      `turnChannel`, `infoChannel`, `ifidChannel`, `deathChannel`,
      `endgameChannel`, `scoreNotifyChannel`. Each is co-located with
      or near its data source where natural.
    - `media.ts` — exports media `IOChannel` instances: `image:*`,
      `sound`, `music`, `animation`, `animate`, `transition`, `layout`,
      `clear`. Includes a helper `createAmbientChannel(id)` for
      dynamic ambient channels.
    - `keys.ts` — `MAIN_KEYS` / `MEDIA_KEYS` block-key sets that the
      `mainChannel` closure filters against.
    - `index.ts` — re-exports `channelRegistry` and the standard
      channel constants for inspection. Also re-exports the
      `IChannelRegistry` type from if-domain for author convenience.
    - Module-init code adds all standard channels to the registry:
      ```ts
      for (const ch of [mainChannel, promptChannel, …, ...mediaChannels]) {
        channelRegistry.add(ch);
      }
      ```
  - `packages/stdlib/package.json` — add `@sharpee/if-domain` to
    dependencies if not already present (it should be — stdlib uses
    if-domain types broadly).
  - `packages/stdlib/src/index.ts` — re-exports `channelRegistry` and
    the standard channel constants.
  - Block keys (`status.score`, `status.turns`, `status.room`) are
    no longer used as routing keys. The score/turn/location closures
    read directly from world capabilities, ctx.turn, world location
    queries. The block keys themselves stay defined in
    `@sharpee/text-blocks` for any text-service consumer that still
    emits them, but stdlib's channel closures do not depend on them.
  - Tests in `packages/stdlib/tests/channels/` — for each `IOChannel`,
    invoke its `produce` with a mocked context and assert the return
    value. Plus a registry test asserting all standards are present
    after module init.
- **Exit state**: stdlib compiles. `channelRegistry` exported with all
  10 standard channels + media channels pre-registered. Tests pass.
- **AC coverage**: AC-3, AC-6 (channels exist; integration in R3+).
- **Integration-reality boundary**: Unit tests with mocked world /
  events / blocks. No real engine, no real story.
- **Cross-package**: `packages/stdlib/` (primary; new module).
  `packages/if-domain/` (consumed for types; no changes).
  `packages/channel-service/` (NOT a stdlib dep — stdlib doesn't need
  the `ChannelService` class).
- **Prerequisite**: Phase R1 complete.
- **Status**: DONE (2026-05-03)

---

### Phase R3: engine has-a ChannelService + Story.registerChannels hook

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Engine composes a `ChannelService` instance —
  standard OO has-a relationship. `engine.start({capabilities})`
  invokes `Story.registerChannels?(registry)`, instantiates
  `new ChannelService(registry, capabilities)`, emits
  `channel:manifest`. Per turn after `textService.processTurn`,
  calls `channelService.build(ctx)` and emits `channel:packet`.
  Story interface gains `registerChannels?(registry)` hook.
- **Entry state**: Phase R2 complete. stdlib exports `channelRegistry`
  populated with standard `IOChannel`s. `ChannelService` class lives
  in channel-service. Engine uses text-service for block production
  (unchanged).
- **Deliverable**:
  - `packages/engine/src/game-engine.ts`:
    - `start()` accepts `{ capabilities: ClientCapabilities }` (in
      options or as parameter; design choice in R3 — likely as part
      of the existing options object).
    - In `start()`: invoke `this.story.registerChannels?.(channelRegistry)`
      (channelRegistry imported from stdlib). Then
      `this.channelService = new ChannelService(channelRegistry, capabilities)`.
      Emit `channel:manifest` from `channelService.buildManifest()`.
    - In the turn loop (after `textService.processTurn(events)`
      produces blocks): build `ctx = { world, events, blocks, turn }`,
      call `channelService.build(ctx)`, emit `channel:packet`. The
      legacy `text:output` event continues to fire for backward
      compatibility during consumer migration; removed in R8.
    - New `channel:manifest` and `channel:packet` events on the
      engine event-emitter type.
    - For multi-user: `engine.start()` is called when the client's
      `hello` arrives, supplying capabilities. Single-user
      consumers call it directly.
  - `packages/engine/src/story.ts` (or wherever the `Story` type
    lives) — `registerChannels?: (registry: IChannelRegistry) => void`
    optional method on the `Story` interface. Type imported from
    if-domain.
  - `packages/engine/package.json` — add `@sharpee/channel-service`
    as a dependency (engine imports `ChannelService` class). stdlib
    is already a dep.
  - Engine tests covering the bootstrap (registry → ChannelService
    → manifest emission) and per-turn (build → packet emission).
- **Exit state**: Engine compiles. A simple integration test
  (driving the engine through one turn with a fake story and
  capabilities) asserts the events fire with the expected shapes.
- **AC coverage**: AC-3 (round-trip), AC-11 (bootstrap order),
  AC-12 (re-emission identity — captured-replay test against the
  engine).
- **Integration-reality boundary**: Engine + stdlib + channel-service
  together, in-process. No CLI bundle, no browser bundle. The
  engine-driven path is the production code path; integration tests
  exercise it directly.
- **Cross-package**: `packages/engine/` (primary), `packages/stdlib/`
  (imported for `channelRegistry`), `packages/channel-service/`
  (imported for `ChannelService`), `packages/if-domain/` (imported
  for types).
- **Platform-change flag**: Modifies `packages/engine/`. Per CLAUDE.md
  major directions, discuss with user before implementation.
- **Prerequisite**: Phase R2 complete.
- **Status**: DONE (2026-05-03)

---

### Phase R4: ADR-165 renderer scaffolding

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Implement ADR-165's `ChannelRenderer` and
  `Renderer` interfaces. Build the dispatch loop, state store,
  slot system, and JSON-tree fallback. This is consumer-side
  infrastructure; concrete renderers come in R5 and R6.
- **Entry state**: Phase R3 complete. Engine emits
  `channel:manifest` and `channel:packet` events. ADR-165 §1–§7 are
  the spec.
- **Deliverable**:
  - Decision: where does this code live?
    - **Option A**: extend `@sharpee/channel-service` with the renderer
      contract (despite ADR-163 §14 saying channel-service is "pure
      machinery"). The renderer is consumer-side and depends only on
      the wire types — no rule schema, no domain knowledge — so it's
      a defensible inhabitant.
    - **Option B**: new package `@sharpee/renderer` (or
      `@sharpee/channel-renderer`).
    - Recommend Option A (one less package; renderer code is small).
      Decision finalized in R4.
  - `ChannelRenderer` interface (per ADR-165 §1).
  - `Renderer` class implementing `applyCmgt`, `applyTurnPacket`,
    `onCommand`, `emitCommand`, `getStateSnapshot` per ADR-165 §2.
  - `registerRenderer(channelId, renderer)` last-write-wins.
  - Channel state store internal to the Renderer (per ADR-165 §5).
  - Slot system: `registerSlot(name, handle)`, `getSlot(name)`.
  - JSON-tree fallback for unrendered channels (one-time warning).
  - Manifest-order dispatch (per ADR-165 §4).
  - Synchronous dispatch contract (per ADR-165 §4).
  - Tests covering ADR-165 AC-1 through AC-9 (renderer contract).
- **Exit state**: Renderer infrastructure compiles. AC-1 through AC-9
  of ADR-165 pass. The renderer can be instantiated, fed manufactured
  CMGT and turn packets, and produce side-effects in mock channel
  renderers.
- **AC coverage**: ADR-165 AC-1 through AC-9.
- **Integration-reality boundary**: Unit tests against mock
  ChannelRenderers. No DOM, no engine, no transport.
- **Cross-package**: `packages/channel-service/` (if Option A) OR
  new package (Option B).
- **Prerequisite**: Phase R3 complete (so the wire shapes the renderer
  consumes are stable).
- **Status**: DONE (2026-05-03)

---

### Phase R5: platform-browser default renderers + migration (AC-14 gate)

- **Tier**: Medium-Large
- **Budget**: ~300 tool calls
- **Domain focus**: Implement DOM-based default `ChannelRenderer`
  implementations for every standard channel that the browser honors.
  Build the default browser layout with named slots. Migrate
  `BrowserClient` to instantiate a `Renderer`, register defaults,
  feed it engine events, and route commands back to the engine. AC-14
  real-path test (Playwright headless Chromium per Phase 4A audit
  decision).
- **Entry state**: Phase R3 complete (engine emits packets) and
  Phase R4 complete (Renderer scaffolding exists). `BrowserClient.ts`
  is at its pre-migration state (uses `text-service.renderToString`).
- **Deliverable**:
  - `packages/platform-browser/src/renderers/` — new directory.
    - `main.ts` — append-mode `<p>` renderer for the `main` slot.
    - `prompt.ts` — sets the input field's placeholder.
    - `status.ts` — combined renderer for `location`, `score`, `turn`
      writing to status slot.
    - `info.ts` — sets `document.title`.
    - `notify.ts` — toast/modal renderer for `death`, `endgame`,
      `score_notify`.
    - `media.ts` — `image:*` renderer with z-ordered DOM stacking;
      `sound` / `music` / `ambient:*` via Web Audio (folding
      `AudioManager` into the `sound`/`music` channel renderers);
      `animation` / `animate` / `transition` renderers.
    - `clear.ts` — `onClear` hook handling for append-mode
      truncation.
    - `index.ts` — `registerDefaultBrowserRenderers(renderer)` helper.
  - `packages/platform-browser/src/layout/default-layout.ts` —
    constructs the default layout DOM, registers slots
    (`status`, `main`, `sidebar`, `input`, `media`, `notify`, `meta`)
    per ADR-165 §7.
  - `BrowserClient.ts` rewrite:
    - Constructor accepts `clientCapabilities` (defaults to
      `BROWSER_CAPABILITIES` constant).
    - `connectEngine`: `engine.setClientCapabilities(this.config.capabilities)`,
      `engine.setChannelService(channelService)`, instantiate `Renderer`,
      mount default layout, register default `ChannelRenderer`s.
    - `engine.on('channel:manifest', (cmgt) => renderer.applyCmgt(cmgt))`.
    - `engine.on('channel:packet', (packet) => renderer.applyTurnPacket(packet))`.
    - `renderer.onCommand((cmd) => this.engine.executeTurn(cmd.text))`.
    - `text-service` import removed.
    - Existing event-listener side-effects (audio events, beep on
      failures, save/restore reactions) stay — they're not
      channel-driven; they're real-time engine signals.
  - `packages/platform-browser/package.json` — add
    `@sharpee/channel-service` peer dep, remove `@sharpee/text-service`
    peer dep.
  - `build.sh` — `--alias:@sharpee/channel-service=...` added to the
    `build_browser_client()` esbuild invocation.
  - `packages/platform-browser/src/index.ts` — export
    `registerDefaultBrowserRenderers`, the default layout helpers, and
    the channel renderer types so authors can extend.
  - **AC-14 real-path test** at
    `packages/channel-service/tests/ac-14-browser-real-path.test.ts`
    using Playwright headless Chromium per the audit decision. Drives
    `dist/web/dungeo/index.html` end-to-end; asserts transcript text
    content matches the CLI's main-channel output for the same command
    sequence.
  - Dungeo walkthrough chain regression baseline (per "any of N"
    convention).
- **Exit state**: AC-14 GREEN. Browser bundle plays Dungeo. Default
  layout renders status / main / input slots correctly.
  `BrowserClient` does not import `text-service`. Dungeo walkthrough
  chain unbroken.
- **AC coverage**: AC-14 (real-path), ADR-165 AC-11 (browser renderer
  parity).
- **Integration-reality boundary**: AC-14 is real-path against
  `dist/web/dungeo/game.js` driven by Playwright — the browser
  bundle is the OWNED dependency under test (rule 12a).
- **Cross-package**: `packages/platform-browser/` (primary, large
  rewrite), `packages/engine/` (consumed via new APIs), `build.sh`.
- **Platform-change flag**: Modifies `packages/platform-browser/`,
  `build.sh`. Discuss with user before implementation.
- **Prerequisite**: Phase R3 (engine integration) AND Phase R4
  (renderer scaffolding) complete.
- **Status**: DONE (2026-05-03)

---

### Phase R6: CLI bundle migration (AC-13 refresh)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Migrate the CLI bundle (`scripts/bundle-entry.js`)
  from direct `produceTurnPacket` calls (the Phase 3 pattern) to
  consuming `channel:packet` events through a CLI-flavored `Renderer`
  with terminal-output `ChannelRenderer`s.
- **Entry state**: Phase R3 (engine integration) and Phase R4
  (renderer scaffolding) complete. CLI bundle currently uses Phase 3's
  consumer-driven `produceTurnPacket` pattern (which is now wrong).
- **Deliverable**:
  - CLI-side default `ChannelRenderer`s — terminal-flavored:
    - `main` → stdout writes
    - `prompt` → updates the readline prompt string
    - `location` / `score` / `turn` → stdout updates (or status-line
      area in `--play` mode)
    - `info` / `ifid` → no-op or debug-print
    - `death` / `endgame` / `score_notify` → stdout transient lines
    - media channels → no-op (CLI capabilities already declare
      `images: false`, `sound: false`, etc., so manifest filtering
      drops them; renderers don't need to exist).
  - `scripts/bundle-entry.js` rewrite:
    - Pass `CLI_CAPABILITIES` to the engine via
      `engine.setClientCapabilities`.
    - Instantiate a CLI-flavored `Renderer`.
    - Subscribe to `channel:manifest` and `channel:packet` events.
    - The existing `eventBuffer` / `outputBuffer` accumulator pattern
      goes away — the renderer's state store and its main-channel
      renderer handle accumulation.
    - Test execution: `executeCommand(input)` returns the renderer's
      buffered output for the turn (which the renderer's main-channel
      ChannelRenderer accumulates into a per-turn capture).
  - `bundle-entry.js` continues to re-export everything for library
    consumers; the CLI execution path is what changes.
  - **AC-13 refresh** — existing AC-13 test stays. Updates internals
    if needed to match the new flow but the assertions hold (it's
    asserting on stdout content from a Dungeo transcript, which is
    consumer-flow-agnostic).
  - Dungeo walkthrough chain passes (per "any of N" convention).
- **Exit state**: AC-13 GREEN. CLI plays Dungeo correctly. Bundle does
  not call `produceTurnPacket` directly.
- **AC coverage**: AC-13 refresh, ADR-165 AC-10 (CLI renderer parity).
- **Integration-reality boundary**: AC-13 is real-path against
  `dist/cli/sharpee.js` (already established in Phase 3). The
  internal flow changes; the test point of view is unchanged.
- **Cross-package**: `scripts/bundle-entry.js`, `build.sh`,
  `packages/channel-service/` (or wherever Renderer lives).
- **Prerequisite**: Phase R3 + R4 complete. Can run in parallel with
  R5 if separate sessions; not interdependent.
- **Status**: DONE (2026-05-03)

---

### Phase R7: story-renderer parity (AC-15)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Extend `stories/channel-service-test/` with a
  playable mode that registers a custom JSON channel
  (`debug-stats` or similar) with a custom `ChannelRenderer`. Drive
  the same story sequence through the CLI bundle and the browser
  bundle; assert packet equivalence and renderer-output equivalence.
- **Entry state**: Phases R5 and R6 complete. Both consumer surfaces
  on the new architecture.
- **Deliverable**:
  - `stories/channel-service-test/src/playable-story.ts` — minimal
    playable Sharpee story (one room, player, one item, one custom
    verb `stat`).
  - `stories/channel-service-test/src/channels.ts` — custom channel
    registration via `Story.registerChannels?(api)` hook. The
    `debug-stats` channel's `produce` closure reads world state on
    `stat` invocation.
  - `stories/channel-service-test/src/renderer.ts` — story-supplied
    `ChannelRenderer` for `debug-stats`. Pure DOM/text function;
    importable by both CLI test harness and browser test.
  - `stories/channel-service-test/walkthroughs/wt-stat.transcript` —
    deterministic command sequence exercising the custom channel
    plus a sparse-emit edge case (re-issuing `stat` with unchanged
    state should suppress emission).
  - **AC-15 test** at
    `packages/channel-service/tests/ac-15-story-renderer-parity.test.ts`:
    runs the test story through the CLI bundle and the browser bundle
    (Playwright); captures the `debug-stats` channel's payload and
    rendered output from both; asserts:
    - Identical packet payload (wire equivalence).
    - Identical renderer output (renderer-parity).
  - All existing transcript tests still pass.
- **Exit state**: AC-15 GREEN. Story-supplied custom channel +
  renderer round-trips identically across CLI and browser.
- **AC coverage**: AC-15, ADR-165 AC-12 (story-renderer override —
  Alderman-shaped, scaled-down version).
- **Integration-reality boundary**: Real-path against both production
  bundles.
- **Cross-package**: `stories/channel-service-test/` (extended),
  `packages/channel-service/` (test added).
- **Prerequisite**: Phase R5 + R6 complete.
- **Status**: DONE (2026-05-03)

---

### Phase R8: ADR-101 cleanup + text-service final disposition (AC-16)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Confirm AC-16 grep gate (no ADR-101 emission paths
  outside stdlib's channel closures); update text-service header to
  reflect post-rewrite state; resolve legacy platforms; document the
  block-key sets that survive in stdlib.
- **Entry state**: Phases R5, R6, R7 complete. All first-party
  consumer surfaces on the new architecture.
- **Deliverable**:
  - **AC-16 grep gate**:
    ```
    grep -rn 'media\.image\.show\|media\.sound\.play\|media\.music\|...' \
      packages/ --include='*.ts' \
      | grep -v 'packages/stdlib/src/channels/' \
      | grep -v 'packages/channel-service/tests/' \
      | grep -v 'stories/channel-service-test/'
    ```
    Result must be empty. Document and remove any unexpected matches.
  - **text-service disposition** at
    `docs/work/channel-io-unification/text-service-disposition-20260502.md`:
    - List every export from `packages/text-service/src/index.ts`.
    - For each: which packages import it, which roles use it.
    - Block-production role (`processTurn`, `createTextService`,
      `TextService`, the pipeline stages and handlers): KEEP.
    - Wire-production role (`renderToString`, `renderStatusLine`):
      retained for Zifmia + downstream story templates; deprecated
      for first-party platform consumers (which all migrated).
  - `packages/text-service/src/index.ts` header updated to reflect
    post-rewrite reality (block-production permanent; wire-production
    retained for downstream consumers).
  - **Legacy platforms** (`packages/platforms/cli-en-us/`,
    `packages/platforms/browser-en-us/`): both confirmed dead paths.
    Decision required (delete / archive / retain with header).
    Execute the chosen disposition.
  - `packages/sharpee/docs/genai-api/` regenerated if any public
    API surface changed (engine API additions in R3).
  - Final Dungeo walkthrough chain regression run.
- **Exit state**: AC-16 GREEN. text-service fate documented and
  executed. Legacy platforms resolved. Walkthrough chain passes.
  Phase 4 sequence complete.
- **AC coverage**: AC-16.
- **Integration-reality boundary**: AC-16 is a static grep gate; the
  walkthrough chain (per "any of N" convention) is the runtime
  regression gate.
- **Cross-package**: `packages/text-service/` (header + possibly
  retired files), `packages/platforms/cli-en-us/` and
  `browser-en-us/` (resolution), `packages/sharpee/` (re-exports + API
  doc regen if needed), `build.sh` (if files removed), workspace config.
- **Platform-change flag**: Potentially deletes
  `packages/platforms/*`. User reviews disposition decision before
  deletion.
- **Prerequisite**: Phase R7 complete.
- **Status**: CURRENT

---

## Test-Story Isolation Summary

| Phase | Story touched | Why |
|-------|--------------|-----|
| R1 | None | channel-service-only |
| R2 | None | stdlib-only |
| R3 | None | engine-only (uses fake story for tests) |
| R4 | None | renderer-only |
| R5 | Dungeo (regression baseline, read-only) | Walkthrough chain gate |
| R6 | Dungeo (regression baseline, read-only) | AC-13 refresh |
| R7 | `stories/channel-service-test/` (extended) | AC-15 fixture |
| R8 | None | Cleanup |

Dungeo is never modified as a fixture in any phase.

---

## Integration-Reality Boundary Summary

| AC | Phase | Test type | Artifact under test |
|----|-------|-----------|---------------------|
| AC-1, AC-2, AC-4, AC-5, AC-9, AC-11 | R1 | Unit | channel-service in isolation |
| AC-3, AC-6 | R2 | Unit | stdlib channels with mocked context |
| AC-12 | R3 | Integration | engine + stdlib + channel-service in-process |
| ADR-165 AC-1–AC-9 | R4 | Unit | Renderer in isolation with mock ChannelRenderers |
| AC-14, ADR-165 AC-11 | R5 | **Real-path** | `dist/web/dungeo/game.js` via Playwright |
| AC-13 (refresh), ADR-165 AC-10 | R6 | **Real-path** | `dist/cli/sharpee.js` |
| AC-15, ADR-165 AC-12 | R7 | **Real-path** | both bundles |
| AC-16 | R8 | Static + Real-path | grep + Dungeo walkthrough chain |

---

## Constraints (Carried Forward)

- **No backwards compatibility** (memory: `feedback_no_backcompat_server_lifecycle`).
- **Test-story isolation** — Dungeo never modified as fixture.
- **Platform changes require discussion first** — flagged on R3, R5, R8.
- **Real-path tests required** (rule 12a) on phases named for an integration.
- **One step at a time** — never queue multi-phase work without
  explicit user approval.
- **Never auto-build / auto-test** — always confirm before running
  `./build.sh` or test invocations.

---

## Open Questions for User

Resolved 2026-05-03:

1. ✅ **Type home**: `@sharpee/if-domain` owns the channel types
   (`IOChannel`, `IChannelRegistry`, wire packets, etc.).
2. ✅ **channel-service shape**: exports the `ChannelService` class
   only.
3. ✅ **Registry home**: `@sharpee/stdlib` owns the registry instance
   plus the standard `IOChannel` definitions.
4. ✅ **Engine integration**: composition (has-a). Engine instantiates
   `new ChannelService(channelRegistry, capabilities)` in `start()`.
5. ✅ **Renderer location** (§R4): extends channel-service (Option A).

Less urgent (can be answered later):

6. **Does the `text:output` event survive R8?** Phase 5+ if/when zifmia
   migrates, the event becomes redundant. Phase 4 keeps it for
   compatibility during migration; final removal is post-Phase-4.
7. **Block-key sets for stdlib's `main` channel closure** — exact set
   of keys that route to `main` (the existing `MAIN_KEYS` set in
   `platform-rules.ts` migrates to stdlib's `channels/keys.ts` in R2).

---

## Status

- **Status**: IN PROGRESS — Phase R8 is CURRENT (R1–R7 DONE as of 2026-05-03)
- **Prerequisites met**: ADR rewrite complete (2026-05-02 + 2026-05-03
  refinement). Architecture diagram aligned. Open questions on package
  shape resolved. R1–R7 delivered; AC-13, AC-14, AC-15 GREEN.
- **Commit**: Local commits across session; push deferred (token expired)
