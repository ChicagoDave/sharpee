# Multiuser Sharpee — Root Assessment

**Created**: 2026-04-24
**Scope**: What the original ADR/brainstorms for the server (ADR-153) and the browser client (brainstorm + Plans 01–05) decided, what the implementation surfaced as gaps, and what a single ADR written today would say instead.
**Status**: Assessment document, not an ADR itself. Flags the ADRs that should be promoted or amended.

---

## 0. Why this document exists

The multiuser work has now crossed Phase 4 and its remediation arc. The Deno sandbox finally drives a real engine against a real story bundle; the stub apparatus is gone; the acceptance gate is GREEN. Along the way, the following kinds of surprises surfaced:

- **A phase could pass its tests without exercising the thing the phase was named after.** The stub-under-test anti-pattern.
- **The architectural statement "Deno with `--allow-none`" was ambiguous** in a way that only bit at implementation time. The ADR's intent was "no access to the server's stateful surfaces"; a strict literal reading was "zero file descriptors ever." The literal reading is impossible; the intended reading requires narrow `--allow-read`.
- **The `.sharpee` format assumed the consumer was the browser.** Loading one under Deno required install-time re-bundling, a component the ADR did not anticipate.
- **Several client-side commitments** (public listing surface, required title, theme system, state-hydration contract, package location) were *not* in ADR-153 at all — they landed in the client brainstorm and Plan 01, and constitute real architectural decisions.
- **The ADR's own acceptance tests** did not forbid stubbed runtimes, which is precisely how a "carve-out" became load-bearing.

The question this document answers: **given what we now know, what would a single ADR written from scratch say about multiuser Sharpee?** And separately, which parts should be promoted to their own ADRs versus folded into a revised ADR-153?

This is not a rewrite. It is an assessment.

---

## 1. What ADR-153 Got Right (and should stay)

The following commitments have held up across Phase 0–4, remediation, and the client planning pass. They should be carried forward intact.

1. **Rooms are the primitive, not accounts.** Every downstream decision (token scope, save timeline, event log, privacy boundary, delete cascade) is cleaner because of this single choice. The "no accounts" downstream consequence is real, has been acceptable for every observed scenario, and removed an enormous amount of work.
2. **Durable session tokens, scoped to the room URL.** No reconnection complexity appeared that wasn't foreseen. Losing the token = losing the role; acceptable and consistent.
3. **Four-tier role hierarchy with strict one-level-down promotion and PH-only demotion.** No proposed widening has come up in practice; the demotion-friction argument held.
4. **Cascading succession invariant.** Specified carefully enough in the ADR that the client plans could implement it without re-deriving the state machine. The "always at least one PH + one successor so long as ≥2 people" invariant is load-bearing and should be preserved verbatim in any rewrite.
5. **Lock-on-typing with live preview as the product differentiator.** This is what distinguishes the platform from "prettier Discord." No reason to revisit.
6. **Room chat + PH↔Co-Host DM axis only.** The narrow DM scope continues to look correct; the moderation-discussion justification hasn't been contradicted. Plan 04 implements it as specified without scope pressure to widen.
7. **Mute, no kick.** No regrets surfaced.
8. **Unified append-only `session_events` table.** Single-table design survived all phases; every event kind has a natural payload; export / replay / moderation audit all fall out for free. Consider this one *especially* validated.
9. **Server-side SQLite with WAL; opaque save blobs.** No friction. `better-sqlite3` was the right call; repository pattern is clean; migrations work.
10. **Docker as the canonical deployment artifact.** Single-image, single-port, operator-fronts-with-their-proxy. Phase 12 shipped this; no architectural objection to anything in its shape.
11. **Hono + bare `ws` + `better-sqlite3` + raw parameterized SQL.** Every framework choice has carried its weight. No "oh, we should have used X instead" moments.
12. **Recording transparency as a first-class UI element.** The REC indicator is now mockup-through-implementation, and the "DMs are not exempt" language is load-bearing for moderator-accountability arguments.
13. **Pin / 14-day recycle / type-to-confirm delete.** Lifecycle is clean; the type-to-confirm pattern survived the UX pass.
14. **Desktop-only posture.** Has not caused friction; no pressure to revisit in MVP.
15. **No filesystem access** (as intent — see §3 for the nuance). Save/restore through opaque-blob API at a server-mediated boundary: still correct, and the JSON+base64 serialization seam is real.

None of these need amending. If ADR-153 were rewritten, these fifteen threads would reappear largely unchanged.

---

## 2. What Actually Shipped — System Shape Post-Remediation

A short snapshot for readers coming in cold.

