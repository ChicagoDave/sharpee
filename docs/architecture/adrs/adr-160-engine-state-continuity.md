# ADR-160: Engine-State Continuity for Multi-User Rooms

## Status: PROPOSAL

## Date: 2026-04-25

## Relates to

- **ADR-153** (Multiuser Sharpee Server) — defines the per-room sandbox model. SAVE / RESTORE protocol through `deno-entry.ts` is already in place.
- **ADR-153a** (Amendments) — operational invariants this ADR adds an automatic save/restore loop to.
- **ADR-155** (Install-Time Story Compilation) — story bundles are stable per story version; this ADR's auto-save format embeds the story version it was produced against, so a story upgrade can detect-and-discard rather than load a stale blob into a new bundle.
- **ADR-159** (Persistent User Identity) — the *companion* ADR: identity-recovery is meaningless if the world is at turn 0. Engine-state continuity is meaningless if the user shows up as a stranger. Both must hold for the user-facing promise *"come back to a room you joined before."* The two ADRs are independently designable; identity ships first.
- **Bug context**: Phase 4 (ADR-153) shipped a per-room sandbox that runs only while at least one participant is connected. The session_events log captures transcript text; engine state is in-memory and dies with the process. After last-participant disconnect, the next visit to the room respawns a fresh sandbox at turn 0. ADR-153a documents this behavior; ADR-160 closes it.

## Context

A room's engine state — world model, NPC positions, quest flags, inventory, scheduled events (fuses/daemons), narrative state — lives in memory inside the sandbox process. It is not persisted by any current code path. The only durable engine state is whatever a participant has explicitly typed `SAVE` to produce, and `saves` are not auto-restored.

`sandbox-registry.getOrSpawn(opts)` calls `spawnSandbox(opts)` and returns a fresh entry. `room-manager.spawnFor(room_id)` is the single entry point — it resolves bundle/story paths and calls into the registry. Neither layer queries existing saves before spawning. The crash handler tells humans *"Restore from the last save to continue"* — manual action only. The "RESTORE on respawn" code path does not exist.

The lived consequence: a room is a stable address for participants and their transcript history, but **not for the world**. Engine state is reset by every:

| Trigger                                              | What's lost                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| Last participant disconnects → sandbox idle-reaped   | Everything since the last user-initiated save (often: everything).   |
| Server restart                                       | All sandboxes; all in-flight engine state for all rooms.             |
| Sandbox crash (story bug, OOM, etc.)                 | Everything in the affected room since last save.                     |
| Story bundle update                                  | Existing room can't load — bundle path changes; no migration today. |
| Long gap with no activity (idle reaper triggers)     | Everything since the last save.                                      |

The user-facing promise we want — *"the world is where you left it when you come back"* — is structurally unreachable without a continuity mechanism.

The session_events log already persists *transcript* (commands + outputs as text) and is replayed on every reconnect via `room-snapshot.ts` to give returning users their conversation history. This ADR is the engine-state counterpart: a parallel persistence path for *world state*, structurally equivalent to manual saves but server-managed.

### Design space

Three approaches were considered:

1. **Auto-save on cadence + auto-restore on respawn.** Reuses the existing engine SAVE/RESTORE machinery. Server triggers a SAVE after every turn (or every N turns / on-idle); persists the blob; on next sandbox spawn for that room, sends the latest auto-save's blob via RESTORE before the first user command. Bounded loss: ≤ N turns since last auto-save. No engine API changes.
2. **Replay session_events through the engine.** The transcript log already records every command; replay rebuilds state by re-executing. No new persistence layer. **Rejected** because (a) the engine's behavior is not deterministic without a seeded RNG and stable scheduler ordering, (b) replaying 500 turns to reach turn 501 is unacceptable for a returning user, (c) daemons/fuses fire on real-time triggers that replay can't reproduce without virtual time control, and (d) recorded `output` blocks already contain rendered text; replay would re-generate output that may differ.
3. **Continuous state snapshots / event sourcing.** Engine emits state deltas after every turn; server persists structured deltas; respawn replays the delta stream. Cleanest semantics; opens future capabilities (state inspection, hypothetical branching). **Rejected for v1** because it requires a new engine API (no "delta emit" hook today), a new structured save format, and new validation infrastructure. Disproportionate cost for the goal.

This ADR adopts **Option 1** as the v1 mechanism. Options 2 and 3 are explicitly available as future evolutions if v1 proves insufficient.

## Decision

### Shape

The server **automatically saves the engine state after every completed turn** and **automatically restores from the latest auto-save when a sandbox is spawned for a room with prior history**.

