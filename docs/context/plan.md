# Session Plan: packages/bridge — Native Engine Bridge Protocol (ADR-135)

**Created**: 2026-03-20
**Overall scope**: Create a new `packages/bridge/` package (`@sharpee/bridge`) that implements the ADR-135 native engine bridge protocol. The bridge runs as a Node.js subprocess, reads newline-delimited JSON from stdin, drives the Sharpee engine, and writes newline-delimited JSON to stdout. Builds to a standalone `node_bridge.js` via esbuild for native host apps (Lantern, Zifmia desktop).
**Bounded contexts touched**: N/A — infrastructure/tooling; no domain model changes
**Key domain language**: N/A — this is a platform packaging and bridge concern

---

## Reference: Existing runtime package

`packages/runtime/` is the browser PostMessage equivalent. Use it as the structural template:
- `src/protocol.ts` — typed message unions (runtime uses `sharpee:` prefix; bridge uses plain `method`/`type` fields per ADR-135)
- `src/bridge.ts` — `SharpeeRuntimeBridge` class (bridge equivalent will be `NativeEngineBridge`)
- `src/runtime-entry.ts` — browser IIFE entry; bridge equivalent will be a plain Node.js `main()` entry
- `src/index.ts` — re-exports (bridge will need the same engine API re-exports for the `storyPath` authoring mode)

`.sharpee` bundle loading: The browser runner uses `fflate` to unzip, reads `meta.json` + `story.js`. Node.js bridge can use the built-in `fs` + `node:zlib` / `adm-zip` or `fflate` (Node target) to do the same. The story code in a `.sharpee` bundle is browser ESM with `@sharpee/*` as externals — in the Node bridge context, we use Node's `vm.runInNewContext` or `new Function` to evaluate it against the bundled engine.

---

## Phases

### Phase 1: Package Scaffold and Protocol Types
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — infrastructure
- **Entry state**: `packages/runtime/` exists and is the reference; `packages/bridge/` does not exist
- **Deliverable**:
  - `packages/bridge/package.json` — `@sharpee/bridge`, same engine workspace deps as `@sharpee/runtime`, plus `fflate` for zip reading; Node.js target
  - `packages/bridge/tsconfig.json` — extends `../../tsconfig.base.json`; same project references as runtime; no `lib: ["dom"]` (Node only)
  - `packages/bridge/src/protocol.ts` — fully typed ADR-135 message unions:
    - Inbound: `StartMessage` (with `bundle?: string`, `storyPath?: string`), `CommandMessage`, `SaveMessage`, `RestoreMessage`, `QuitMessage`
    - Outbound: `ReadyMessage` (with `version: string`), `BlocksMessage` (with `blocks: ITextBlock[]`), `EventsMessage` (with `events: DomainEvent[]`), `StatusMessage` (with `location: string`, `turn: number`), `ErrorMessage`, `ByeMessage`
    - `DomainEvent` interface (`type: string`, `data: object`)
    - Type guards for inbound/outbound
    - `BRIDGE_PROTOCOL_VERSION` constant
  - `packages/bridge/src/index.ts` — re-exports of protocol types and engine API surface (same shape as `packages/runtime/src/index.ts` minus browser-only exports)
  - No bridge logic yet; no build integration yet
- **Exit state**: Package directory exists; `tsc --noEmit` passes; protocol types cover the full ADR-135 message set
- **Status**: DONE