**Server** (`tools/server/`):
- Hono HTTP app with room-create, room-list, story-list, CAPTCHA-verify, `/r/:code` deep-link, static-file middleware for the SPA, SPA fallback.
- Bare `ws` WebSocket adapter with per-room topic routing, reconnect-with-token, full `ClientMsg`/`ServerMsg` discrimination.
- `better-sqlite3` + forward-only migrations + 5-table schema (`rooms`, `participants`, `session_events`, `saves`, `config`) + repository layer with prepared statements.
- `SandboxRegistry` + `SandboxProcess` (spawns a real Deno subprocess) + message framing over stdio + install-time story bundler (`story-bundler.ts`, `story-cache.ts`).
- `deno-entry.ts` now loads a real esbuild-produced host+story bundle, bootstraps `@sharpee/engine`, drives the turn loop, emits real OUTPUT / SAVED / RESTORED / EXITED frames.
- Role and succession enforcement, cascading succession on PH disconnect, 5-minute grace timer, mute persistence, idle recycle sweeper with per-process lock, type-to-confirm delete cascade.
- Acceptance gate test (`deno-engine-integration.test.ts`) currently GREEN against a real Deno binary on the dev host.

**Client** (`tools/server/client/`):
- React 18 + Vite + TS under `tools/server/client/`, served by the Node server from `/app/public` in the runtime image.
- Landing page (stories + active rooms + create), create-room modal, passcode modal, `/r/:code` deep-link.
- Four Zifmia themes with per-user picker (localStorage `sharpee.theme`, default `modern-dark`).
- Room view: transcript, lock-on-typing input with debounced `draft_delta` emission and live-preview `draft_frame` rendering, copy buttons, recording-transparency notice, participant roster.
- WebSocket reducer + room-state machine with `hydrated` gate.
- Plans 02–05 spec'd but not all delivered as of this assessment (chat, moderation, save/restore UX, DMs, polish are in varying states of wired).

**Deployed**: `play.sharpee.net` running behind Apache + Certbot on David's Ubuntu VM.

**Known pending**: AC-4R.2 — a Docker image with the new 4-R-2 install-time bundler plus the 4-R-3 stub apparatus removal needs to be built and smoke-tested against a real dungeon opening scene in the live container. This is the one pending user action.

---

## 3. Gaps and Lessons the ADR and Plans Missed

This is the meat of the assessment. Each item names something that implementation surfaced as either (a) a real ambiguity in ADR-153, (b) a real ambiguity in the client brainstorm, or (c) a real piece of load-bearing architecture that exists now and should be documented but isn't yet.

### 3.1 Story runtime loading is not "just dynamic import"

**What the ADR said**: "The Deno subprocess loads a small TypeScript entry module that … dynamically imports the bundle (which registers the story with its engine)."

**What reality required**: `.sharpee` bundles are esbuild outputs produced with `--external:@sharpee/*`, so every `@sharpee/stdlib`, `@sharpee/world-model`, etc., import is a bare specifier. Under Deno, there is no package resolver to satisfy those specifiers — a direct `import()` of the bundle fails at the first bare-specifier line.

Fixing this required a whole new component: an **install-time re-bundler** (`story-bundler.ts`) that esbuilds a generated host module + the extracted `story.js` + the full `@sharpee/*` graph into a self-contained ESM, cached by story slug + source mtime at `/data/stories-compiled/<slug>.host.js`. The sandbox spawns Deno against the compiled artifact, not against the raw `.sharpee` bundle.

**Why this matters**: the server now has a runtime *compilation* responsibility. That responsibility has invariants:
- Source mtime on `.sharpee` → cached compiled bundle must be refreshed before the next spawn.
- Compilation failure must surface as a room-create-time error, not as a spawn-time crash.
- The compiled bundle is part of the installation's state; it lives under a volume mount and persists across container restarts.
- Plugin enumeration is hand-maintained for now (the bundler imports `@sharpee/plugin-npc`, `@sharpee/plugin-scheduler`, `@sharpee/plugin-state-machine` by name; additional plugins that a future story needs will fail at bundle time until added).

An ADR written today would call out the install-time bundler as a named component with its own invariants, not fold it into "Phase 4 sandbox integration."

### 3.2 "Deno with --allow-none" was shorthand, not literal

**What the ADR said** (Decision 1): "The Deno process is launched with permissions equivalent to `--allow-none`: no filesystem, no network egress beyond the platform control plane, no environment access, no subprocess spawning."

**What reality required**: Deno has to read its entrypoint from disk. The `--allow-none` literal posture means Deno can't even import the compiled bundle. The actual spawn command is:

```
deno run --allow-read=<compiled_bundle_path>,<story_file_path>
         --v8-flags=--max-old-space-size=256
         <compiled_bundle_path>
```