Auto-saves are stored in the same `saves` table as user-initiated saves, distinguished by a new `kind` field. The existing SAVE / RESTORE wire protocol between server and sandbox is unchanged; the auto-save loop is a new server-side caller of the same machinery.

### Storage

The existing `saves` table grows one column. SQLite migration:

```sql
ALTER TABLE saves ADD COLUMN kind TEXT NOT NULL DEFAULT 'manual';
-- 'manual' = user-initiated SAVE
-- 'auto'   = server-initiated auto-save
CREATE INDEX saves_room_kind_created
  ON saves(room_id, kind, created_at DESC);
```

Auto-saves carry the same shape as manual saves (`save_id`, `room_id`, `actor_id`, `name`, `blob`, `created_at`) plus the new `kind` field. Conventions:

- `actor_id` for auto-saves is the literal string `'system'`.
- `name` for auto-saves is `'auto-save @ ' || created_at` (advisory; not user-facing in normal UX).
- `blob` is identical in shape to manual saves — same engine save format, no special handling.

The `kind` column also enables **future explicit pruning policies** without retrofitting a flag.

### Save-format-version field

Engine save blobs carry a `formatVersion` field today (per the engine's existing save serializer). The server records `formatVersion` alongside the blob (extracted from the JSON before `blob_b64` encoding) in a new `saves.format_version` column:

```sql
ALTER TABLE saves ADD COLUMN format_version TEXT;
```

On RESTORE attempt, the server compares the stored `format_version` to the current engine's expected version (advertised by the sandbox in its `READY` frame, which must be amended to include it). If mismatch, the server **does not** send RESTORE — the sandbox boots fresh. The mismatch is logged at WARN level with the room_id and both versions; future tooling can offer admins a migration path. **No silent state loss to the user**: the next welcome frame includes a `notice` block explaining the world has been reset because the story format changed.

### Auto-save cadence

After every completed turn (`OUTPUT` frame received from sandbox + persisted to `session_events`), the server triggers an auto-save:

1. Server generates a new `save_id` (UUIDv4).
2. Sends `SAVE { save_id }` to the sandbox.
3. Sandbox's existing SAVE handler runs `engine.executeTurn('save')`, captures the save data, returns `SAVED { save_id, blob_b64 }`.
4. Server persists `(save_id, room_id, actor_id='system', name='auto-save @ <ts>', blob, created_at, kind='auto', format_version)`.
5. Server prunes auto-saves for that room beyond a retention window (see below).

If the SAVE round-trip takes longer than a configurable threshold (default 250ms), subsequent auto-saves are throttled — at most one auto-save in flight per room. If a save is in-flight when the next turn completes, the new turn's auto-save is queued; if more than one queues up, only the most recent is taken (drop intermediate). User-initiated SAVEs are never throttled or dropped.

If `SAVE` fails (sandbox error, timeout, malformed `SAVED` response), the failure is logged at WARN and the previous auto-save is retained. The next successful turn's auto-save will replace it. Persistent failure is visible in admin logs.

### Auto-restore on sandbox spawn

`room-manager.spawnFor(room_id)` gains a post-`READY` step:

1. Sandbox is spawned (existing behavior).
2. After `READY` frame arrives (already awaited via `entry.ready`), but **before** any user-initiated commands run, the server queries:
   `SELECT save_id, blob, format_version FROM saves WHERE room_id = ? AND kind = 'auto' ORDER BY created_at DESC LIMIT 1`.
3. If a row is found AND `format_version` matches the sandbox's advertised version: server sends `RESTORE { save_id, blob_b64 }`. The sandbox's existing RESTORE handler runs `engine.executeTurn('restore')` and emits `RESTORED { save_id, text_blocks }`. The server records a `kind: 'restore'` event in `session_events` with `actor_id='system'`.
4. If no auto-save exists OR `format_version` mismatches: skip RESTORE; engine boots fresh. If mismatch, log WARN and append a `notice` block to the next welcome frame.
5. Either way, the existing opening-scene look path runs only if no prior `output` events exist in `session_events` (the existing `initialLookDone` guard already handles this).

The auto-restore is **synchronous on spawn** — no welcome frame is sent to a connecting client until restore has completed (or skip-decision is made). This guarantees the welcome's snapshot reflects post-restore state.

### Retention

Per-room: keep the **last 3 auto-saves**. Older auto-saves are deleted after each successful new auto-save:

```sql
DELETE FROM saves
 WHERE room_id = ? AND kind = 'auto' AND save_id NOT IN (
   SELECT save_id FROM saves
    WHERE room_id = ? AND kind = 'auto'
    ORDER BY created_at DESC LIMIT 3
 );
```

Manual saves are never pruned by this loop — only the user (and the admin script per ADR-159) can delete them.

Why 3: enables recovery from "the latest auto-save itself triggered the bug" (revert to N-1 or N-2). One is too few; ten wastes storage on a feature most users will never use.

### Wire protocol change

`READY` frame (sandbox → server) gains a `format_version` field:

```ts
interface ReadyFrame {
  kind: 'READY';
  format_version: string;  // NEW: engine save-format version
  // ... existing fields
}
```

`SAVED` frame already carries `save_id` and `blob_b64`; no shape change. The save blob's JSON includes `formatVersion` already; the server extracts it for the `saves.format_version` column. No new frame types are introduced.

### Failure semantics

| Condition                                                     | Behavior                                                                                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| No auto-save exists (new room, never played a turn)           | Spawn fresh; existing opening-scene look fires.                                                                                   |
| Auto-save exists, format_version matches                      | RESTORE; record `kind: 'restore'` event; next welcome reflects post-restore state.                                                |
| Auto-save exists, format_version mismatch                     | Skip RESTORE; log WARN; next welcome includes a `notice` block: "The story has been updated; this room has been reset to start." |
| Auto-save exists but blob is corrupt (RESTORE fails)          | Sandbox emits an `error` frame; server falls back to next auto-save (one of the retained 3); if all 3 fail, log + spawn fresh.    |
| Sandbox crashes during auto-save (between SAVE and SAVED)     | Auto-save not persisted; previous auto-save retained. The crash itself is handled by existing crash handling.                      |
| Sandbox crashes mid-turn (after command, before OUTPUT)       | No auto-save for that turn; on respawn, restore to previous turn's auto-save. The mid-turn command is lost.                       |
| Story bundle changed between sessions                         | Bundle path changes (per ADR-155 cache); next spawn loads new bundle; format_version mismatch detected on RESTORE attempt.        |
| Concurrent auto-saves for same room (shouldn't happen)        | Throttle ensures at most one in-flight; queued auto-saves drop intermediates.                                                     |

## Consequences

### Positive

- A returning identity (per ADR-159) sees the world as it was at the last completed turn before the room went idle. Engine-state continuity becomes a real architectural promise instead of an aspirational one.
- Existing engine SAVE / RESTORE pipeline is unchanged. The wire protocol gains exactly one field (`format_version` on `READY`).
- Storage growth is bounded: 3 auto-saves per room. For a 1000-room deployment with average save blob ~50KB, total auto-save storage is ~150MB.
- Server restart is now non-destructive of room state — every room respawns with its last auto-save.
- Format-version safety: a story update can't silently corrupt a room. Either the format matches (continue) or it doesn't (visible reset notice).
- Manual saves are unaffected by this loop; the user's "I want to keep this state" intent remains user-owned and unprunable.

### Negative / Cost

- **Per-turn save cost.** Save serialization is non-trivial — Dungeo's full state is several KB to tens of KB of JSON. The throttle keeps this from blocking turn throughput, but a slow save can lag auto-restore freshness.
- **Mid-turn crash loses the in-flight turn.** Acceptable trade vs. the engineering cost of finer-grained checkpointing.
- **No granular auto-save retention policy beyond "last 3".** Some users may want "last 24 hours" or "last 100 turns." Out of scope; a future ADR can add policy if usage shows demand.
- **Server-side throttling adds operational complexity.** A new code path that can drop auto-saves under sustained load. Logged so admins can detect; observability is part of the implementation.
- **Save format is opaque to the server.** Server has no visibility into world state; can't, say, preview a save before restore. Acceptable trade — opaque blobs keep the server out of engine internals.
- **Blob storage in SQLite.** For very large rooms, the BLOB column may strain SQLite. If a room's save approaches 1MB, this needs revisiting (move to filesystem + path reference). Out of scope for v1; flagged for monitoring.

### Constrains Future Sessions

- The engine's save format must remain stable within a `format_version` string. Engine changes that alter the save shape must bump `formatVersion` and accept that all existing room auto-saves become stale (visible reset). The format-version contract is now load-bearing.
- Sandbox `READY` frame gains a required `format_version` field. Sandbox implementations (current Deno, future alternatives) must include it.
- The `saves.kind` column distinction is now part of the data model. Future save-related work (export, share, transfer between rooms) must respect it.
- Auto-restore happens synchronously between sandbox `READY` and the first welcome frame. Latency-sensitive flows that bypassed this gate would need new architecture; today no such flows exist.
- The retention policy ("last 3 auto-saves") is encoded in the auto-save loop; raising or lowering it is a one-line change but is a deliberate decision, not a configuration knob.

### Does Not Constrain

- Manual user SAVE / RESTORE behavior is unchanged. Users who want explicit control still have it.
- Session_events log is unchanged. Transcript replay on welcome is unchanged. The two persistence streams (transcript via session_events; world state via auto-saves) operate independently.
- The decision to keep blobs in SQLite is reversible — if storage growth requires, the `blob` column becomes a path reference and the row gains a content-hash. The retention loop, the format-version check, and the wire protocol all stay the same.
- Story-bundle updates are not blocked by this ADR. Bundles update via ADR-155's pipeline; this ADR detects-and-resets, it does not migrate.
- Future event-sourcing / state-delta evolution (Option 3 from the design space) is not foreclosed. The auto-save mechanism is the v1 implementation of a contract that could be replaced.

## Acceptance Criteria

| ID    | Criterion                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1  | After a turn completes, an `auto` save row appears in `saves` for that room within 1 second under normal load.                                                                                         |
| AC-2  | Last-participant-disconnect → idle reap → returning participant: the welcome frame's room state reflects the last completed turn before disconnect, not turn 0.                                        |
| AC-3  | Server restart: all rooms with prior auto-saves spawn into post-restore state on next access; no room loses world state.                                                                                |
| AC-4  | Three auto-saves per room are retained; the 4th save deletes the oldest.                                                                                                                               |
| AC-5  | A room with a stored auto-save whose `format_version` differs from the current sandbox's advertised version boots fresh; a notice appears in the next welcome's transcript explaining the reset.       |
| AC-6  | Manual SAVE / RESTORE behavior (user-initiated) is byte-identical to pre-ADR behavior; the `kind='manual'` flag is set; manual saves are never pruned by the auto-save loop.                            |
| AC-7  | Sandbox crash mid-turn → next spawn restores the previous turn's auto-save. The crashed turn's command appears in `session_events` but its OUTPUT does not (already current behavior).                  |
| AC-8  | Auto-save throttle: under load (turn time > 250ms), only one auto-save is in-flight per room; intermediate auto-saves are dropped, latest wins.                                                         |
| AC-9  | A corrupt latest auto-save (e.g., manually mangled blob) falls through to the next-most-recent of the retained 3; if all 3 fail, the room boots fresh and logs the failure visibly.                    |
| AC-10 | The `READY` frame from the sandbox includes a `format_version` string that matches the engine's save-format version constant.                                                                          |

## Resolved Implementation Choices

1. **Auto-save cadence.** Per turn, with a throttle (max one in-flight). Default throttle threshold: 250ms. Under sustained slow saves, intermediate auto-saves are dropped.
2. **Retention.** Last 3 auto-saves per room. Manual saves never pruned.
3. **Format-version handshake.** Sandbox advertises `formatVersion` in its `READY` frame; server compares to stored value before RESTORE; mismatch → skip + visible notice.
4. **Storage location.** `saves` table (SQLite BLOB column), same as manual saves. Reversible if size becomes a problem.
5. **Crash recovery scope.** Last completed turn. Mid-turn losses are accepted; finer granularity is out of scope.
6. **Restore timing.** Synchronous between sandbox `READY` and first welcome frame. The first welcome the connecting client sees always reflects post-restore state.

## Migration Plan

Single-phase additive migration:

1. Schema migration: add `saves.kind` and `saves.format_version` columns. Existing rows backfilled to `kind='manual'` and `format_version=NULL` (NULL is treated as legacy and accepted on RESTORE for backward compat with pre-existing manual saves).
2. Sandbox `READY` frame extension: add `format_version` field. Deno-entry already has access to the engine's version constant.
3. Server: implement auto-save loop in `room-manager.ts`'s post-`OUTPUT` path; implement auto-restore in `spawnFor()` post-`READY`.
4. Backfill: existing rooms have no auto-saves. First turn after deploy creates the first auto-save. Existing manual saves continue to work.
5. Observability: log auto-save-failure, format-version-mismatch, and corrupt-blob fallback events at WARN; expose counts via the admin endpoint.

No flag day, no forced reset, no user-visible disruption beyond format-version mismatches (which only happen on real story updates).

## Session

`session-20260425-…-multiuser-identity.md` (ADR-159 + this ADR).
