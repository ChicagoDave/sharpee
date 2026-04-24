# Plan — ADR-153 Phase 4 Remediation (Deno Sandbox Integration, for real this time)

**Created**: 2026-04-24
**ADR**: `docs/architecture/adrs/adr-153-multiuser-sharpee-server.md`
**Parent plan**: `docs/work/multiuser/plan-20260419-multiuser-server.md` (Phase 4 section)
**Trigger**: `docs/work/stub-antipattern.md` — Phase 4 shipped with a Phase 0 stub as `deno-entry.ts`; the phase's namesake deliverable was the piece carved out. This plan closes that loop.

---

## Context

Phase 4 was declared done on 2026-04-19. The scaffolding landed: wire protocol, message framing, `SandboxProcess`, room spawn wiring, sandbox registry, 'crash' vs 'exit' detection. All Phase 4 tests passed against `tests/fixtures/stub-sandbox.mjs` — a Node echo-script impersonating Deno. The file the phase was named after — `src/sandbox/deno-entry.ts` — remained an 85-line Phase 0 stub that emits `title: '(stub)'` on INIT and errors on every non-INIT frame.

On 2026-04-23 a room was created on `play.sharpee.net` and no story ran. The failure was the phase, not a regression. This plan rescopes Phase 4 and replaces the stub with a production subprocess that loads real story bundles and drives the real engine.

An acceptance gate (`tools/server/tests/sandbox/deno-engine-integration.test.ts`) was written in the 2026-04-23 session and is currently RED by design. Green on that one test is the completion criterion for this plan.

---

## Goal

A participant in a real browser, connected to a real server, sends `look` in a room backed by `dungeo.sharpee`, and receives the real opening-room text of Mainframe Zork. This is proven by:

