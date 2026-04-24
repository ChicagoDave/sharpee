# ADR-153a: Multiuser Server — Phase-4 Amendments

## Status: PROPOSAL

## Date: 2026-04-24

## Relationship to ADR-153

This is an **addendum** to ADR-153 (Multiuser Sharpee Server), not a replacement. ADR-153 remains the authoritative reference for the fifteen core decisions of the multiuser server. The decisions in ADR-153 are not re-litigated here; they stood up to Phase 0–4 contact with reality and remain correct.

What this addendum does:
- **Clarifies** phrasing in ADR-153 Decision 1 that turned out to be ambiguous at implementation time ("Deno with `--allow-none`" was shorthand, not literal).
- **Names** operational invariants that the implementation upholds but the original ADR did not enumerate (spawn-error handling, turn timeout, log-before-broadcast, synthetic opening scene, save-shape constraint).
- **Cites** new methodology rules (CLAUDE.md rule 12a "Integration Reality" and rule 7b "Co-Located Wire-Type Sharing") that apply to this system and were absent when ADR-153 was written.
- **Cross-references** two new ADRs that capture decisions ADR-153 implied but did not specify (ADR-155 for the install-time story compilation pipeline; ADR-156 for the browser client).

What this addendum does *not* do:
- Does not overturn any of ADR-153's fifteen core decisions.
- Does not revise the interface contracts (server↔sandbox or browser↔server) — those remain correct.
- Does not restate ADR-153 content; readers should read ADR-153 first, then this addendum for the deltas.

ADR-153 is kept as the historical record and the primary reference. A reader starting cold should read ADR-153 in full, then this document as the "what changed when this met reality" layer.

## Trigger

Phase 4 of the multiuser server implementation (Deno Sandbox Integration — Engine Subprocess and Turn Execution) was declared complete on 2026-04-19 with a carve-out. A room was created on `play.sharpee.net` on 2026-04-23 and no story ran: the phase's load-bearing deliverable was the piece carved out. The 2026-04-24 Phase 4 Remediation arc (sub-phases 4-R-1 through 4-R-3) closed the gap and surfaced the ambiguities that this addendum now captures.

The full assessment is at `docs/work/multiuser/root-assessment.md`. This addendum is the ADR-level precipitate of that assessment.

## Amendments

### A1. Decision 1 phrasing: "--allow-none" is posture, not literal

**Original phrasing** (ADR-153 Decision 1):

> The Deno process is launched with permissions equivalent to `--allow-none`: no filesystem, no network egress beyond the platform control plane, no environment access, no subprocess spawning.

**What reality required**: Deno must read its entrypoint and the bundle module graph from disk to run at all. A strict `--allow-none` literal spawn cannot even import the compiled host bundle. The actual posture is narrow `--allow-read` scoped to the two specific paths Deno needs (the compiled bundle and the story file).

**Revised phrasing** (authoritative):

> **Security posture**: the Deno subprocess has no access to the server's stateful surfaces (database, other rooms' saves, other stories' bundles, `/etc`, any other path outside the two paths it is explicitly granted). It has no network, no write, no environment, no subprocess, no run, no ffi.
>
> **Permission surface** (how the posture is expressed):
> ```
> deno run --allow-read=<compiled_bundle_path>,<story_file_path>
>          --v8-flags=--max-old-space-size=256
>          <compiled_bundle_path>
> ```
> The container is the outer boundary (a compromise inside Deno cannot escape the container). Deno's permission flags are the inner boundary against rogue story code.

The word "none" is replaced with an explicit posture + surface pair. Readers reviewing the deploy should see the `--allow-read` flags and understand they are the narrow, named expression of the "no access to server state" intent — not a contradiction of it.

**Rationale**: "no filesystem access" always meant "no access to anything important." The literal `--allow-none` reading was an artifact of terse phrasing, not an architectural constraint. The file descriptor used to read the bundle is not a security surface; the DB connection, other rooms' saves, and cross-story data are — and none of those are reachable under `--allow-read=<two specific paths>`.

### A2. Story runtime loading requires install-time compilation (see ADR-155)

