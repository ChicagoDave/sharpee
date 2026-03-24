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

## Key design decisions to confirm during Phase 2

1. **Event batching strategy**: The ADR says `blocks`, then `events`, then `status` per turn. The engine emits `text:output` and `event` separately and potentially interleaved. The bridge needs to collect all events for a turn before flushing. The most reliable approach: accumulate events in an array during `executeTurn()`, then flush `blocks` + `events` + `status` atomically after `executeTurn()` resolves. The `engine.on('event', ...)` listener appends to the accumulator; it is cleared at the start of each turn.

2. **`.sharpee` bundle evaluation in Node.js**: The browser runner uses `URL.createObjectURL` + dynamic `import()` to load story.js as a true ES module. Node.js does not have `URL.createObjectURL`. The story.js in a bundle is browser ESM with `@sharpee/*` as externals. Options:
   - Write the bytes to a temp file, then `import()` (Node supports ESM dynamic import); clean up after
   - Use `vm.runInNewContext` with a synthetic module context that stubs `@sharpee/*` imports — but this does not support `import` statements
   - **Recommended**: esbuild the story bundle's story.js a second time at load time (CJS conversion, inlining the engine from the bridge's own bundled scope) — or simpler, re-bundle from source when `storyPath` is given; for `bundle` mode, write story.js to tmp file and `require()` it (the story.js in a `.sharpee` bundle is transpiled to browser ESM; for Node we need CJS). This may require the `.sharpee` format to include a Node-compatible CJS variant of story.js, or the bridge to run story.js through esbuild at load time.
   - **Alternative**: For Phase 2, only fully implement `storyPath` mode (esbuild → CJS in memory → eval); treat `bundle` mode as a stub that extracts story.js from the zip and then runs it through the same esbuild CJS pipeline. Revisit bundle mode after integration testing.

3. **esbuild programmatic API availability**: The bridge will use `require('esbuild')` programmatically for both `storyPath` compilation and (optionally) bundle mode story.js conversion. esbuild is already in the monorepo as a dev dependency. The standalone `node_bridge.js` built by esbuild will need esbuild itself as a runtime dependency (not just build-time) for the `storyPath` authoring mode. Either bundle esbuild's WASM into `node_bridge.js`, or keep esbuild external and require the host to provide it (note: esbuild ships a self-contained native binary — complex to bundle). Simplest: require `esbuild` to be installed alongside `node_bridge.js` (or installed as a peer dep in the native app's node_modules). Document this requirement.