### Phase 2: NativeEngineBridge Class
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — infrastructure bridge
- **Entry state**: Phase 1 complete; `protocol.ts` and `index.ts` exist; package compiles
- **Deliverable**:
  - `packages/bridge/src/bridge.ts` — `NativeEngineBridge` class:
    - **I/O**: reads newline-delimited JSON from a `Readable` (stdin), writes newline-delimited JSON to a `Writable` (stdout); uses Node.js `readline` interface
    - **Command queue**: internal async queue enforces sequential command processing; next command dequeued only after `status` (or `error`) is sent for the current command
    - **Message dispatch**: `start`, `command`, `save`, `restore`, `quit`
    - **`start` handler**:
      - If `bundle` field present: unzip `.sharpee` file (using `fflate` Node target), extract `story.js`, use `vm.runInNewContext` or `new Function` to execute it with the bundled engine API in scope, obtain a `Story` object
      - If `storyPath` field present: invoke esbuild programmatically to compile the `.ts` file to an in-memory JS string (esbuild API, not CLI subprocess), then execute via `new Function`
      - Bootstrap engine: `WorldModel`, `EnglishParser`, `EnglishLanguageProvider`, `PerceptionService`, `GameEngine`
      - Wire `engine.on('text:output', ...)` → send `blocks` message
      - Wire `engine.on('event', ...)` → filter to `if.event.*` and `platform.*` → batch into `events` message (sent after blocks, before status)
      - Send `ready` message after bootstrap, before `start` handler runs the opening turn
      - Run opening turn after sending `ready`; send `status` when done
    - **`command` handler**: `engine.executeTurn(text)` → send `blocks` + `events` + `status`
    - **`save` handler**: `engine.save()` triggers save hook → save hook emits `platform.save_completed` event (flows through event channel, no bespoke outbound message)
    - **`restore` handler**: install temporary restore hook returning parsed save data, call `engine.restore()`
    - **`quit` handler**: send `bye`, flush stdout, exit process
    - **Error handling**: uncaught errors send `error` message; process does not exit on command errors
  - `packages/bridge/src/bridge-entry.ts` — Node.js `main()` entry point:
    - Creates `NativeEngineBridge` with `process.stdin` and `process.stdout`
    - Calls `bridge.listen()`
    - Handles `SIGTERM`/`SIGINT` by sending `bye` and exiting cleanly
- **Exit state**: Bridge compiles; manual test (pipe JSON via stdin) demonstrates full round-trip: `start` → `ready` + `blocks` + `events` + `status`; `command "north"` → `blocks` + `events` + `status`; `quit` → `bye`
- **Status**: DONE

### Phase 3: Build Integration
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — infrastructure
- **Entry state**: Phase 2 complete; bridge entry point compiles and passes manual test
- **Deliverable**:
  - `build.sh` updated: new `--bridge` flag triggers `build_bridge()` function
    - esbuild invocation: `--platform=node --target=node18 --format=cjs --bundle --outfile=dist/bridge/node_bridge.js`
    - `--external:readline` (Node built-in)
    - Same `--alias:@sharpee/*` flags as the existing `build_bundle()` function (points at `dist/` CJS outputs)
    - Sourcemap enabled; no minification by default
  - `build.sh` help text updated to document `--bridge` flag and `dist/bridge/node_bridge.js` output
  - `packages/bridge/package.json` `build` script: `tsc --noEmit` (actual artifact from esbuild in build.sh)
  - Output: `dist/bridge/node_bridge.js` (single CJS file, all engine code inlined, runs with `node node_bridge.js`)
  - Quick smoke test: `echo '{"method":"start","bundle":"dist/stories/dungeo.sharpee"}' | node dist/bridge/node_bridge.js` produces `ready`, `blocks`, `events`, `status` on stdout
- **Exit state**: `./build.sh --bridge` completes; `dist/bridge/node_bridge.js` exists; smoke test produces correct output sequence; bundle size reported
- **Status**: DONE

---

---

# Session Plan: Zoo Tutorial Story — 16-Version Progressive Sharpee Tutorial

**Created**: 2026-03-23
**Overall scope**: Create a new tutorial at `tutorials/familyzoo/` that teaches Sharpee authoring through 16 progressively richer versions of a family zoo. Each version adds exactly one new platform concept, is independently buildable and playable, and ships with at least one transcript test demonstrating the concept introduced.
**Bounded contexts touched**: N/A — story-level work only; no changes to packages/
**Key domain language**: N/A — tutorial/infrastructure work; domain is "zoo" but concepts are Sharpee API constructs

---

## Platform Gap Analysis (Pre-work)

Before implementation begins, verify the following constructs exist and are usable from story code:

| Construct | Status | Notes |
|---|---|---|
| `RoomTrait`, `IdentityTrait`, `ActorTrait` | Confirmed present | Core world-model exports |
| `SceneryTrait` | Confirmed present | world-model export |
| `ContainerTrait`, `SupporterTrait` | Confirmed present | world-model exports |
| `OpenableTrait`, `LockableTrait` | Confirmed present | world-model exports |
| `SwitchableTrait`, `ReadableTrait` | Confirmed present | world-model exports |
| `LightSourceTrait` | Confirmed present | world-model exports |
| `NpcPlugin`, `INpcService` | Confirmed present | @sharpee/plugin-npc |
| `SchedulerPlugin` (daemons/fuses) | Confirmed present | @sharpee/plugin-scheduler |
| `world.awardScore()` | Confirmed present | WorldModel method |
| `world.getStateValue/setStateValue` | Confirmed present | WorldModel method |
| `registerCapabilityBehavior` | Confirmed present | world-model export |
| `world.registerEventHandler` (entity `.on`) | Confirmed present | IFEntity.on pattern |
| Scoring win-state (endgame trigger) | Needs verification | Check if engine has a built-in win hook or requires manual event handler; see dungeo victory-handler |
| Tutorial document generator | Not planned as code | Written by hand per phase |

---

## Story Structure

Each version is a **single self-contained .ts file** with heavy beginner-friendly comments explaining every construct. No shared helpers, no subdirectories — each file is a complete, readable teaching example that a newcomer can read top-to-bottom.

```
tutorials/familyzoo/
├── package.json               # Single package for all versions
├── tsconfig.json
├── src/
│   ├── v01.ts                 # V1: single room (complete story in one file)
│   ├── v02.ts                 # V2: rooms + connections
│   │   ...
│   └── v16.ts                 # V16: full tutorial (default build target)
├── tests/
│   └── transcripts/
│       ├── v01-single-room.transcript
│       ├── v02-navigation.transcript
│       │   ...
│       └── v16-scoring.transcript
└── docs/
    └── tutorial.md            # Human-readable tutorial document
```

**Comment style**: "Kindergarten level" — assume the reader has never seen Sharpee or IF engine code. Every import, every trait, every method call gets a plain-English explanation. Comments explain *why* and *what this does in IF terms*, not just what the TypeScript syntax means. Later versions only comment on the NEW concept introduced; carried-forward code gets a brief "// Same as V03 — see v03.ts for details" note.

The `build.sh` story name is `familyzoo` and targets V16 for the "full game" build. Individual versions are tested via their own transcripts.

---

## Phases

### Phase 1: Project Scaffold + V1 (Single Room) + V2 (Navigation)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Story project setup; `RoomTrait`, `IdentityTrait`, `ActorTrait`; exits and `going` action
- **Entry state**: `tutorials/familyzoo/` does not exist; build.sh accepts any story name without registration
- **Deliverable**:
  - `tutorials/familyzoo/package.json` — `@sharpee/tutorial-familyzoo`, same workspace deps as cloak-of-darkness
  - `tutorials/familyzoo/tsconfig.json` — project references matching other stories
  - `tutorials/familyzoo/src/v01.ts` — V1 story: Zoo Entrance room only; `look` and `examine sign` work; `StoryInfoTrait` set; player placed in room. Single file, every line commented.
  - `tutorials/familyzoo/src/v02.ts` — V2 story: Zoo Entrance + Main Path + Petting Zoo + Aviary; exits wired with `Direction`; `going` works between all rooms. Single file, new concepts commented, carried-forward code has brief back-references.
  - `tutorials/familyzoo/src/v16.ts` — V16 stub (re-exports V2 for now so `./build.sh -s familyzoo` succeeds)
  - `tutorials/familyzoo/tests/transcripts/v01-single-room.transcript` — verifies look shows room name and description; examine sign works
  - `tutorials/familyzoo/tests/transcripts/v02-navigation.transcript` — verifies go south enters Main Path; go east enters Petting Zoo; go back; go north enters Aviary
  - `tutorials/familyzoo/docs/tutorial.md` stubs for V1 and V2 sections
  - Both versions pass transcript tests via `node dist/cli/sharpee.js --test`
- **Exit state**: `./build.sh -s familyzoo` succeeds (targeting V16 stub); V1 and V2 transcripts pass; package is registered in pnpm workspace
- **Status**: DONE