ADR-153 Decision 1 said "the sandbox dynamically imports the bundle (which registers the story with its engine)." This turned out to be not quite possible for reasons detailed in ADR-155: `.sharpee` bundles ship with bare-specifier imports (`@sharpee/stdlib`, etc.) that Deno cannot resolve without a module resolver that the sandbox intentionally lacks.

The install-time re-bundling pipeline that resolves this is **ADR-155 (Install-Time Story Compilation Pipeline)**. It introduces:

- `story-bundler.ts` — in-process esbuild invocation producing a self-contained Deno-runnable ESM.
- `story-cache.ts` — mtime-keyed cache at `/data/stories-compiled/<slug>.host.js`.
- Boot-time story health probe that compiles every installed story and fails rooms whose story does not compile.
- Hand-maintained plugin enumeration in the generated host.

The sandbox's `spawnSandbox` takes the already-compiled bundle path. The runtime never compiles; compilation is install-time or boot-time only.

**Docker image change**: esbuild is now a runtime dependency in `tools/server/package.json`. `/data/stories-compiled/` is a persistent volume alongside `/data/db` and `/data/stories`.

See ADR-155 for full detail. This amendment names the gap and points to the ADR that closes it.

### A3. Protocol Invariants (new subsection under Interface Contracts)

ADR-153's Interface Contracts section specifies the message shapes but does not enumerate the operational invariants the server↔sandbox channel upholds. The implementation upholds all of the following; any violation is a bug.

1. **Spawn-error surfacing.** Any failure at spawn time (missing Deno binary, permission error on the bundle path, kernel-level `EACCES` / `ENOENT`) emits a `crash` event with a diagnosable stderr payload, not an uncaught exception on the server process. `SandboxProcess` MUST attach `child.on('error', ...)` to translate spawn-time errors into the crash channel.
2. **Turn timeout is server-enforced.** `room-manager` tracks `inflightTurnId` with a per-turn timer (default 10 seconds, operator-configurable). If the sandbox does not emit OUTPUT within the timeout, the server emits an `error` frame to the room, marks the sandbox for teardown, and clears the inflight state. Recovery is a sandbox respawn on the next command; the most recent save is offered via RESTORE.
3. **Synthetic opening scene is the server's responsibility.** After the sandbox emits READY, the server submits a synthetic `look` on the room's behalf and broadcasts the resulting OUTPUT as the initial story frame. The event log records this synthetic command with a `participant_id: null` marker (system-emitted). Without this wiring, rooms render "Waiting for the story to begin…" indefinitely.
4. **Log append precedes broadcast.** Every state-mutating WS message writes its corresponding row to `session_events` **before** the broadcast frame goes out on the room's subscriber set. A crash mid-broadcast is survivable (clients re-sync via `welcome`). A crash mid-log-append would leave the broadcast referencing state the log doesn't have, which is not survivable — and so cannot happen.
5. **Auto-save events are filtered from the next turn's buffer.** Engine-emitted `platform.save_requested` and `if.event.save_requested` events produced during an auto-save between turns must not leak into the next turn's event-based detection. The sandbox-side filter strips them from the `events[]` array in the OUTPUT frame when they originate from server-requested auto-save, not from story code.
6. **`createSandboxRegistry(factory)` is a DI seam, not a SUT substitution seam.** The factory parameter is permitted for unit tests that drive rejection paths the real sandbox cannot induce (timeouts, malformed frames, crash-before-READY, sandbox-timeout, save-ID mismatch, corrupt blob). It MUST NOT be the subject of an acceptance test. Acceptance tests drive a real Deno subprocess via `spawnSandbox` with no factory substitution — gated on `SHARPEE_REAL_SANDBOX=1`. This implements CLAUDE.md rule 12a for this system.

### A4. Save-shape constraint

ADR-153 Decision 10 says "Persisted as opaque blobs in server-side SQLite." This remains correct **at the server level**. What was underspecified is the constraint at the sandbox serialization boundary.