The posture is still "no write, no network, no env, no subprocess, no run, no ffi" — but `--allow-read` is narrowly scoped to the two specific paths Deno must read. The capability model is preserved; the ADR's literal framing was not.

**Why this matters**: the ADR's phrasing made reviewers who don't deploy the thing think "zero file descriptors." An operator reading the deployment doc would be confused when the container spec reveals `--allow-read` flags. The intent — "no access to the server's stateful surfaces (DB, other rooms' saves, cross-story data, `/etc`)" — should be stated directly, with the `--allow-read` narrowing documented as the implementation-level expression of that intent. The container boundary (no escalation out of the sandbox process) is the outer line; the permission flags are the inner line against rogue story code.

An ADR written today would separate **security posture** (what is prohibited) from **permission surface** (what is narrowly permitted), and would not use the unqualified word "none."

### 3.3 The acceptance tests didn't forbid fiction

**What the ADR said** (Test Specifications section): "Each repository method gets unit tests against an in-memory SQLite database. Each HTTP handler gets tests for the happy path and the expected 4xx paths." E2E-1 says "the harness asserts … current engine state (queried via a test-only introspection hook) equals the pre-destructive-command state."

**What the ADR did not say**: that the system under test on the sandbox side had to be the real Deno binary running the real engine. The phrase "test-only introspection hook" is itself a signal — acceptance tests shouldn't need back-channels into the engine's state; they should exercise the engine through its public surfaces.

**What reality exposed**: Phase 4 shipped with a Node echo-script (`stub-sandbox.mjs`) impersonating a Deno subprocess. Every Phase 4 test passed against the stub. The `sandboxOverride.binary`/`args` escape hatch in `SandboxSpawnOptions` was introduced specifically to permit this substitution. The tests were GREEN; the integration was untested; `play.sharpee.net` served a room that never ran a story.

The remediation arc (4-R-1, 4-R-2, 4-R-3) removed the escape hatch, replaced the stub tests with real-sandbox tests gated on `SHARPEE_REAL_SANDBOX=1`, and added the `deno-engine-integration.test.ts` acceptance gate that refuses stub values (title ≠ `(stub)`, blob > 500 chars, events > 0, serialized text > 200 chars, save/restore round-trip byte-identical).

**Why this matters**: the methodology gap has been closed in DevArch. CLAUDE.md rule 12a ("Integration Reality") now requires an **Integration Reality Statement** before declaring an integration-named unit of work complete — OWNED vs. EXTERNAL dependencies enumerated, a REAL-PATH TEST named for each OWNED entry, STUB JUSTIFICATION required for any stubbed OWNED dependency, and the explicit rule *"the system under test cannot be the thing you wrote to stand in for the system under test."* The rule also mandates fixing the test harness (ephemeral sandbox, seeded DB, test container) rather than swapping in a stub when "real is too hard."

The remaining obligation inside ADR-153 is **not** to re-state the rule — it's to apply it. An amended ADR-153 cites CLAUDE.md rule 12a in its acceptance criteria and names the real-path tests that satisfy it (Deno subprocess spawn, SQLite repository layer, HTTP/WS bind). That plus the 4-R-3 cleanup (grep-audit-clean for `sandboxOverride|stubSandbox|fakeSandbox|stub-sandbox\.mjs|fake-sandbox|STUB_SANDBOX_PATH` under `tools/server`) is what enforcement looks like on this system specifically.

### 3.4 The public listing surface is not in ADR-153

**What the ADR said**: "Joining is by URL or raw join code. Both are always visible in the room UI with copy buttons." The framing was "rooms are private to whoever has the code; the listing surface doesn't exist."

**What the client brainstorm added**: a landing page at `https://{instance}/` showing all **active** rooms (≥1 currently-connected participant) with room title, story slug, participant count, and an "Enter room" button that opens the passcode modal. The join still requires the code; but room *existence* is now publicly visible.

This is a real spec deviation. It is load-bearing for the client's discovery UX (otherwise the landing page is either dead or a code-entry form with no list, which is worse than nothing), but it introduces privacy-surface expansion the ADR didn't enumerate:
- A room's title is now public — the PH authored it knowing only the room roster would see it under ADR-153 framing, but under the actual deployment, anyone reaching the instance URL sees it.
- `participant_count` is a live signal of activity per room.
- `last_activity_at` is exposed (though less sensitive).

Plan 01 notes this and flags it as an open question; Plan 05 covers the moderation hooks for inappropriate titles. But there is no ADR entry for:
- What fields are public vs. private (`join_code` never, title always, participant count always).
- What the definition of "active" is (at least one `connected=1` participant; this excludes pinned-but-empty rooms).
- Who decides title moderation policy (operator config vs. a `reports` table + CLI).