### Phase 2: V3 (Scenery) + V4 (Portable Objects) + V5 (Containers)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `SceneryTrait` (non-portable objects); `taking`/`dropping`/`inventory` actions; `ContainerTrait` and `SupporterTrait`
- **Entry state**: Phase 1 complete; V1 and V2 pass tests; project scaffolded
- **Deliverable**:
  - `tutorials/familyzoo/src/v03.ts` — V3: all V2 rooms plus animal enclosures, benches, trees, fences as `SceneryTrait` entities; single file; SceneryTrait heavily commented, rest back-referenced
  - `tutorials/familyzoo/src/v04.ts` — V4: all V3 content plus zoo map, bag of animal feed, souvenir penny as portable items; portable objects and inventory commented
  - `tutorials/familyzoo/src/v05.ts` — V5: all V4 content plus a backpack (`ContainerTrait`, portable), a feed dispenser (`ContainerTrait`, scenery), a bench (`SupporterTrait`); container/supporter concepts commented
  - Transcript tests:
    - `v03-scenery.transcript` — take bench (blocked), examine fence (works), look shows enclosures
    - `v04-portable.transcript` — take map, inventory shows map, drop map in different room
    - `v05-containers.transcript` — put map in backpack, look in backpack, put penny on bench, get feed from dispenser
  - Tutorial.md sections for V3, V4, V5
- **Exit state**: All three versions build and their transcripts pass; V16 stub updated to point at V5
- **Status**: DONE

### Phase 3: V6 (Openable) + V7 (Locked Doors) + V8 (Light and Dark)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `OpenableTrait`; `LockableTrait` with a key entity; `LightSourceTrait` and room `isDark`
- **Entry state**: Phase 2 complete; V3–V5 pass tests
- **Deliverable**:
  - `tutorials/familyzoo/src/v06.ts` — V6: all V5 content plus feed dispenser has `OpenableTrait`; a lunchbox in the picnic area; OpenableTrait commented
  - `tutorials/familyzoo/src/v07.ts` — V7: all V6 content plus a staff-only gate (`LockableTrait`, `OpenableTrait`) to a supply room; a keycard; LockableTrait and key wiring commented
  - `tutorials/familyzoo/src/v08.ts` — V8: all V7 content plus a Nocturnal Animals exhibit (`isDark: true`); a flashlight (`LightSourceTrait`); light/dark mechanics commented
  - Transcript tests:
    - `v06-openable.transcript` — open dispenser, close dispenser, open lunchbox, try to put feed in closed dispenser (blocked)
    - `v07-locked.transcript` — find keycard, unlock gate, open gate, enter supply room
    - `v08-light.transcript` — enter nocturnal exhibit (dark), retreat, get flashlight from supply room, switch on flashlight, re-enter exhibit (lit), examine animals
  - Tutorial.md sections for V6, V7, V8
- **Exit state**: V6, V7, V8 transcripts pass; darkness/light mechanics confirmed working without platform changes; V16 stub updated to V8
- **Status**: DONE

### Phase 4: V9 (Readable) + V10 (Switchable Devices)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `ReadableTrait`; `SwitchableTrait` (standalone switchable with event handler side effect)
- **Entry state**: Phase 3 complete; V6–V8 pass tests
- **Deliverable**:
  - `tutorials/familyzoo/src/v09.ts` — V9: all V8 content plus animal info plaques (`ReadableTrait`, `SceneryTrait`), a zoo brochure (portable, `ReadableTrait`), a warning sign; ReadableTrait commented
  - `tutorials/familyzoo/src/v10.ts` — V10: all V9 content plus a radio (`SwitchableTrait`), an exhibit lighting panel that controls darkness via event handler; SwitchableTrait commented
  - Transcript tests:
    - `v09-readable.transcript` — read brochure, read plaque at petting zoo, read warning sign at reptile house
    - `v10-switchable.transcript` — switch on radio (message), switch off lighting panel (nocturnal exhibit goes dark), switch on lighting panel (goes light again)
  - Tutorial.md sections for V9, V10
- **Exit state**: V9 and V10 transcripts pass; V10 demonstrates SwitchableTrait standalone (radio); V16 stub updated to V10
- **Status**: DONE

