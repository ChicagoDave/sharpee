# ADR-155: Install-Time Story Compilation Pipeline

## Status: PROPOSAL

## Date: 2026-04-24

## Relates to

- **ADR-153** (Multiuser Sharpee Server) — this ADR names a component that ADR-153 implied but did not specify. ADR-153's Decision 1 says the sandbox "dynamically imports the bundle"; this ADR explains why that is not quite true on the server side and names the component that fills the gap.
- **Phase 4 Remediation** (`docs/work/multiuser/plan-20260424-multiuser-server-phase4-remediation.md`) — the source of the decisions recorded here. That plan's Option D1 is the architecture documented in this ADR.
- **CLAUDE.md rule 12a** (Integration Reality) — the bundler is tested real-path against a real esbuild invocation and a real `dungeo.sharpee` bundle; no mocked esbuild, no fixture bundles.

## Context

ADR-153 framed the Deno sandbox as loading a `.sharpee` bundle via a dynamic `import()` from within a small TypeScript host entry. In practice, `.sharpee` bundles are esbuild outputs produced with `--external:@sharpee/*`, so every line like `from "@sharpee/stdlib"` or `from "@sharpee/world-model"` is a **bare specifier** that a package resolver must satisfy at load time.

Under Vite-hosted Zifmia in the browser, the resolver exists. Under Deno running an esbuild-bundled host script, there is no package resolver — esbuild inlines everything it sees into private scope, and any bare specifier that survives the bundle fails at Deno's first `import()` call.

Phase 4 of the multiuser server shipped a stub that avoided this path entirely; Phase 4 Remediation made it real. The fix was to **re-bundle every story at install time** so the Deno sandbox receives a single self-contained ESM artifact that has no surviving bare specifiers.

## Decision

The multiuser server owns an **install-time story compilation pipeline** with the following commitments.

### 1. One compiled artifact per installed story

When a `.sharpee` file lands in `/data/stories/`, the server produces a Deno-runnable ESM artifact at `/data/stories-compiled/<slug>.host.js`. The sandbox spawns Deno against the compiled artifact, never against the raw `.sharpee`.