**Constraint**: the engine's `ISaveData` shape that the sandbox serializes on SAVE MUST be JSON-clean: plain objects, arrays, primitives (string, number, boolean, null). No `Map`, `Set`, `Date` instances, `BigInt`, `Buffer`, typed arrays, or class instances. A future engine change that introduces any of these is a **breaking change for the multiuser save path** and MUST be caught by a regression test at the sandbox seam.

**Serialization path**: `engine.createSaveData() → JSON.stringify → base64 → SAVED { save_id, blob_b64 }`. Reverse on RESTORE. The server stores and returns the base64 bytes verbatim.

The byte-identical round-trip test in `deno-engine-integration.test.ts` catches corruption and framing drift; it does not catch shape drift if the serialized shape happens to survive `JSON.stringify → JSON.parse` lossily (e.g., a `Date` becomes a string silently). If the engine team introduces a non-JSON-clean type into save data, a dedicated shape-assertion test at the sandbox seam becomes required.

### A5. Testing posture — CLAUDE.md rule 12a

ADR-153's Test Specifications section enumerates E2E, boundary, and negative-path tests but does not forbid stubbing an owned dependency. This enabled Phase 4 to ship with a stub Deno subprocess passing "end-to-end" tests that exercised nothing of the real runtime. The incident is documented at `docs/work/stub-antipattern.md` and the rule is now CLAUDE.md rule 12a **Integration Reality**.

**This addendum binds the server to rule 12a**:
- The Deno subprocess spawn path is an OWNED dependency. Real-path test: `tools/server/tests/sandbox/deno-engine-integration.test.ts`, gated on `SHARPEE_REAL_SANDBOX=1`, exercises the production spawn path with no factory substitution.
- The SQLite repository layer uses a real `better-sqlite3` driver against an in-memory database in every test; no mocked repository adapter is acceptable for acceptance coverage.
- The HTTP and WS layers have tests against a live Node server bound to an ephemeral port.
- The install-time bundler (ADR-155) has a real-path test against a real `.sharpee` bundle and a real esbuild invocation.
- The `SandboxSpawnOptions.binary` / `.args` override fields were removed in sub-phase 4-R-3. `sandboxOverride.binary` / `sandboxOverride.args` no longer exist; grep audit of `tools/server` returns zero matches for `sandboxOverride`, `stubSandbox`, `fakeSandbox`, `stub-sandbox\.mjs`, `fake-sandbox`, `STUB_SANDBOX_PATH`.

**CI enforcement**: a follow-up plan installs Deno in GitHub Actions and runs `SHARPEE_REAL_SANDBOX=1` against any PR touching `tools/server/src/sandbox/**` or `tools/server/tests/sandbox/**`. Until that wiring exists, rule 12a is enforced by dev-host discipline and the grep audit, not by CI.

### A6. Wire-type sharing — CLAUDE.md rule 7b

The browser client imports the server's wire types directly from `tools/server/src/wire/primitives.ts` and `tools/server/src/wire/browser-server.ts` via relative path. This is CLAUDE.md rule 7b **Co-Located Wire-Type Sharing** in action.

**Sub-invariant**: `src/wire/primitives.ts` is runtime-neutral. It contains no `Buffer`, no `fs.Stats`, no `DOMException`, no Node-only or browser-only types. The motivating incident was a `Save { blob: Buffer }` type in an earlier layout that broke the client build when co-located with wire types; the refactor extracted wire primitives to their own file with the "no runtime-specific types" invariant documented in the header.

**This addendum binds the server to rule 7b**: any wire type change happens in the single source file both sides import. No duplication, no regeneration, no codegen, no "keep these in sync" comments. The client's `tsc --noEmit` fails in the same commit as a breaking server-side wire change.

### A7. Browser client architecture — ADR-156

ADR-153's Consequences section says "Client framework choice is still open." That thread is closed by **ADR-156 (Multiuser Browser Client)**, which promotes the four load-bearing client-side decisions: location at `tools/server/client/`, four-phase hydration state machine, public discovery surface (listing active rooms), and title-required drift from Decision 3.

ADR-156 is the client counterpart to this addendum. Together they capture the deltas from the brainstorm + plans that rose to ADR significance.

### A8. Room discovery surface (spec expansion of Decision 3)