### Phase 5: V11 (NPCs) + V12 (Event Handlers)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `NpcPlugin`, `NpcTrait`, `INpcService`, `NpcBehavior`; story-level event handlers reacting to stdlib actions
- **Entry state**: Phase 4 complete; V9–V10 pass tests
- **Deliverable**:
  - **Pre-work**: Read `stories/dungeo/src/npcs/` to confirm the exact `NpcBehavior` interface shape used with `INpcService` before writing any NPC code
  - `tutorials/familyzoo/src/v11.ts` — V11: all V10 content plus a zookeeper NPC with patrol behavior and a parrot; NPC system commented
  - `tutorials/familyzoo/src/v12.ts` — V12: all V11 content plus two event handlers:
    - Dropping the bag of animal feed near an animal enclosure triggers an `if.event.dropped` handler that emits a "the goats rush to eat" message
    - Putting the souvenir penny in a souvenir press machine (`ContainerTrait`) triggers an `if.event.put_in` handler that produces a pressed penny in the player's inventory and removes the blank penny
  - Transcript tests:
    - `v11-npcs.transcript` — wait several turns to watch zookeeper move; talk to zookeeper; go to aviary and interact with parrot
    - `v12-event-handlers.transcript` — go to petting zoo, drop feed (animals react); go to gift shop, put penny in machine (get pressed penny back)
  - Tutorial.md sections for V11, V12
- **Exit state**: V11 and V12 transcripts pass; NPC patrol confirmed; event-handler item-transformation confirmed; V16 stub updated to V12
- **Status**: CURRENT

### Phase 6: V13 (Custom Actions) + V14 (Capability Dispatch)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Story-specific action creation; grammar extension via `extendParser`; `registerCapabilityBehavior` with entity-specific verb behavior
- **Entry state**: Phase 5 complete; V11–V12 pass tests
- **Deliverable**:
  - `tutorials/familyzoo/src/v13.ts` — V13: all V12 content plus `zoo.action.feed` and `zoo.action.photograph` story actions defined inline; grammar extension for `feed :animal` and `photograph :thing`; custom action pattern heavily commented
  - `tutorials/familyzoo/src/v14.ts` — V14: all V13 content plus `PettingTrait` with capability dispatch defined inline; three entities respond differently to `pet`: goats (affectionate), snake exhibit (glass blocks), parrot (bites); capability dispatch pattern commented
  - Transcript tests:
    - `v13-custom-actions.transcript` — feed goat, photograph aviary sign, try to photograph without camera (blocked)
    - `v14-capability-dispatch.transcript` — pet goat (affectionate), pet snake exhibit (glass), pet parrot (bites)
  - Tutorial.md sections for V13, V14
- **Exit state**: V13 and V14 transcripts pass; three-way `pet` dispatch confirmed; custom actions work end-to-end; V16 stub updated to V14
- **Status**: PENDING

### Phase 7: V15 (Timed Events) + V16 (Scoring and Endgame) + Final Tutorial
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `SchedulerPlugin` (daemons and fuses); `world.awardScore()`; win-state via event handler or turn daemon; complete tutorial document
- **Entry state**: Phase 6 complete; V13–V14 pass tests
- **Deliverable**:
  - **Pre-work**: Verify win-state pattern by reading `stories/dungeo/src/handlers/victory-handler.ts` before implementing V16 endgame
  - `tutorials/familyzoo/src/v15.ts` — V15: all V14 content plus:
    - A repeating daemon (every 5 turns) that emits zoo PA announcements counting down from 3 before the zoo "closes" (cosmetic only)
    - A fuse (10 turns from game start) that triggers "Feeding time at the Petting Zoo!" and then repeats every 8 turns
    - If feeding time passes without feeding, goats bleat each turn for 3 turns
    - Zookeeper patrol becomes daemon-driven via `SchedulerPlugin` (replacing manual NPC-behavior cycle from V11)
  - `tutorials/familyzoo/src/v16.ts` — V16 (final version): all V15 content plus:
    - Scoring: `world.awardScore()` called for visiting each exhibit (5 pts each x 5 = 25 pts), feeding animals (10 pts), collecting all 4 items: map + penny + pressed penny + photo (10 pts each = 40 pts), total possible = 75 pts
    - Win condition: a turn daemon checks `world.getStateValue('score') >= 75` each turn and triggers the "Junior Zookeeper badge" ending
    - `score` command works to check current score
  - `tutorials/familyzoo/src/v16.ts` becomes the permanent default build target (no longer a stub)
  - Transcript tests:
    - `v15-timed-events.transcript` — wait 5 turns (PA announcement fires); wait 10 turns (feeding time fires); go to petting zoo and feed goats (bleating stops)
    - `v16-scoring.transcript` — visit all 5 exhibits (score increases), feed goats (score), collect all 4 items (score), check score, reach win state
  - `tutorials/familyzoo/docs/tutorial.md` — complete human-readable tutorial document:
    - Introduction: "How to use this tutorial"
    - One section per version (V1–V16): what concept is introduced, the key code pattern, what to try in the transcript test, common mistakes
    - Appendix: "Sharpee Authoring Cheat Sheet" — one-line summaries of all 16 constructs with code snippets