- The compiled artifact inlines the story plus the full `@sharpee/*` dependency graph (engine, core, world-model, stdlib, parser-en-us, lang-en-us, plus the story's plugin imports).
- The `.sharpee` format is unchanged. Operators drop a `.sharpee` file the same way they always did; the compilation step is server-side and transparent.

### 2. Compilation happens via in-process esbuild

The server uses `esbuild` programmatically (not as a CLI invocation) to produce the artifact. Configuration: `bundle: true`, `platform: 'neutral'`, `format: 'esm'`, `target: 'es2022'`, `conditions: ['import', 'module', 'default']`, no `external` list (the whole `@sharpee/*` graph inlines).

esbuild is part of the runtime Docker image, not a dev-only dependency. This is a meaningful deviation from "thin runtime"; it is accepted in exchange for zero-touch operator experience.

### 3. Cache is mtime-keyed

`getCompiledBundle(sourcePath)` resolves to the cached compiled bundle iff the cache file exists and its mtime is newer than the source `.sharpee` mtime. Otherwise it recompiles and writes fresh. Cache directory is `process.env.STORIES_COMPILED_DIR ?? '/data/stories-compiled'`.

- No LRU eviction; the cache is one-file-per-story-slug.
- No manual invalidation API; touching the `.sharpee` file bumps mtime and triggers recompile on next spawn.
- Corrupted cache files (unreadable, truncated, wrong magic bytes) are treated as cache misses and recompiled.

### 4. Plugin enumeration is hand-maintained

The generated host module imports the known plugin set explicitly (`@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`, `@sharpee/plugin-state-machine`, and any others a supported story requires). A `.sharpee` bundle whose `story.js` imports a plugin not in the host's import list fails at bundle time with a clear error — not at runtime.

Rationale: auto-discovery via AST parsing of `story.js` was considered and rejected as clever-fragile. Manual enumeration is honest — a new plugin is a recognized change. The cost is one-line edit per plugin introduction; the benefit is no silent failure mode at spawn time.

### 5. Compilation failures are room-create-time errors

A story whose bundle fails to compile (malformed `.sharpee`, missing plugin import in the host, esbuild crash) is **not installable**. The server's story-health probe runs compilation on every story at boot and exposes the compile state via `GET /api/stories`. A room cannot be created against a story whose compile probe is RED.

A runtime spawn never compiles. Compilation belongs at install time (or at server boot) only. The sandbox's `spawnSandbox` takes the *already-compiled* bundle path; `room-manager` is responsible for calling `getCompiledBundle` first.

### 6. The compiled bundle is a runtime volume artifact

`/data/stories-compiled/` is a persistent volume alongside `/data/db` and `/data/stories`. It survives container restarts. It is not source-controlled. It is regenerated on source mtime advance. Operators can safely `rm -rf /data/stories-compiled/*` to force a full recompile; the next spawn rebuilds the entry.

## Invariants

Invariants the pipeline upholds. Violation is a bug.

1. **Compilation determinism per (source_mtime, esbuild_version, plugin_set).** Given the same source `.sharpee`, the same esbuild version, and the same hand-maintained plugin imports, compilation produces byte-identical output. This makes cache hit logic correct and makes regression diffs meaningful.
2. **No-bare-specifier artifact.** A compiled `<slug>.host.js` contains zero surviving bare specifiers that match `@sharpee/*`. This is grep-verifiable and part of the bundler's test.
3. **Story health is pre-spawn.** No spawn fails because of a compilation issue; compilation has already succeeded or the story is marked un-installable at boot.
4. **Spawn-time is cache-read-only.** `spawnSandbox` calls no compiler. A missing cache entry is a bug in the caller, not a runtime condition the spawner handles.

## Sharpee Package Dependencies

| Package | Role |
|---|---|
| `@sharpee/engine` | Inlined into the compiled bundle via the generated host's `import`. |
| `@sharpee/core` | Same. Shared event/type definitions. |
| `@sharpee/world-model`, `@sharpee/stdlib`, `@sharpee/parser-en-us`, `@sharpee/lang-en-us`, `@sharpee/plugin-*` | Same. Inlined transitively via the story and the host's explicit imports. |
| `esbuild` | Runtime dependency in `tools/server/package.json`, not dev-only. |

## Acceptance Criteria

1. **Clean-host compile.** On a fresh container with `/data/stories-compiled/` empty, creating a room against `dungeo` compiles the bundle on first spawn (or at boot) and the room runs the real opening scene.
2. **Cache hit skips compile.** Re-creating the same story's room without mtime advance re-uses the cached bundle. The spawn invocation produces no new esbuild work (verifiable via log or file mtime).
3. **mtime invalidation recompiles.** Touching the `.sharpee` source file triggers a recompile on next spawn.
4. **Plugin-mismatch fails at bundle time.** A `.sharpee` whose `story.js` imports a plugin not in the host enumeration fails at `getCompiledBundle` with a diagnosable error, not at runtime.
5. **Self-contained artifact.** `rg '@sharpee/' /data/stories-compiled/<slug>.host.js` returns zero matches (no surviving bare specifiers).
6. **Real-path test.** `tools/server/tests/sandbox/story-bundler.test.ts` compiles a real `.sharpee` with real esbuild against a real `@sharpee/*` graph — no fixtures, no mocked esbuild. Satisfies CLAUDE.md rule 12a for the bundler seam.

## Consequences

### Positive

- **Operator experience is unchanged from ADR-153.** Drop `.sharpee` file, users play. The compilation step is a server-side implementation concern, not an operator-facing step.
- **Wire protocol is unaffected.** The sandbox still speaks the same INIT/COMMAND/OUTPUT/SAVE/RESTORE/SHUTDOWN lines. The bundler is below that protocol.
- **`.sharpee` format stays stable.** No v2 format, no per-consumer variants. The multiuser server consumes `.sharpee` with an extra step; the browser consumer still consumes it directly.
- **Failure mode is forward.** A story that can't compile is un-installable, loudly, at boot. A story that compiles runs.
- **Plugin graph is explicit.** The hand-maintained plugin list is documentation by another name. Reading the host reveals exactly which plugin set the server supports.

### Negative / Acknowledged Trade-offs

- **esbuild is now a runtime dependency.** The Docker image size grew. The runtime has a compilation responsibility that single-player Zifmia never had. Accepted as the cost of the zero-touch operator experience.
- **Plugin enumeration is a maintenance surface.** A new story needing a plugin the host doesn't enumerate fails at install. The remediation plan flagged this; the honest answer is "edit the host's import list when a new plugin is needed." An auto-discovery path exists (parse `story.js` for imports) but is not taken for v0.1.
- **Compiled artifact size.** The dungeo bundle is ~2–3 MB. Larger stories with more plugins will grow proportionally. Deno's startup with a 3 MB ESM is still sub-second; not a blocker, flagged for observation.
- **`DENO_DIR` inside the container must be ephemeral.** Deno writes a module graph cache. If that cache lands on a persistent volume, stale entries across image upgrades could cause weird failures. Docker CMD sets `DENO_DIR` to a container-local path; operators who override this should know the constraint.

### Neutral / Follow-ups

- **Story health as a first-class health endpoint.** Exposing compile state via `/api/stories` is this ADR; exposing it via a richer `/health` surface that lists per-story status is a natural extension if operators want it.
- **Boot-time full recompile vs. lazy.** Current design compiles at boot (via the health probe) and also on first-spawn demand (via `getCompiledBundle`). The two paths are idempotent. If boot-time recompile becomes slow with many stories, demand-only is an option.
- **Content-addressed cache.** mtime is fine for single-operator instances. A content-hash-keyed cache (hash the `.sharpee` contents) is more robust for operators who rsync stories without preserving mtime. Not needed for MVP.

## Implementation

Implemented in Phase 4 Remediation (sub-phase 4-R-2, committed 2364db85 on 2026-04-24):

- `tools/server/src/sandbox/story-bundler.ts` — `compileStoryBundle(sourcePath, opts)` with in-process esbuild.
- `tools/server/src/sandbox/story-cache.ts` — `getCompiledBundle(sourcePath)` with mtime-keyed cache.
- `tools/server/src/sandbox/deno-entry.ts` — rewritten to load the compiled bundle and drive the real engine.
- `tools/server/src/sandbox/sandbox-process.ts` — spawns Deno against the compiled bundle with narrow `--allow-read` flags.
- `tools/server/src/rooms/room-manager.ts` — resolves the compiled bundle before spawn.
- `tools/server/src/stories/story-health.ts` — compile probe at boot.
- `tools/server/tests/sandbox/story-bundler.test.ts` — real-path test per rule 12a.
- `tools/server/tests/sandbox/story-cache.test.ts` — cache miss / hit / mtime-invalidate / corruption paths.

The acceptance gate (`tools/server/tests/sandbox/deno-engine-integration.test.ts`) is 5/5 GREEN against this pipeline with real Deno + real `dungeo.sharpee`.

## References

- **Brainstorm**: `docs/brainstorm/multiuser/overview.md` (Running Untrusted `.sharpee` on the Server, Filesystem posture).
- **Phase 4 Remediation plan**: `docs/work/multiuser/plan-20260424-multiuser-server-phase4-remediation.md` (Option D1, the architecture documented here).
- **Root assessment**: `docs/work/multiuser/root-assessment.md` (§3.1, §4 Decision 17).
- **Parent ADR**: `docs/architecture/adrs/adr-153-multiuser-sharpee-server.md` (specifies the sandbox spawn and the opaque save blob protocol this pipeline sits under).
- **Amendment to parent**: `docs/architecture/adrs/adr-153a-multiuser-server-amendments.md` (clarifies Decision 1's permission phrasing, adds Protocol Invariants).