ADR-153 Decision 3 says joining is "by URL or raw join code" and implies rooms are private to whoever has the code. The browser client (per ADR-156) adds a public landing-page listing of active rooms. This is a spec *expansion*, not a contradiction: the join model is unchanged, discovery is widened.

**What leaks to the public listing** (per ADR-156): `room_id`, `title`, `story_slug`, `participant_count`, `last_activity_at`. Never: `join_code`, tokens, display names, event-log content, save metadata.

**Definition of "active"**: ≥1 participant with `connected = 1`. Pinned-empty rooms are excluded from the listing but remain reachable by code.

Title therefore becomes public user content, subject to operator moderation. Plan 05 (`docs/work/multiuser-client/plan-20260422-multiuser-client-05-polish.md`) introduces a `reports` table + admin CLI for takedown.

See ADR-156 Decision 3 for full treatment. This amendment names the spec expansion on the server side.

## Summary of Referenced Artifacts

| Artifact | Purpose |
|---|---|
| ADR-155 | Install-time story compilation pipeline (resolves A2). |
| ADR-156 | Browser client architecture (resolves A7, provides full treatment of A8). |
| CLAUDE.md rule 12a | Integration Reality — testing discipline (binds A5). |
| CLAUDE.md rule 7b | Co-Located Wire-Type Sharing (binds A6). |
| `docs/work/multiuser/root-assessment.md` | Full assessment from which this addendum is drawn. |
| `docs/work/stub-antipattern.md` | The methodology gap writeup that motivated rule 12a. |
| `docs/work/multiuser/plan-20260424-multiuser-server-phase4-remediation.md` | The remediation arc that surfaced A1–A5. |

## Consequences

### Positive

- **ADR-153 is preserved as the historical record.** No in-place edits, no rewriting-with-footnotes. Readers coming in cold read ADR-153 first, then this addendum, and get the full picture chronologically.
- **The system's actual posture is documented.** A new contributor reading just ADR-153 will get the strategic direction correctly, but might be confused when the Dockerfile shows `--allow-read` flags. Reading this addendum clarifies the posture+surface distinction.
- **ADRs are now cross-consistent.** ADR-155 and ADR-156 close the two "open" threads ADR-153 left (sandbox load mechanic and client framework). Together the three documents are a complete map.
- **Methodology hooks are explicit.** Rules 12a and 7b are named as binding on this system, not just abstractly in CLAUDE.md. A future amendment to either rule has a clear touch-point on this ADR.

### Negative / Acknowledged Trade-offs

- **Three-document read-order is required for full understanding.** ADR-153 → ADR-153a → ADR-155/156. A future reader reading only ADR-153 will be 90% correct but miss the nuances in A1–A8. Acceptable — a single rewritten ADR-153-v2 would be cleaner to read linearly but would lose the historical context of "what did we learn by building it?"
- **Addenda can accumulate.** If Phase 5, 6, etc. each produce an ADR-153b, 153c, the compound grows unwieldy. The rule going forward: additive ADRs (like ADR-155, ADR-156) are preferred over further addenda to 153 unless the delta is strictly a clarification or invariant-naming against ADR-153's decisions.

### Neutral

- **Status cascade.** ADR-153's Status remains PROPOSAL (matching the repository convention for implemented ADRs until explicitly superseded). This addendum is also PROPOSAL. ADR-155 and ADR-156 are PROPOSAL. No ADR in this family is ACCEPTED under the repository's current status model; that convention is orthogonal to this amendment.

## References

- **Parent**: `docs/architecture/adrs/adr-153-multiuser-sharpee-server.md`.
- **Cross-references**: `docs/architecture/adrs/adr-155-install-time-story-compilation.md`, `docs/architecture/adrs/adr-156-multiuser-browser-client.md`.
- **Source assessment**: `docs/work/multiuser/root-assessment.md`.
- **Remediation plan**: `docs/work/multiuser/plan-20260424-multiuser-server-phase4-remediation.md`.
- **Methodology rules**: CLAUDE.md rule 12a (Integration Reality), rule 7b (Co-Located Wire-Type Sharing).