- **Exit state**: All 16 transcripts pass; `./build.sh -s familyzoo` targets V16 and succeeds; `tutorial.md` is complete; story is self-documenting for new Sharpee authors
- **Status**: PENDING

---

## Cross-Phase Implementation Notes

**Single-file rule**: Every version is ONE .ts file (`src/v01.ts` through `src/v16.ts`). No subdirectories, no shared modules, no imports between versions. Each file is a complete, standalone teaching example. Duplication is intentional and desirable — the reader should never have to open a second file.

**Comment style**: Kindergarten-level. Every import gets a comment. Every trait gets "what this does in IF terms." Every method call gets "why we call this." New concepts introduced in that version get the heaviest commenting. Carried-forward code from prior versions gets a one-line back-reference: `// Same as V03 — see v03.ts for full explanation`.

**Build integration**: `build.sh` accepts any story name as `-s NAME` and looks for `stories/NAME/` without registration. The story `package.json` `main` targets `dist/v16.js`. Transcript tests reference version-specific story entry points via the `story:` field in the transcript header.

**NPC behavior interface**: Verify exact shape against `stories/dungeo/src/npcs/` before Phase 5. The `plugins.md` API shows the plugin wrapper but not the `NpcBehavior` interface.

**Tutorial document authoring**: Write each section after the corresponding version is confirmed working and tested. Do not write tutorial prose speculatively.

## Key design decisions to confirm during Phase 2

1. **Event batching strategy**: The ADR says `blocks`, then `events`, then `status` per turn. The engine emits `text:output` and `event` separately and potentially interleaved. The bridge needs to collect all events for a turn before flushing. The most reliable approach: accumulate events in an array during `executeTurn()`, then flush `blocks` + `events` + `status` atomically after `executeTurn()` resolves. The `engine.on('event', ...)` listener appends to the accumulator; it is cleared at the start of each turn.

2. **`.sharpee` bundle evaluation in Node.js**: The browser runner uses `URL.createObjectURL` + dynamic `import()` to load story.js as a true ES module. Node.js does not have `URL.createObjectURL`. The story.js in a bundle is browser ESM with `@sharpee/*` as externals. Options:
   - Write the bytes to a temp file, then `import()` (Node supports ESM dynamic import); clean up after
   - Use `vm.runInNewContext` with a synthetic module context that stubs `@sharpee/*` imports — but this does not support `import` statements
   - **Recommended**: esbuild the story bundle's story.js a second time at load time (CJS conversion, inlining the engine from the bridge's own bundled scope) — or simpler, re-bundle from source when `storyPath` is given; for `bundle` mode, write story.js to tmp file and `require()` it (the story.js in a `.sharpee` bundle is transpiled to browser ESM; for Node we need CJS). This may require the `.sharpee` format to include a Node-compatible CJS variant of story.js, or the bridge to run story.js through esbuild at load time.
   - **Alternative**: For Phase 2, only fully implement `storyPath` mode (esbuild → CJS in memory → eval); treat `bundle` mode as a stub that extracts story.js from the zip and then runs it through the same esbuild CJS pipeline. Revisit bundle mode after integration testing.

3. **esbuild programmatic API availability**: The bridge will use `require('esbuild')` programmatically for both `storyPath` compilation and (optionally) bundle mode story.js conversion. esbuild is already in the monorepo as a dev dependency. The standalone `node_bridge.js` built by esbuild will need esbuild itself as a runtime dependency (not just build-time) for the `storyPath` authoring mode. Either bundle esbuild's WASM into `node_bridge.js`, or keep esbuild external and require the host to provide it (note: esbuild ships a self-contained native binary — complex to bundle). Simplest: require `esbuild` to be installed alongside `node_bridge.js` (or installed as a peer dep in the native app's node_modules). Document this requirement.