An ADR written today would call this out as a first-class decision: **"Rooms have a public discovery surface. What leaks to that surface, and what never does, is the privacy invariant."**

### 3.5 Client package location is architectural (type-sharing is now methodology)

**What the ADR said**: "Client framework choice is still open. The decision here covers the server; the browser client's framework (React, Svelte, Solid, vanilla, etc.) is a separate question, addressed by a future ADR or design doc."

**What the client brainstorm + `techstack.md` decided**:
- React 18, Vite, TypeScript, all four Zifmia themes.
- Location: `tools/server/client/` — *not* `packages/multiuser-client/`, *not* a Zifmia fork. The decisive rationale was that `tools/server/` is already outside `pnpm-workspace.yaml` (the workspace is for reusable libraries; this is product-coupled client for one server).
- Type-sharing via **direct relative import** of `tools/server/src/wire/primitives.ts` from the client's TS project. No package publish, no mono-repo boundary crossing.
- Build integration: Dockerfile has a client-builder stage that `npm ci && npm run build` inside `client/`, then the runtime stage `COPY`s `dist/` to `/app/public`.

**The type-sharing piece is now DevArch methodology.** CLAUDE.md rule 7b ("Co-Located Wire-Type Sharing") requires any client+server in the same repo under the same typed language to share wire types via direct import, and mandates the runtime-neutrality sub-invariant on the shared file (no `Buffer`, no `fs.Stats`, no `DOMException`). The `src/wire/primitives.ts` refactor that emerged from Phase 4's Docker-build incident is the canonical instance. ADR-156 does not need to restate this rule — it cites rule 7b and moves on.

**The package-location piece is still architectural**:
- The client is **not a reusable library**. It is a specific frontend for this specific server. If someone else writes a Sharpee multiuser server, they write their own client. The `packages/` exclusion is deliberate.
- The Docker image is the unit of version coupling. No client-old-server or server-old-client skew to plan for.
- A future contributor seeing `tools/server/client/` and thinking "this should be a package" would be making a real mistake — one the repo structure alone doesn't prevent. That's the ADR content.

### 3.6 Client state hydration is its own contract

**What the ADR said**: "Reconnection: on `hello` with a valid token, the server replies with a fresh `welcome` carrying a `RoomSnapshot` (including the current lock holder, current save list, mute state, participant roster). The client re-derives its view from the snapshot rather than assuming its pre-disconnect state is still current."

**What reality added**: a specific client state machine with four states — *connecting*, *hydrated*, *closed*, and *error* — where the UI renders distinct views for each. The 2026-04-23 React error #310 was a symptom of hooks placed after conditional early returns for these states; the fix hoisted the hooks, but the underlying architectural point is:

- **`welcome` is not just a payload; it is a state transition.** The room view has pre-hydration and post-hydration modes. Components inside the room view must either (a) render conditionally on hydration state *above* all hooks, or (b) branch internally on hydration.
- **`room_closed` is a terminal state.** Any UI that the client can be in when `room_closed` arrives must immediately transition. No "closed but still accepting input" intermediate.
- **`error` is recoverable by UX, not by the reducer.** A WS drop triggers `connecting`; a `room_closed` makes recovery impossible; a `kind: 'error'` message (from the server) is a toast, not a state transition.

An ADR written today would specify the client's hydration contract alongside the server's `welcome` payload, because they are two ends of the same state wire.

### 3.7 Operational invariants that weren't stated

Several invariants exist now in the code that weren't in the ADR:

- **Spawn failures must surface as `crash` events.** `SandboxProcess` originally lacked `child.on('error', ...)`, so a missing Deno binary (the first Phase 4 test against a real binary) crashed the server with an uncaught exception. The fix added the handler; the invariant is "anything that can go wrong at spawn time is a crash event, not a process death."
- **Auto-save between turns must be filtered from the next turn's event buffer.** The Zifmia save/restore discussion notes that `platform.save_requested` and `if.event.save_requested` events emitted during auto-save would poison the next turn's event-based detection. Present in the code; not in the ADR.
- **Synthetic initial `look` is the server's responsibility.** ADR-153 said nothing about opening-scene text. In practice, `room-manager` submits a synthetic `look` after the sandbox emits `READY`, and the resulting OUTPUT is broadcast as the initial story frame to the first participant. If this wiring broke, the room would render the "Waiting for the story to begin…" empty state indefinitely.
- **Turn timeout is server-enforced.** `room-manager` tracks `inflightTurnId` with a timer; if the sandbox doesn't emit OUTPUT inside the timeout, the server emits an error to the room and the sandbox is marked for teardown. The ADR's protocol section mentions `CANCEL` but doesn't name the timeout as a required invariant.
- **Event log append precedes broadcast.** Every state-mutating WS message writes to `session_events` before the broadcast frame goes out. A crash mid-broadcast is survivable; a crash mid-log-append is not, because the broadcast would reference state the log doesn't have.