1. The acceptance gate test (`deno-engine-integration.test.ts`) flips from 5/5 RED → 5/5 GREEN against real Deno, real engine, real story bundle.
2. The stub apparatus (`tests/fixtures/stub-sandbox.mjs`, `tests/helpers/fake-sandbox.ts`, `sandboxOverride`'s `binary`/`args` escape hatch) is removed or rewritten so no future test can silently substitute a fake for the engine.
3. `play.sharpee.net` behavior: create a room, join, type `look`, see the opening description, submit `inventory`, observe state change.

---

## Architectural Decisions (confirmed in 2026-04-23 session)

### Option B — Narrow Deno permissions

Spawn command becomes:

```
deno run --allow-read=<compiled_bundle_path>,<story_file_path> --v8-flags=--max-old-space-size=256 <compiled_bundle_path>
```

Not `--allow-none`. The bundle needs read access to itself (Deno imports it from disk) and to the story file (the INIT frame passes its path so the bundle can confirm what it loaded, though the bundle is self-contained). No network, no env, no write, no subprocess, no run, no ffi. The container is the outer boundary; these flags are the inner boundary against rogue story code.

ADR-153's "no filesystem access" language means no access to the server's stateful surfaces (DB, other rooms' saves, cross-story data, `/etc`), not zero file descriptors ever. The narrow `--allow-read` is consistent with that intent.

### Option D1 — Server-side install-time pre-bundle

`.sharpee` bundles ship with 140 bare-specifier imports against 6 external `@sharpee/*` packages. A naive Deno `import()` of `story.js` fails at the first bare specifier. The fix is install-time re-bundling on the server.

When a `.sharpee` file lands in `/data/stories/`, the server:

1. Detects it (file watcher on boot and on signal).
2. Unzips into a scratch dir.
3. Invokes esbuild programmatically to combine the new host entry + the story's `story.js` + all transitively-resolved `@sharpee/*` packages (engine, core, world-model, stdlib, parser-en-us, lang-en-us, plugin-npc, plugin-scheduler, plugin-state-machine, plus any others the story imports) into a single self-contained ESM.
4. Writes the result to `/data/stories-compiled/<slug>.host.js`.
5. On subsequent requests for that story, spawns Deno against the compiled bundle directly — no re-bundle unless the source `.sharpee` mtime has advanced.

Operators drop a `.sharpee` file; users play. Zero wire-protocol change. Zero change to `.sharpee` format. One compiled artifact per story.

---

## Scope

### In scope

- New `src/sandbox/story-bundler.ts` — install-time esbuild invocation with the full `@sharpee/*` dep graph resolved.
- New `src/sandbox/story-cache.ts` — cache lookup by slug + source-mtime.
- Rewritten `src/sandbox/deno-entry.ts` — production host: load story module, bootstrap engine (Parser, LanguageProvider, PerceptionService, player entity), drive the turn loop, handle SAVE/RESTORE/SHUTDOWN, catch per-turn exceptions into ERROR frames.
- Update `src/sandbox/sandbox-process.ts` — spawn against `/data/stories-compiled/<slug>.host.js` (not `deno-entry.ts` directly), with the narrow `--allow-read` flag set. Remove the `binary`/`args` injection points from `SandboxSpawnOptions`.
- Update `src/rooms/room-manager.ts`, `src/saves/save-service.ts`, `src/stories/story-health.ts` — remove `sandboxOverride` propagation.
- Fix `sandbox-process.ts` spawn-error handling — `child.on('error')` currently unhandled; a missing Deno binary today crashes the server with an uncaught exception rather than emitting `crash`.
- Delete `tests/fixtures/stub-sandbox.mjs` and `tests/helpers/fake-sandbox.ts`.
- Rewrite or delete `tests/sandbox/turn-execution.test.ts` and `tests/ws/save-restore.test.ts` — currently labelled "end-to-end" but drive the stub. They become either legitimate scaffolding tests (relabeled) or get replaced with real-sandbox versions.
- Update `tools/server/deno.json` — drop bare-specifier imports (bundle is self-contained, nothing to resolve).
- Update `tools/server/Dockerfile` — include esbuild in the runtime image so install-time bundling can run inside the container.

### Out of scope

- Memory/time limits beyond the existing `--max-old-space-size=256`. Turn timeout already lives in `room-manager`.
- Supporting multiple `.sharpee` format versions. `formatVersion: 1` is the only version; version-mismatch is a hard error.
- Plugin auto-discovery. The bundler hand-imports the known plugin set; unknown plugins fail at bundle time, not runtime.
- Live-reload of the compiled bundle while a room is running. Rooms keep their existing sandbox until teardown; restarts pick up a refreshed bundle.
- Streaming OUTPUT frames mid-turn. The engine produces one `TurnResult` per `executeTurn`; that becomes one `OUTPUT` frame. If partial output ever matters, that's a later plan.

### Explicit non-goals

- Not touching the wire protocol (`src/wire/server-sandbox.ts`, `src/wire/primitives.ts`).
- Not changing the `.sharpee` build pipeline in `stories/**` or `build.sh` — the gap is on the server's consumption side, not the story's production side.
- Not attempting to handle stories we haven't seen. Dungeo is the shakedown; cloak-of-darkness etc. can shake the bundler loose in a follow-up.

---

## Sub-phases

Three sub-phases, each committable on its own.

### 4-REMEDIATION-1 — Acceptance Gate in Place (DONE — 2026-04-23)

**Status**: already landed.

- `tools/server/tests/sandbox/deno-engine-integration.test.ts` exists, zero stubs, imports only production code.
- 5 assertions that refuse stub values (title ≠ `(stub)`, blob > 500 chars, events > 0, serialized text > 200 chars, save/restore round-trip byte-identical).
- Deno installed on the local dev host (mac-mini). Current status: 5/5 RED with test-timeout (Deno spawns, handshake stalls on stub).

No further work in this sub-phase. Gate is ready; rest of the plan drives it green.

---

### 4-REMEDIATION-2 — Install-Time Bundler and Production `deno-entry.ts`

**Goal**: Acceptance gate flips to 5/5 GREEN on the local mac-mini. `play.sharpee.net` runs a real story end-to-end after deploy.

**Entry state**: 4-R-1 done. No code written yet in this sub-phase.

**Files**:

- `tools/server/src/sandbox/story-bundler.ts` (NEW, ~120 lines)
  - Public: `async function compileStoryBundle(sourcePath: string, opts: { outDir: string }): Promise<string>`
  - Reads `.sharpee` (zip), extracts `meta.json` + `story.js` to a scratch dir.
  - Writes a generated `host.ts` combining the rewritten `deno-entry.ts` logic + `import "./story.js"` (as a sibling in the scratch dir, so esbuild resolves it locally).
  - Invokes esbuild programmatically: `bundle: true, platform: 'neutral', format: 'esm', target: 'es2022', conditions: ['import', 'module', 'default']`, `entryPoints: [generated_host_ts]`.
  - **No `external`** — the whole `@sharpee/*` graph inlines.
  - Writes to `<outDir>/<slug>.host.js`. Returns the path.
- `tools/server/src/sandbox/story-cache.ts` (NEW, ~60 lines)
  - Public: `async function getCompiledBundle(sourcePath: string): Promise<string>`
  - Stats `sourcePath`; stats the cached compiled bundle if present; re-bundles if source mtime is newer or cached bundle is missing.
  - Cache dir: `process.env.STORIES_COMPILED_DIR ?? '/data/stories-compiled'`.
- `tools/server/src/sandbox/deno-entry.ts` (REWRITE, ~250 lines)
  - Source of truth for the host logic. Still a standalone `.ts` (still Deno-runtime file), but now imports from `@sharpee/engine` / `@sharpee/world-model` / `@sharpee/stdlib` / `@sharpee/parser-en-us` / `@sharpee/lang-en-us`. The bundler resolves those imports; Deno executes the bundled output, not this file directly.
  - On INIT: read the embedded story module, bootstrap engine (modeled on `packages/zifmia/src/runner/index.tsx:1-180`), emit READY with real `story_metadata` from the story config.
  - On COMMAND: `await engine.executeTurn(input)` inside try/catch. On success, emit OUTPUT with `text_blocks` from the text service and `events` from the turn result. On throw, emit ERROR with `phase: 'turn', turn_id, detail`.
  - On SAVE: `engine.createSaveData()` → `JSON.stringify` → base64 → emit SAVED.
  - On RESTORE: base64-decode → `JSON.parse` → `engine.loadSaveData(...)` → emit RESTORED with the `text_blocks` from the restored state's opening view.
  - On SHUTDOWN: `engine.stop?.()`; emit EXITED `{ reason: 'shutdown' }`; `Deno.exit(0)`.
  - The generated `host.ts` the bundler produces is a tiny shim that does `import { main } from './deno-entry.js'; import * as story from './story.js'; main(story);` — keeps the logic co-located in one version-controlled file.
- `tools/server/src/sandbox/sandbox-process.ts` (UPDATE)
  - Default `args` changes to `['run', '--allow-read=<bundle>,<story>', '--v8-flags=--max-old-space-size=256', bundle_path]`. The story path also goes through the INIT message as before (the bundle emits READY from the embedded meta, but the path is still needed for provenance logs and future restart semantics).
  - Remove `binary` and `args` fields from `SandboxSpawnOptions`.
  - Add `child.on('error', ...)` → emit `crash` with a useful stderr message instead of an uncaught exception (fixes the `ENOENT`-crashes-the-server bug).
  - `spawnSandbox` takes the already-compiled bundle path (caller's responsibility via `story-cache.getCompiledBundle`).
- `tools/server/src/rooms/room-manager.ts` (UPDATE)
  - Resolve the compiled bundle before spawning: `const bundle = await getCompiledBundle(story_file); const sandbox = spawnSandbox({ room_id, story_file, bundle_path: bundle, ... });`.
  - Drop `sandboxOverride` parameter and all its propagation.
- `tools/server/src/saves/save-service.ts` — same: drop `sandboxOverride`.
- `tools/server/src/stories/story-health.ts` — same, plus: probe the compiled bundle exists/compiles at boot as part of health.
- `tools/server/deno.json` — drop `imports` map (nothing to resolve once bundled). Keep the file as documentation of the spawn command and permissions posture.
- `tools/server/Dockerfile`
  - Add `esbuild` to the runtime image (it's a build-time dep for the server now, not dev-only). Alternative: ship a pre-compiled esbuild binary in the image — cheaper at runtime.
  - Create `/data/stories-compiled` volume dir.
  - Ensure `deno` binary is on PATH at runtime (already present from Phase 0 Docker work; reconfirm).

**Tests**:

- `tools/server/tests/sandbox/story-bundler.test.ts` (NEW)
  - Bundles `dungeo.sharpee` to a temp dir; asserts output file exists, is self-contained (grep confirms no bare `@sharpee/*` specifiers survive), and runs under `deno run --allow-read=...` producing a `"ready"`-like signal to stdout.
  - This is itself an integration test — no mocks; real esbuild, real input bundle.
- `tools/server/tests/sandbox/story-cache.test.ts` (NEW)
  - Cache miss → compiles. Cache hit → skips compile. Source mtime advance → re-compiles. Corrupted bundle → recompiles.
- `tools/server/tests/sandbox/deno-engine-integration.test.ts` (EXISTING, currently RED)
  - Should flip to 5/5 GREEN once the bundler + new `deno-entry.ts` are in place.

**Exit state**:
- Acceptance gate 5/5 GREEN on mac-mini.
- `play.sharpee.net` deploy: room on dungeo, `look` returns real opening text.
- Full server test suite passing (pre-existing 325 + new bundler/cache tests).

---

### 4-REMEDIATION-3 — Strip the Stub Apparatus

**Goal**: no future test can silently substitute a fake for the engine. The "binary/args override" injection surface is gone. Mislabeled "end-to-end" stub tests are either deleted or relabeled.

**Entry state**: 4-R-2 done. Acceptance gate green.

**Files**:

- `tools/server/tests/fixtures/stub-sandbox.mjs` — DELETE.
- `tools/server/tests/helpers/fake-sandbox.ts` — DELETE.
- `tools/server/tests/sandbox/turn-execution.test.ts` — currently "End-to-end turn execution over WebSocket + sandbox" but drives the stub. Options:
  - (a) Delete; `deno-engine-integration.test.ts` replaces the "real turn over the wire" coverage.
  - (b) Rewrite as a real-sandbox WebSocket test: connect to a live server bound to an ephemeral port, send `submit_command`, assert `story_output` arrives. Slow but real.
  - Preferred: (b), with `describe.skipIf(!process.env.SHARPEE_REAL_SANDBOX)` so local dev can skip and CI can enforce.
- `tools/server/tests/ws/save-restore.test.ts` — same treatment. Currently "End-to-end save + restore over WebSocket + sandbox" driving the stub. Prefer (b).
- `tools/server/src/sandbox/sandbox-process.ts` — confirm `SandboxSpawnOptions` no longer has `binary`/`args`. Any remaining `sandboxOverride` usage is a leak.
- `tools/server/src/rooms/room-manager.ts`, `src/saves/save-service.ts`, `src/stories/story-health.ts` — confirm no residual override wiring.
- Grep audit: `rg 'sandboxOverride|stubSandbox|fakeSandbox|stub-sandbox\.mjs|fake-sandbox' tools/server` must return zero matches.

**Tests**:

- Run full server suite — verify no tests break after removing the stubs (any that do were using the stub in their setup and need to adopt the real-sandbox path or be scoped to scaffolding-only coverage).
- Run acceptance gate one more time as a regression check — must still be 5/5 GREEN.

**Exit state**:
- No stub fixtures for owned dependencies remain in the repo.
- The No-Stub-Under-Test rule is enforceable by grep (which becomes a CI check in a separate follow-up).

---

## Acceptance Criteria

| AC | Check |
|---|---|
| AC-4R.1 | `deno-engine-integration.test.ts` passes 5/5 against real Deno on mac-mini with no stubs on the spawn path |
| AC-4R.2 | `play.sharpee.net` renders real dungeon opening text on `look` in a new room backed by dungeo.sharpee |
| AC-4R.3 | `rg 'sandboxOverride\|stub-sandbox\|fake-sandbox' tools/server` returns zero matches |
| AC-4R.4 | `SandboxSpawnOptions` no longer has `binary` or `args` fields |
| AC-4R.5 | All pre-existing server tests pass after removal of stub apparatus (pre-existing 325 + new bundler/cache tests) |
| AC-4R.6 | Spawning with Deno missing from PATH emits a `crash` event with actionable stderr, not an uncaught exception |
| AC-4R.7 | Install-time bundle is self-contained — grep of the compiled `host.js` confirms zero surviving bare `@sharpee/*` imports |

---

## Risks and Open Questions

- **Engine bundle size**: a preliminary spike (2026-04-23 session) produced a 927 KB ESM from engine + world-model. Adding stdlib + plugins + parser + lang may push to ~2–3 MB. Deno startup with a 3 MB ESM is still sub-second; not a blocker. Flagged for observation, not action.
- **Plugin enumeration is hand-maintained**: the bundler imports `@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`, `@sharpee/plugin-state-machine` explicitly for dungeo. If a new story needs a new plugin, the bundler has to know. Two options: (a) accept the explicit list and update it per story (simple, honest), (b) parse `story.js` for its imports and auto-include them (clever, fragile). Preferring (a).
- **Plugins are imported by the story**: `story.js` ships with imports like `from "@sharpee/plugin-npc"`. If esbuild inlines all workspace packages, the plugins end up in the bundle by transitive import anyway. The hand-maintained plugin list is really only relevant if the host needs plugins the story doesn't import. For v0.1 dungeo, the story imports everything needed.
- **Deno caching**: first run in a fresh container downloads no remote deps (everything is local bundle), but Deno still writes its module graph cache. Path: `DENO_DIR`. Set this to an ephemeral container dir, not the `--allow-read` list, so the permission flags stay tight.
- **Save format**: the ISaveData JSON → base64 path assumes the payload serializes cleanly. If it contains Buffers, Sets, Maps, or class instances, JSON.stringify strips/mangles them. Spot-check on first save-restore round trip; if broken, add a custom serializer before rollout.
- **Opening scene**: READY does not include opening text. The first `look` produces it. The server already sends a synthetic initial `look` in `room-manager`; confirm that wiring is still intact after Phase 4 remediation. (If not, adding it is a one-liner.)
- **Acceptance gate needs Deno on the host**: local dev (mac-mini) now has it. CI needs it too. Install step for GitHub Actions CI is a follow-up — out of scope for this plan, in scope for a subsequent CI plan.
- **The `play.sharpee.net` deploy requires an SSH-accessible server**: local sessions can iterate against the local Docker image; final smoke against the public URL needs the server host. Confirm the `server` machine has a green Deno + green compiled bundle before declaring AC-4R.2 met.

---

## Dependencies

- **Upstream**: Phase 4 scaffolding (sandbox-process, message-framing, sandbox-registry, wire protocol) — all in place from the original Phase 4.
- **Cross-cutting**: no touch on the browser client, the WebSocket handlers (beyond what Phase 4 already wired), or the HTTP layer. This is a sandbox-side plan.
- **External**: Deno 2.7+ at runtime; esbuild at install time (already a transitive dep via `@sharpee/*` build pipeline — confirm it's not dev-only in `tools/server/package.json`).

---

## Work Discipline Notes

- **Platform changes**: the bundler touches `tools/server/` only; no `packages/*` edits expected. If implementation reveals that the engine needs a change to support Deno-side execution (e.g., a web-platform polyfill), **stop and discuss** per CLAUDE.md rule on platform changes.
- **One step at a time**: each sub-phase is committable on its own. Do not queue 4-R-2 + 4-R-3 in one sitting — run 4-R-2, prove the gate green, then tear out the stubs as a separate commit.
- **No-Stub-Under-Test**: this plan is the remediation of the very anti-pattern it is named after. Any test introduced for the bundler or the new `deno-entry.ts` must exercise real esbuild / real Deno. `tests/sandbox/story-bundler.test.ts` has the same "no stubs" posture as the acceptance gate.
- **Rollback**: 4-R-2 is reversible by reverting the commit; the old `deno-entry.ts` stub is preserved in git history. 4-R-3 is reversible but the restored fixtures would then need to be retagged as deprecated; don't revert unless you're sure the real-sandbox path works.
