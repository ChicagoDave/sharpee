# ADR-164: Stateless Multi-User Server — Channel I/O on a Per-Turn Worker

## Status: ACCEPTED (revised 2026-04-29)

## Date: 2026-04-28 (original concept) — 2026-04-29 (revised: split from ADR-163; this ADR is now the downstream multi-user consumer of the platform wire)

## Builds on

- **ADR-163** (Channel-Service Platform) — establishes the universal
  channel-I/O wire (`hello` / `cmgt` / `turn` / `command`), the
  `@sharpee/channel-service` package, the ten engine-sourced standard
  channels, the per-channel emit policy, ADR-101 media folding, and
  the test gates against CLI and platform-browser. This ADR adds the
  multi-user-specific decisions on top of that wire.

## Replaces

- **ADR-153** (Multiuser Sharpee Server) — per-room Deno subprocess +
  stateful WS protocol.
- **ADR-153a** (Phase-4 Amendments) — transitive (addendum to a
  replaced ADR).
- **ADR-156** (Multiuser Browser Client) — four-phase client state
  machine (`connecting/hydrated/closed/error`) and `welcome` /
  `OUTPUT` / `RESTORED` snapshot streaming.
- **ADR-162** (World-Model Replication) — full-world `toJSON()` push
  every turn; per-room read-only mirrors on server and client.

## Carries forward unchanged

- **ADR-161** (Persistent Identity) — `{id, handle, passcode}` triple
  is orthogonal to the engine model.
- **ADR-129** (ScoreLedger) and engine internals.
- The save-blob serializer (`world.toJSON()` / `world.loadJSON()`
  from commit `bf9b9564`) — the only per-room server-side state under
  this ADR.
- HTTP routes for identity, room create, room list (the surface from
  ADR-153 minus the `/connect` WS endpoint).
- Server-side state that is *not* engine state: chat history,
  presence, draft-typing locks, room metadata.

## Context

ADR-163 settles the universal wire shape: every Sharpee surface
speaks `hello` / `cmgt` / `turn` / `command` packets, produced by
`@sharpee/channel-service`. Single-user surfaces (CLI, platform-
browser) use it via in-process function calls. The multi-user
surface needs additional decisions on top of that wire: where does
engine state live between turns, how do workers serve turns, how do
mid-session joins work, what additional channels exist for chat /
presence / per-room broadcast.

ADR-153 placed a long-running `GameEngine` inside a per-room Deno
subprocess; commands streamed in over stdin/stdout, narrative
streamed back, and ADR-162 layered on a full `world.toJSON()` push
every turn so clients could mirror the world.

Three problems compounded:

1. **WS reconnect is structurally fragile.** Per-room in-memory
   engine state means any connection blip risks state loss; the
   client must resync the full mirror after every reconnect (see
   Phase 4 of the 2026-04-28 e2e session — 60% flake under parallel
   load).