An ADR written today would have an **Invariants** section distinct from the Decisions and Atomicity sections, enumerating each of these.

### 3.8 Save serialization is not format-neutral

**What the ADR said**: "Save blobs are opaque to the server — it stores the bytes and hands them back verbatim on RESTORE."

**What reality clarified**: the engine's save-data is serialized via `JSON.stringify` → base64 before leaving the sandbox, and the reverse on RESTORE. This is fine as long as the engine's `ISaveData` shape is JSON-serializable — plain objects, arrays, primitives. It is **not** fine if a future engine change introduces `Map`, `Set`, `Date`, `BigInt`, `Buffer`, or class instances; `JSON.stringify` silently mangles or drops those.

The opacity claim at the server level is correct. But at the sandbox serialization boundary, the shape constraint is real. The remediation plan flagged this; no acceptance test validates it beyond the byte-identical round-trip test (which only catches corruption, not shape drift).

An ADR written today would name the serialization seam and the format constraint it imposes on the engine's save shape. If the engine adds a `Map` to its save data, the multiuser save path will break silently until someone notices the round-trip fails for content that depends on what was in the Map.

### 3.9 CI does not run the real sandbox

**What the ADR implied**: test coverage is the primary acceptance discipline.

**What reality requires**: Deno on the test host. The acceptance gate (`deno-engine-integration.test.ts`) only runs under `SHARPEE_REAL_SANDBOX=1` with Deno installed. GitHub Actions CI does not have Deno installed today, which means the gate doesn't run in CI — only on dev hosts that have it.

This is not a flaw in the ADR but it is a real gap in the testing posture. An ADR written today would include a **CI posture** section:
- CI installs Deno and runs `SHARPEE_REAL_SANDBOX=1` on every PR touching `tools/server/src/sandbox/**` or `tools/server/tests/sandbox/**`.
- Non-sandbox tests run under the normal `SHARPEE_REAL_SANDBOX` absence to preserve fast iteration.

Until this is wired, the No-Stub-Under-Test rule is enforced by the dev host and the grep audit, not by CI — which means a regression could land if nobody ran it locally.

### 3.10 Title is required, and the ADR said it wasn't

**What the ADR said** (Flow: Creating a Room, Step 3): "Room title — free-text, shown to joiners … Required or optional is a small UX choice; keep optional with a generated fallback (e.g. `{story-name} — {date}`) to avoid blocking the flow."

**What Plan 01 decided**: title is **required**, non-empty after trim, ≤80 chars. Empty title → server-side validation error on `POST /api/rooms`.

This was driven by the landing-page listing — a room without a title is meaningless in a list. The ADR's permissive framing assumed title was only consumed inside the room, where a generated fallback sufficed. The listing surface changed the calculus.

This is a small drift but it's a real one. An ADR written today would make title required and explain why (listing surface depends on it).

---

## 4. What an ADR Written Today Would Say

If the original ADR-153 were replaced — as a single document, not three — this is the shape it would take. Decisions 1–15 are carried over from ADR-153 with only the clarifications noted in §3. Decisions 16–24 are new.

### Carried over (from ADR-153, with clarifications)

1. **Server-side engine execution with Deno sandbox isolation.** Each active room gets its own Deno subprocess. Security posture is "no access to the server's stateful surfaces, no network, no write, no env, no subprocess, no run, no ffi." Permission surface is `--allow-read=<compiled_bundle>,<story_file>` with `--v8-flags=--max-old-space-size=256`. The posture and the surface are documented together; neither alone is complete.
2. **No filesystem access to server state from the story runtime.** Save/restore routes through the server via the opaque-blob API.
3. **Rooms are the primitive, not accounts.** (Unchanged.)
4. **No user accounts; durable session tokens per-room.** (Unchanged.)
5. **Four-tier role hierarchy with strict promotion discipline.** (Unchanged.)
6. **Cascading succession invariant.** (Unchanged.)
7. **Lock-on-typing input model with live preview.** (Unchanged.)
8. **Room chat + PH↔Co-Host DMs only.** (Unchanged.)
9. **Mute is the moderation hammer; no kick.** (Unchanged.)
10. **Room-scoped saves; auto-named; server-side SQLite.** (Unchanged.)
11. **Unified append-only session event log.** (Unchanged.)
12. **14-day idle recycle; PH-only pin; PH-only delete.** (Unchanged.)
13. **Desktop/laptop browsers only.** (Unchanged.)
14. **Docker as the canonical deployment artifact.** Expanded: the image now includes esbuild at runtime for install-time story bundling (see Decision 17).
15. **Framework and library choices.** (Unchanged. Hono / bare `ws` / `better-sqlite3` / raw parameterized SQL + repositories.)

