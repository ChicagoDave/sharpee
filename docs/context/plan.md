# Session Plan: packages/runtime — Headless Engine Runtime with PostMessage Bridge

**Created**: 2026-03-17
**Overall scope**: Create a new `packages/runtime` package that bundles the full Sharpee engine as a browser-ready IIFE (`sharpee-runtime.js`). The runtime loads headlessly in an iframe, exposes the full Sharpee API on `window.Sharpee`, and communicates with a parent frame (Lantern IDE) via a typed PostMessage bridge. Story code is eval'd against `window.Sharpee` — no build step at play time.
**Bounded contexts touched**: N/A — infrastructure/tooling; no domain model changes
**Key domain language**: N/A — this is a platform packaging and bridge concern

---

## Phases

### Phase 1: Protocol Types and Package Scaffold
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — infrastructure
- **Entry state**: Codebase is in current state; no `packages/runtime` directory exists
- **Deliverable**:
  - `packages/runtime/package.json` — `@sharpee/runtime`, with peer deps on all engine packages; no `build` script yet (added in Phase 3)
  - `packages/runtime/tsconfig.json` — targets ES2020, browser platform
  - `packages/runtime/src/protocol.ts` — fully typed PostMessage message union: inbound (`start`, `command`, `restart`, `save`, `restore`, `loadStory`) and outbound (`ready`, `output`, `status`, `error`, `saveData`, `started`)
  - `packages/runtime/src/index.ts` — re-exports all story-author-facing symbols from engine, world-model, stdlib, parser-en-us, lang-en-us, plugins (mirrors what `packages/sharpee` exports, tuned to what eval'd story code needs)
  - No bridge logic yet; no build integration yet
- **Exit state**: Package directory exists, TypeScript compiles cleanly (tsc --noEmit), protocol types are stable enough to start bridge work
- **Status**: DONE

### Phase 2: PostMessage Bridge
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A — infrastructure bridge
- **Entry state**: Phase 1 complete; `protocol.ts` and `index.ts` exist; package scaffolded
- **Deliverable**:
  - `packages/runtime/src/bridge.ts` — `SharpeeRuntimeBridge` class that:
    - Accepts a constructed `GameEngine` and `WorldModel`
    - Listens for `postMessage` from parent on `window`
    - Dispatches inbound messages to engine: `command` → `engine.executeTurn()`, `save` → save hooks, `restore` → restore hooks, `restart` → engine restart, `loadStory` → eval story code against `window.Sharpee` then initialize engine
    - Listens for engine events (`text:output`, `state:changed`, `turn:complete`) and posts outbound messages to `window.parent`
    - Posts `status` after each turn (location, score, turns)
    - Posts `error` for uncaught exceptions
    - Posts `ready` after initialization
    - Save/restore: serializes save data to/from parent via `saveData` message
  - `packages/runtime/src/runtime-entry.ts` — browser entry point:
    - Builds `window.Sharpee` namespace from `index.ts` exports
    - Constructs `WorldModel`, `Parser`, `LanguageProvider`, `PerceptionService`, `GameEngine`
    - Creates `SharpeeRuntimeBridge` and calls `bridge.listen()`
    - Posts `ready` to parent
  - A minimal `test-harness.html` in `packages/runtime/` for manual PostMessage testing without Lantern (opens runtime in iframe, sends messages via a textarea+button, displays responses)
- **Exit state**: Bridge compiles; manual test harness demonstrates the full round-trip: parent sends `start`, runtime posts `output` with game banner, parent sends `command "look"`, runtime posts `output` with room description and `status` with location/score/turns
- **Status**: DONE

### Phase 3: Build Integration and Bundled Output
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A — infrastructure
- **Entry state**: Phase 2 complete; bridge and entry point compile; test harness validates round-trip behavior
- **Deliverable**:
  - `build.sh` updated: new `--runtime` flag (standalone, no story required) triggers `build_sharpee_runtime()` function
    - esbuild invocation: `--platform=browser --format=iife --global-name=SharpeeRuntime --outfile=dist/runtime/sharpee-runtime.js`
    - Same `--alias:@sharpee/*` flags as the existing Zifmia runner build (pointing at `dist/` CJS or `dist-esm/` ESM as appropriate)
    - Sourcemap enabled; minification optional (off by default for debuggability during Lantern integration)
  - `packages/runtime/package.json` `build` script added (plain `tsc --noEmit` — the real artifact is produced by esbuild in build.sh, not by tsc)
  - `build.sh` help text and summary updated to document `--runtime`
  - Output: `dist/runtime/sharpee-runtime.js` (single IIFE, all engine code bundled)
  - Bundle size reported; quick load test confirms the IIFE initializes cleanly
- **Exit state**: `./build.sh --runtime` completes, produces `dist/runtime/sharpee-runtime.js`; loading it in the test harness serves up a working runtime that responds to PostMessage commands
- **Status**: DONE

---

## Open Questions to Resolve During Phase 2

These are design decisions to nail down before or at the start of Phase 2, not separate phases:

1. **`loadStory` vs `start` sequence**: Does the parent always `loadStory` first (eval'ing story code) then `start`, or does `start` carry the story code? The protocol should clarify this handshake — likely `loadStory` → `started` → `start` → game banner `output`.

2. **Save data transport**: The parent holds save slots. When the engine requests a save, the bridge posts `saveData` with the serialized state; when the parent wants to restore, it sends `restore` with the serialized state. The bridge should not use `localStorage` directly — all persistence is parent-owned.

3. **`window.Sharpee` namespace shape**: Decide whether to attach individual exports (`window.Sharpee.GameEngine`, `window.Sharpee.WorldModel`, etc.) or a single default export object. Individual named exports match the existing module surface and are easier for generated story code to destructure.

4. **Origin validation**: The bridge should validate that incoming `postMessage` events come from a trusted origin. For Lantern IDE this may be `null` (same-machine file:// or localhost). Decide whether to whitelist or use a shared secret in the protocol.