2. **Save / restore is dormant code.** The path that loads
   `ISaveData` into a fresh engine only runs when a player clicks
   Save. The bug fixed in `0ea2ba9f`
   (`engine.executeTurn('restore')` blocked by
   `restoringAction.validate()` because the multi-user sandbox
   doesn't populate `sharedData.saves`) had been latent for weeks
   because no automated turn exercised that code path.
3. **Wire bandwidth is dominated by a mirror nobody asked for.**
   Every turn carried the entire world snapshot so the client
   *could* render anything, but in practice the client renders a
   status line, prose, and a chat panel. The wire was shaped for
   capability, not need.

The `tools/server` directory has been removed from `main` and
preserved on `legacy/tools-server`. The brainstorm at
`docs/brainstorm/stateless-multiuser/overview.md` captured the
exploration that led to this ADR.

## Decision

**The multi-user server holds no engine state in memory between
turns. Each command loads the room's saved blob, runs the engine
in-process (Node), snapshots back, emits a sparse channel-I/O packet
to subscribers, and discards the engine. Save and restore are on the
hot path — every turn is a restore.**

Seven constituent decisions follow.

### 1. Engine runs in-process (Node) — no Deno subprocess

Sharpee public instances run admin-installed well-known story
bundles only. There is no untrusted-code threat model. The Deno
boundary is not load-bearing.

The engine, world model, and language packages run inside the same
Node process as the HTTP server. `tools/server/src/sandbox/` and the
`deno-entry.ts` mechanism are deletable. Per-turn cost drops from
~150–300 ms (Deno cold spawn) to ~5–20 ms (in-process load +
execute).

If untrusted bundles ever become a goal, a worker pool (Deno-per-
turn, or a Node `worker_threads` pool with capability isolation) can
be reintroduced as the per-turn execution surface without changing
the wire or the channel model. The pivot is reversible at the
worker boundary.

### 2. Per-room state lives entirely in the save blob

The room's only server-side engine state is its current saved blob
in the DB. There is no `engine_state` cache, no in-memory
`WorldModel`, no sticky-session routing. Any worker can serve any
room's next turn.

The per-turn lifecycle:

```
load-blob → execute → snapshot → emit → discard
```

A worker that retains a `WorldModel` reference past the end of a
turn is a bug. Crash recovery is automatic: a turn that crashes
throws away the *worker's* engine; the next turn reloads the most
recent saved blob.

### 3. Three server-sourced channels added to the platform set

ADR-163 defines ten engine-sourced standard channels. The multi-
user server registers three more during init, alongside the
platform standards:

| ID             | Type | Mode    | Source | Notes                                                                          |
| -------------- | ---- | ------- | ------ | ------------------------------------------------------------------------------ |
| `chat`         | json | append  | server | `{ from, text, ts }` — server-only                                             |
| `presence`     | json | replace | server | Roster — server-only                                                           |
| `command_echo` | json | append  | server | `{ actor_handle, text, ts }` — every command broadcast to all room subscribers |

All three register `emit: 'always'`, matching the platform standard
pattern. They are populated **after** `produceTurnPacket` returns,
via the merge-after pattern documented in ADR-163 §12: the
multi-user server holds the per-room chat history, current
presence roster, and current-turn command list as ordinary
server-side state, then merges them into the platform-produced
payload before the packet is written to the transcript and
broadcast.

```ts
const platformPacket = produceTurnPacket({
  textBlocks, events, world, prevValues
});

const turnPacket = {
  ...platformPacket,
  payload: {
    ...platformPacket.payload,
    chat:         newChatEntries,
    presence:     currentRoster,
    command_echo: commandsThisTurn,
  },
};
```

This keeps the platform API free of any multi-user-specific shape;
ADR-163 doesn't know what `chat` / `presence` / `command_echo` are.

`command_echo` carries every player command, including the issuing
player's own. The client decides whether to render its own commands
(usually yes, for transcript fidelity) or suppress them and rely on
a local input echo. Broadcast-to-all-subscribers is the wire-level
guarantee.

A multi-user installation thus exposes 13 standard channels in
total: ten platform-defined plus three server-defined.

### 4. Transcript is a world-model capability

To make mid-session join work without a separate `turn_packets`
table, the transcript of channel packets is stored as a world-model
capability:

- After each turn, channel-service writes the produced packet into
  the room's `transcript` capability via
  `world.updateCapability(...)`.
- `world.toJSON()` captures the transcript as part of the snapshot
  automatically; `world.loadJSON()` restores it.
- The engine never reads the transcript capability — it is purely
  consumer-side state, written by channel-service and consumed by
  the wire.
- The transcript can be reset, truncated, or replayed without
  affecting world correctness.

This also supplies the `prevValues` source for ADR-163's per-channel
emit policy: a sparse-emit channel's previous value is recoverable
from the most recent transcript entry containing that channel's
key. The server does not maintain a separate `prevValues` cache.

### 5. Mid-session join — network repaint

The multi-user surface is the **network repaint** case from
ADR-163 §14. Every client connection — first join, reconnect,
browser refresh, or new arrival to an in-progress room — receives
the same treatment:

1. Client sends `hello` (per ADR-163 §2).
2. Server emits `cmgt` filtered by the client's declared
   capabilities.
3. Server iterates the room's `transcript` capability in turn
   order and re-emits each stored packet as a `turn` packet
   **exactly as it was originally** — no flag, no transformation.
4. The live stream resumes after the last historical packet.

The renderer cannot distinguish historical from live packets and
does not need to. The re-emission identity invariant from ADR-163
guarantees that re-emitted packets produce output identical to
their original live emission, and ADR-163 §4 guarantees that
event-mode channels are not persisted (so they do not refire on
replay). Together these handle every renderer-correctness concern
without protocol additions.

The `transcript` capability is what ADR-163 §14 calls the
"persisted packets." Because it lives inside `world.toJSON()`,
load/restore of the room recovers the transcript automatically,
and any worker that loads the save can serve a connecting client
without sticky-session routing.

### 6. Per-turn write ordering — wire emit follows DB commit

Order per turn, strict:

1. Engine produces `ITextBlock[]` and `DomainEvent[]` from the
   command.
2. Channel-service computes the turn packet via
   `produceTurnPacket(...)`.
3. Channel-service writes the packet into the transcript
   capability.
4. `world.toJSON()` serializes the snapshot.
5. DB commit writes the snapshot to the room's save row.
6. Wire emit broadcasts the packet to subscribers.

**Crash semantics:**

- A crash between (3) and (5) loses the in-progress packet, which
  is correct: the world was not actually saved, so no client
  observed the turn. The next command from the player reloads the
  prior saved blob and re-executes (idempotent for read-only
  commands; for state-mutating commands the player resends and the
  engine re-runs from the saved baseline).
- A crash between (5) and (6) leaves the save committed but no wire
  emit. The next turn's `transcript`-driven recovery path replays
  the missed packet on the next subscriber action (or on a
  reconnect via decision 5).
- A crash mid-DB-commit is the storage layer's concern; the worker
  treats a partial commit as failure and discards the in-progress
  state.

This ordering is the load-bearing reason transcript writing happens
*before* DB commit (step 3 before step 5): the snapshot must
contain the packet that is about to be emitted, so a reconnect can
recover it.

### 7. Save-blob format bumps to v3

The `transcript` capability is the only new field in v3.

- **v2 saves load under v3** with an empty transcript capability.
  No exception, no auto-delete. The first turn after upgrade
  populates the transcript from that point forward.
- **No auto-delete of legacy saves.** Per CLAUDE.md memory
  (`feedback_save_format_versioning`), the next save-format change
  uses a version reader rather than a hard break — this v2 → v3
  bump is the first exercise of that policy.

## Invariants

- **No engine state in memory between turns.** Every turn is
  `load-blob → execute → snapshot → emit → discard`. A worker that
  retains a `WorldModel` reference past the end of a turn is a bug.
- **Save-blob is the only per-room server state.** The DB row
  carrying the most recent save *is* the room. No shadow caches, no
  in-memory world maps.
- **Transcript is consumer-side state.** The engine never reads the
  transcript capability. The transcript can be reset, truncated, or
  replayed without affecting world correctness.
- **Wire emit follows DB commit.** A turn packet is broadcast only
  after the snapshot containing its transcript entry has been
  committed. (Decision 6.)
- **Replayed packets carry `replay: true`; live packets do not.**
  The renderer keys event-mode suppression on this flag.
- **Single writer per room per turn.** A worker holds an exclusive
  lease on the room while executing a turn; another worker cannot
  start the same room's next turn before the previous turn's DB
  commit lands. Lease mechanism is implementation-defined (DB row
  lock, advisory lock, queue).
- **Server-sourced channels never come from the engine.** The
  engine produces nothing on `chat`, `presence`, or `command_echo`;
  they are populated exclusively from `serverContext` / `command`
  inputs to `produceTurnPacket`.

## Acceptance Criteria

1. **AC-1 — Stateless per-turn lifecycle.** A test forces a worker
   crash mid-turn (after engine execute, before DB commit). The
   next turn from any worker reloads the prior saved blob and
   produces correct output. No state leaks between turns; no
   sticky-session routing required.

2. **AC-2 — Three server-sourced channels in CMGT.** A multi-user
   server's CMGT manifest includes `chat`, `presence`, and
   `command_echo` (in addition to the ten platform standard
   channels), each registered with `emit: 'always'` and the
   correct mode (`append`, `replace`, `append`).

3. **AC-3 — Transcript capability round-trip.** Produce 3 turns of
   packets into a room. Save (`world.toJSON()`). Load into a fresh
   `WorldModel` (`world.loadJSON()`). Assert the transcript
   capability matches the original 3 packets exactly.

4. **AC-4 — v2 save loads under v3.** Load a fixture v2 save (no
   transcript field). Assert no exception. Assert
   `world.getCapability('transcript')?.entries === []` (or
   equivalent empty representation). Run a turn; assert the new
   packet is appended to the now-non-empty transcript.

5. **AC-5 — Mid-session join replay.** Produce 5 turns into a
   room. Connect a second client (different capabilities than the
   first). Assert it receives `cmgt` (filtered for its
   capabilities), then 5 `turn` packets each carrying `replay:
   true`, then the live stream resumes. Verify event-mode channels
   in the replayed packets do not trigger renderer side effects on
   the new client.

6. **AC-6 — Per-turn write ordering.** Two crash-injection tests:
   - **(a) Crash between transcript-write (step 3) and DB commit
     (step 5).** Assert the prior save is unchanged, no wire emit
     occurred, and the next turn re-executes from the prior
     baseline correctly.
   - **(b) Crash between DB commit (step 5) and wire emit (step
     6).** Assert the save is committed, the missed packet is
     present in the transcript, and a subscriber that connects
     after the crash receives the missed packet via mid-session
     replay.

7. **AC-7 — Per-turn cost.** The in-process engine load-execute-
   save loop completes in under 50 ms (p95) on the Dungeo story
   for a representative command (`look`). Recorded in the
   implementation plan; not a hard ceiling but a regression
   baseline.

8. **AC-8 — Horizontal scaling.** Two worker processes serve
   interleaved turns for the same room (T1 → worker A, T2 →
   worker B, T3 → worker A). Assert correctness across the
   sequence. No sticky-session routing required.

9. **AC-9 — WS reconnect is a non-event.** A connected client
   disconnects mid-session and reconnects. Assert it receives
   `cmgt` + transcript replay (per AC-5) and resumes correctly. No
   client-side state-recovery path beyond CMGT + replay is
   required.

10. **AC-10 — Multi-user end-to-end.** Two clients in the same
    room. Each client's command broadcasts to both subscribers
    via `command_echo`. A `chat` send round-trips via the `chat`
    channel to all subscribers. `presence` updates on join and
    leave. Each client's CMGT manifest is filtered for its own
    capabilities (per ADR-163 §11).

## Consequences

**Positive:**

- **Save / restore is the hot path.** Latent bugs in the
  save/restore pipeline become impossible to ignore. The 2026-04-28
  restore-routing bug would not have survived ten minutes of
  fyrevm-style play.
- **WS reconnect is a non-event.** No per-session in-memory state.
  The next command from the reconnected client just kicks the same
  load-execute-save loop.
- **Trivial horizontal scaling.** Any worker can serve any room's
  next turn. No sticky-session routing, no warm-room scheduler.
- **Crash recovery is automatic.** A turn that crashes throws away
  the *worker's* engine; the next turn reloads the most recent
  saved blob. Sandbox crash modal becomes vestigial.
- **Wire bandwidth drops dramatically.** Sparse channel packets vs
  full `world.toJSON()` per turn. Typical turn packet for Dungeo is
  expected to be ~1 KB (vs ~64 KB gzipped under ADR-162).
- **One serializer for two paths.** Save and per-turn snapshot use
  the same `world.toJSON()`; one source of bugs, not two.
- **Transcript is free.** Storing the transcript inside the world
  blob avoids a separate `turn_packets` table and the migration
  schema that comes with it.

**Negative:**

- **Per-turn engine instantiation cost.** ~5–20 ms in-process.
  Bounded; tracked in AC-7. Mitigated by Node v8 JIT warm path.
- **Save size grows with transcript.** ~1 KB/turn after gzip;
  1000-turn session ≈ 1 MB save. Acceptable for typical IF session
  length; long-session truncation policy is a future decision (see
  Open Questions).
- **Renderer parity loss vs ADR-162.** ADR-162's "renderer queries
  the world like Zifmia does" pattern goes away in the multi-user
  client. The status line, future map / inventory panels are now
  driven by channel values, not by `world.getEntity(...)` calls.
  Equivalent expressiveness via custom `json` channels per ADR-163
  §13.
- **One-shot cutover.** The live `play.sharpee.net` instance's
  existing rooms and saves are wiped on deploy. Per CLAUDE.md
  memory ("server admin owns lifecycle"), this is an explicit
  non-goal of backwards compatibility for the running instance;
  the v2 → v3 save format upgrade in decision 7 is the only
  compatibility surface we preserve.
- **Per-turn write ordering is load-bearing.** The transcript-
  before-commit ordering must be preserved by every code path that
  produces a turn packet. A code path that emits to the wire
  before the DB commit is a correctness bug, not a performance
  bug.

## Resolved Implementation Choices

- **Engine isolation surface**: in-process Node. No subprocess. No
  Deno. Worker boundary deferred until untrusted bundles are a
  goal.
- **Wire framing**: JSON-encoded `CmgtPacket` and `TurnPacket` over
  WebSocket. (Wire shape is transport-agnostic per ADR-163; HTTP
  request-response can carry single-room turns if a future client
  prefers it.)
- **Server-sourced channel registration**: at server init, after
  the platform standards, before any room CMGT is produced.
- **Transcript storage**: world-model capability, captured by
  `toJSON()`.
- **Mid-session replay marker**: `replay: true` flag on `turn`
  packets emitted from the transcript capability.
- **Save format version**: v3. The v2 → v3 bump is additive
  (transcript capability is the only new field). No auto-delete.
- **Per-turn write ordering**: transcript write → snapshot → DB
  commit → wire emit (decision 6).
- **Lease mechanism**: implementation-defined (DB row lock,
  advisory lock, or queue). Decision belongs to the implementation
  plan.

## Open Questions for Implementation

- **Saves UX.** Under stateless every turn produces a save. The
  player-facing "Save" button now *names* a blob that already
  exists. Open: keep the named-saves UX, or replace with "rewind
  one turn / N turns"? Affects the saves-table schema and the Save
  UI component; does not affect channel-service or the wire.
- **Long-session transcript truncation.** A 10,000-turn marathon
  session would carry a ~10 MB transcript. Policy options: cap by
  turn count, cap by byte size, drop oldest packets, snapshot-and-
  forget after N turns, or do nothing. Affects the multi-user
  client's mid-session join experience for marathon sessions but
  not channel-service or the wire.
- **Lease implementation.** DB row lock with `SELECT ... FOR
  UPDATE`, Postgres advisory lock, in-process queue, or external
  message broker? Affects horizontal scaling characteristics
  (single-node lock vs cross-node lock). Decide during
  implementation based on the deployment target.
- **Worker pool sizing.** Number of concurrent turn workers, queue
  depth, backpressure policy. Tuning concern, not architectural.

## Constrains Future Sessions

- **No untrusted bundles.** This ADR explicitly rests on the trust
  boundary that admin-installed stories are safe to run in-process.
  A future ADR that opens public story uploads must reintroduce a
  worker boundary; the wire and channel model continue to work
  unchanged on the other side of that worker.
- **Transcript capability ownership.** Channel-service writes; the
  engine never reads. Future capabilities that need transcript data
  must read it via the same world-model API
  (`world.getCapability`), not via a side channel from
  channel-service.
- **No engine state between turns.** Any future feature (long-
  running NPC scheduler, background timer, etc.) that wants to
  carry state between turns must serialize that state into the
  world model. There is no out-of-band server-side scratch space.
- **Save-blob is the only per-room state.** Adding a parallel
  per-room state surface (a side table, a key-value cache keyed on
  room id) breaks the single-source-of-truth invariant that makes
  horizontal scaling and crash recovery work. Future ADRs that
  propose such a surface need explicit invariant relaxation.
- **Per-turn write ordering.** The transcript-before-commit-
  before-emit sequence is invariant. Reordering for performance
  (e.g., parallelizing the wire emit and the DB commit) requires
  an ADR.

## References

- ADR-163: Channel-Service Platform — universal wire and author-
  controlled media. The platform this ADR consumes.
- ADR-165: Renderer Architecture — consumer-side contract used
  by the multi-user web client. Same interfaces as single-bundle
  surfaces; only the transport differs.
- ADR-153 (REPLACED): Multiuser Sharpee Server.
- ADR-153a (REPLACED): Phase-4 Amendments.
- ADR-156 (REPLACED): Multiuser Browser Client.
- ADR-162 (REPLACED): World-Model Replication.
- ADR-161: Persistent Identity (carries forward).
- `docs/brainstorm/stateless-multiuser/overview.md` — D1–D8
  decisions and the longer rationale that produced the original
  ADR-163 (combined platform + multi-user); the multi-user-specific
  D1, D2, D7 decisions live in this ADR after the split.
- `packages/world-model/src/world/WorldModel.ts:208-209` —
  `toJSON` / `loadJSON` (the only per-room state carrier under this
  ADR).
- `legacy/tools-server` (origin branch) — preserved ADR-153 / 156 /
  162 implementation; reference for HTTP routes, identity helpers,
  Playwright e2e patterns.
- Original FyreVM channel I/O design — David Cornelson, 2010-era
  fyrevm-server.

## Session

2026-04-28 main — derived from a session that began as e2e Phase
2–4 implementation, surfaced a structurally fragile reconnect path,
and ended in an architectural pivot. The brainstorm at
`docs/brainstorm/stateless-multiuser/overview.md` captures the
longer exploration. ADRs 153, 153a, 156, and 162 were marked
REPLACED on the same day; the original combined ADR-163 was the
replacement.

2026-04-29 main (revised) — ADR-163 was split into a platform ADR
(channel-I/O wire, channel-service package, ten engine-sourced
standard channels, ADR-101 media folding, CLI + platform-browser
test gates) and this downstream ADR (stateless multi-user server).
The original ADR-164 ("Channel I/O Everywhere — Single-User
Adoption + Author-Controlled Media") was absorbed entirely into the
revised ADR-163, freeing the 164 number for this multi-user-
specific replacement. Zifmia migration is deferred under the
platform ADR; this ADR is unaffected.

2026-05-01 main (spike validation) — the renderer spike at
`spikes/channel-io/` validated the multi-user-relevant pieces of
this ADR: the merge-after pattern for `chat` / `presence` /
`command_echo` (§3) works against the platform's trimmed
`produceTurnPacket` API, and re-emission identity holds for
captured packets replayed to a fresh renderer (the network-repaint
mechanism in §5). No content changes to this ADR are required.
Eight consumer-side gaps surfaced from the spike are addressed in
the platform ADR (ADR-163) and ADR-165 (Renderer Architecture);
none affect the multi-user server's invariants or save-blob shape.
The multi-user web client implements the `Renderer` and
`ChannelRenderer` contracts from ADR-165 the same way single-bundle
surfaces do — only the transport between producer and renderer
differs.