### New

16. **Room discovery surface is public by default; join remains code-gated.** The landing page at `/` lists all rooms with at least one currently-connected participant. The listing exposes `room_id`, `title`, `story_slug`, `participant_count`, `last_activity_at`. It never exposes `join_code` or participant tokens. Titles are therefore user-content subject to operator moderation (Plan 05's `reports` table + admin CLI). Empty rooms — even pinned, even inside the PH 5-minute grace — do not appear on the public list; they still exist server-side and accept reconnects.

    **Privacy invariant**: join remains code-gated; listing is discovery, not authentication. The "code is the credential" framing from Decision 4 is preserved.

17. **Install-time story compilation pipeline.** When a `.sharpee` file lands in `/data/stories/`, the server compiles it to a self-contained Deno-runnable ESM at `/data/stories-compiled/<slug>.host.js` via an in-process esbuild invocation. Compilation is re-run on source mtime advance; spawns always read from the compiled cache, never from the raw `.sharpee`. Compilation failure is a room-create-time hard error, never a spawn-time crash. Plugin enumeration in the bundler's generated host is hand-maintained (explicit list per supported story); a future story with new plugin requirements fails at bundle time with a clear error, not at runtime.

    **Operator-facing**: zero change. Drop file, play. The `stories-compiled` directory is a persistent volume alongside `/data/db` and `/data/stories`.

18. **Store opaque save blobs; require engine save-data to be JSON-serializable.** The sandbox serializes `ISaveData` via `JSON.stringify → base64`; the server stores the bytes verbatim. The engine's save shape must therefore be JSON-clean: no `Map`, `Set`, `Date` instances, `BigInt`, `Buffer`, or class instances in save data. A future engine change introducing one of these is breaking for the multiuser save path and must be caught by a regression test at the boundary. The server-level opacity is preserved; the shape constraint lives at the sandbox seam.

19. **Client lives at `tools/server/client/`.** Not a workspace package. Not a Zifmia fork. React 18 + Vite + TypeScript. Docker image coupling ensures client and server versions are always matched; no skew strategy needed. Wire-type sharing between client and server follows CLAUDE.md rule 7b (direct import from `src/wire/primitives.ts` + `browser-server.ts`, runtime-neutral types only) — this is methodology, not ADR content.

    **Consequence**: the multiuser client is **not** a reusable library. A future alternate client (native desktop, screen-reader-first text client, etc.) imports the wire types the same way, but it is its own tool, not a package a third-party repo would consume.

20. **Client state hydration is contract-level.** The room view distinguishes four client states: *connecting*, *hydrated*, *closed*, *error*. `welcome` is the transition from connecting→hydrated; `room_closed` is the transition to terminal-closed; a WebSocket drop is connecting-again, not a state loss. Any component inside the room view that reads hydration-dependent state must do so *after* hooks are declared at the top of the component, never inside a conditional early return. (This prevents the React error #310 class of bugs.)

21. **Synthetic opening scene comes from the server.** After the sandbox emits `READY`, the server submits a synthetic `look` on the room's behalf and broadcasts the resulting OUTPUT as the initial story frame. The event log records this synthetic command with a `participant_id: null` marker (system-emitted, not user-typed). Without this, rooms render "Waiting for the story to begin…" indefinitely and the engine's opening-room text never reaches participants.

22. **Turn timeout is server-enforced and part of the protocol surface.** `room-manager` holds `inflightTurnId` with a per-turn timer. If the sandbox does not emit OUTPUT within the timeout (default 10s, operator-configurable), the server emits an `error` frame to the room, marks the sandbox for teardown, and clears the inflight state. Recovery is via sandbox respawn (next command spawns a fresh subprocess) with the most recent save offered via RESTORE.

23. **Integration seams are tested via CLAUDE.md rule 12a.** The methodology rule is already in effect: every OWNED dependency has a named REAL-PATH TEST; STUB JUSTIFICATION is required for any stubbed OWNED dependency and must reference the real-path test that backs it. For the multiuser server specifically, the real-path tests are: `deno-engine-integration.test.ts` (Deno subprocess spawn, gated on `SHARPEE_REAL_SANDBOX=1`), in-memory `better-sqlite3` repository tests (real driver, not a mock), and live-server HTTP/WS tests on an ephemeral port. The `createSandboxRegistry(factory)` DI seam is permitted only for unit tests driving rejection paths the real sandbox cannot induce (timeouts, malformed frames, crash-before-READY) and must not serve as an acceptance gate.

24. **CI posture.** The CI pipeline installs Deno and runs `SHARPEE_REAL_SANDBOX=1` against any PR touching `tools/server/src/sandbox/**` or `tools/server/tests/sandbox/**`. Non-sandbox changes skip the gated suite to preserve iteration speed. Without CI running the gate, rule 12a's REAL-PATH TEST requirement relies on dev hosts and manual discipline; CI wiring closes that loop.

---

## 5. Recommended ADR Splits

If this assessment were turned into concrete ADR work, two new ADRs land plus an amendment to ADR-153. The third proposal from an earlier draft of this assessment (a methodology ADR for No-Stub-Under-Test) is **not needed** — that rule is already in CLAUDE.md as rule 12a "Integration Reality," closed by DevArch before this assessment was written. ADR-153's amendment cites rule 12a rather than restating it.

### ADR-155 — Install-Time Story Compilation Pipeline

Covers Decision 17 in detail. The bundler's invariants, the cache's mtime contract, the plugin-enumeration policy, the failure modes (operator drops a malformed `.sharpee`, esbuild throws, bundle exceeds a size threshold, etc.), the volume layout (`/data/stories-compiled` alongside `/data/stories`), and the boot-time probe that validates every installed story still compiles.

This is a named component with its own concerns; folding it into an ADR-153 revision would make that ADR too broad.

### ADR-156 — Multiuser Browser Client

Covers Decisions 19 and 20 in detail, plus the theme system, the CAPTCHA widget integration seam, the router stance (hand-rolled vs. React Router), the Vite dev-proxy posture, and Plan-05-level polish commitments. This ADR also formalizes the **public listing surface** (Decision 16) since it is primarily a client concern.

The ADR's core load-bearing content is four items: package-location rationale (Decision 19), hydration state contract (Decision 20), public listing surface + privacy invariant (Decision 16), and title-required drift from ADR-153. Wire-type sharing is *not* in this ADR — it's CLAUDE.md rule 7b. The ADR cites 7b where relevant and does not restate it.

The client is large enough and product-specific enough that it deserves its own architectural memo. The current brainstorm + `techstack.md` + Plan 01 collectively serve that role informally; an ADR promotes them.

### ADR-153 amendment

Strip Decision 1's "--allow-none" literal phrasing; replace with the posture+surface pair from §4 Decision 1. Add a "Protocol Invariants" subsection under Interface Contracts covering §3.7. Add a "Recording/Privacy" subsection referencing ADR-156's listing-surface decisions. Add a short "Save shape constraint" note under §Save/Restore. Cite CLAUDE.md rule 12a in the acceptance-criteria section and name the real-path tests that satisfy it (Decisions 23–24 become implementation of the rule, not a restatement of it).

Alternatively, rewrite ADR-153 in full as "ADR-153 v2" and mark v1 historical. Preference is for amendment — the 15 carried-over decisions are correct and the rewrite would churn for churn's sake.

(Note: ADR-154 is already assigned to the Sharpee-IDE concept; the two new proposals here start at 155.)

---

## 6. Residual Risks and Open Questions

Flagged for future sessions; not blocking MVP.

### Architectural

- **Sandbox crash budget.** No policy today for "this sandbox keeps crashing on every command." Current behavior: next command respawns. A rogue story could loop crash→respawn indefinitely. Post-MVP: a per-room crash-counter with cooldown and an operator-surfaced bad-story flag.
- **Engine save-data shape drift.** No regression test enforces the JSON-serializability constraint. If the engine team adds a `Map` or `Date` to save data, the multiuser path breaks silently.
- **Plugin auto-discovery.** Bundler's explicit plugin list is a maintenance burden. The alternative — parsing `story.js` for its imports — is clever-but-fragile. Holding pattern is fine; worth revisiting when the second and third stories ship.
- **Multi-story instances.** Current testing is dungeo-only. `cloak-of-darkness` and other small canonical stories as bundler shakedowns would catch plugin-graph gaps early.
- **Bundle size.** Dungeo bundled is ~2–3 MB. Larger stories with more plugins will grow. No concrete ceiling yet.

### Operational

- **Docker image now includes esbuild.** Runtime image size has grown. Not a blocker; worth watching.
- **`DENO_DIR` inside the container.** The 4-R-2 risk flagged this: Deno writes a module graph cache that isn't on the `--allow-read` list (it's `--allow-write` implicitly for its own cache). Needs to point to an ephemeral container dir, not a volume, and not something inside the `--allow-read` set.
- **AC-4R.2 Docker smoke test is pending.** The code side is GREEN; the deploy-to-`play.sharpee.net` verification is the user's pending action. Until done, the integration is proven at the unit+integration level but not at the container+live-URL level.
- **CI needs Deno.** Acceptance gate doesn't run in GitHub Actions today. A `.github/workflows/` PR is the follow-up.

### Client

- **Plans 02–05 are not fully delivered.** Chat, moderation, save/restore UX, DMs, and polish are in varying states. Each closes specific ADR-153 acceptance criteria; no ordering changes since Plan 01 closed AC1.
- **CAPTCHA widget standardization.** Current `play.sharpee.net` runs `captcha.provider: none`. A real provider (Turnstile leaning) needs a widget wrapper and operator-config docs. Not an ADR decision — an implementation follow-up.
- **Title moderation for public listings.** Plan 05's `reports` table + admin CLI is the v0.1 answer; a self-service takedown flow is post-MVP.
- **Accessibility.** Plan 05's SR/VoiceOver pass hasn't been executed. The architectural hedge — keeping the state layer free of React-component-tree concerns — was kept in Plan 01, so a sibling text client remains cheap to retrofit.

### Methodology

- **`pattern-recurrence-detector` has not been run against the full session archive.** The stub anti-pattern is now named; running the detector across old summaries would confirm whether it has surfaced under other names. Recommended before the next major plan cycle.
- **`integration-reality-check` agent is not built.** The `docs/work/stub-antipattern.md` doc proposes it as the durable fix beyond the CLAUDE.md rule. Open methodology work.

---

## 7. Mapping — where each gap in §3 gets addressed

| §3 gap | Where the fix landed | Where the doc lives (or should) |
|---|---|---|
| 3.1 Story-runtime loading | `src/sandbox/story-bundler.ts`, `story-cache.ts`, `deno-entry.ts` rewrite | ADR-155 (proposed) |
| 3.2 Deno permissions phrasing | Spawn args in `sandbox-process.ts`; remediation plan confirms Option B | ADR-153 amendment |
| 3.3 Acceptance tests forbidding fiction | `deno-engine-integration.test.ts` + 4-R-3 stub removal | CLAUDE.md rule 12a (already closed) + ADR-153 amendment citing it |
| 3.4 Public listing surface | `tools/server/src/http/routes/list-rooms.ts` + Landing page | ADR-156 (proposed) |
| 3.5 Client location | `tools/server/client/` outside the workspace | ADR-156 (proposed) |
| 3.5 Wire-type sharing | Relative imports of `src/wire/*.ts` with runtime-neutral invariant | CLAUDE.md rule 7b (already closed) |
| 3.6 Client hydration contract | `tools/server/client/src/state/` reducer + Room.tsx hydration gate | ADR-156 (proposed) |
| 3.7 Operational invariants | `child.on('error')` handler, save-event filter, synthetic `look`, turn timeout, log-append-before-broadcast | ADR-153 amendment (Invariants subsection) |
| 3.8 Save serialization shape | Sandbox-side JSON+base64 at SAVE/RESTORE | ADR-153 amendment (Save shape note) |
| 3.9 CI without Deno | Not yet addressed | CI follow-up plan |
| 3.10 Title required | `create-room.ts` title validation (Plan 01 Phase 2) | ADR-156 (proposed) |

---

## 8. What this means for the next session

Three observations:

1. **Phase 4 is the last "integration risk" phase on the server.** After AC-4R.2 closes (Docker smoke test on `play.sharpee.net`), the remaining server work is Plans 02–05's server backing (chat persistence, DM tabs, save-list endpoints) which is well-understood append to existing patterns.

2. **The next planning cycle should promote two ADRs** (155 for bundler, 156 for client) and amend 153. Two methodology rules from this arc are already closed in CLAUDE.md — rule 12a (Integration Reality) and rule 7b (Co-Located Wire-Type Sharing). ADR-153's amendment and ADR-156 both cite those rules rather than restating them; ADR-156 in particular shrinks to four load-bearing decisions (location, hydration, listing surface, title-required). These can be done in either order.

3. **The client plans (02–05) have a clean runway.** The Phase 4 remediation arc cleared the load-bearing uncertainty at the sandbox seam. Client work from here is straightforward product development within the architectural boundaries this assessment names.

---

**End of root assessment.** This document does not commit to any of the ADR proposals — it scopes them. The next decision is whether to promote ADR-155 / 156, amend ADR-153, or fold everything into a single ADR-153-v2 rewrite. The recommended path (promote two, amend one) keeps each document narrow enough to be reviewed independently and keeps ADR-153 itself as the system's central reference document. Two methodology rules this work surfaced (12a Integration Reality, 7b Co-Located Wire-Type Sharing) are already in CLAUDE.md and do not need their own ADRs; the project-level ADRs cite them where relevant.
