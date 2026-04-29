# Stateless Multi-User — Overview

**Date opened**: 2026-04-28
**Status**: BRAINSTORM (replaces ADR-156; will land as a new ADR)
**Trigger**: Phase 4 of the Playwright e2e suite surfaced WS-reconnect flake. Investigation traced the flake to fundamental architectural fragility — the multi-user server holds per-room engine state in memory across turns, so any connection blip risks state loss and the save/restore path is dormant code that only runs on explicit player action.

## The pivot in one paragraph

Today's multi-user server (ADR-153) keeps a long-running Deno subprocess per active room, holding a `GameEngine` in memory for the lifetime of the session. Commands stream in and out via stdin/stdout; the world is replicated to clients via the `world.toJSON()` mirror push (ADR-162). The new direction matches David's earlier **fyrevm-server** pattern: the server holds **no engine state in memory** between turns. Per-room state is a saved blob in the DB. Each turn loads the blob, executes one command, snapshots back, emits a small data packet to subscribers, and discards the engine. Save/restore is on the hot path — exercised every turn, not only when a player clicks Save.

## Why this is the right move

1. **Save/restore is the engine load path.** The bug we hit on 2026-04-28 (`executeTurn('restore')` blocked by `restoringAction.validate()` because the multi-user sandbox doesn't populate `sharedData.saves`) wouldn't survive ten minutes of fyrevm-style play, because every turn is a restore. Latent platform bugs in the save/restore path become impossible to ignore.
2. **WS reconnect is a non-event.** No per-session in-memory state to recover. The next command from the reconnected client just kicks the same hot path.
3. **No per-room subprocess RAM cost.** Idle rooms hold zero engine memory. The recycler becomes simpler — there's nothing to recycle except DB rows.
4. **Crash recovery is automatic.** A turn that crashes throws the *worker's* engine away; the next turn loads the most recent saved blob. Sandbox crash modal becomes vestigial.
5. **Horizontal scaling is trivial.** Any worker can serve any room's next turn. No sticky-session routing.

## What this replaces

- **ADR-153** (Multiuser Sharpee Server) — REPLACED 2026-04-28. Per-room Deno subprocess + stateful WS protocol no longer apply. Identity contract, HTTP route surface, "code is the credential" framing, and public listing rules carry forward.
- **ADR-153a** (Phase-4 Amendments) — REPLACED 2026-04-28. Transitive: addendum to a replaced ADR.
- **ADR-156** (Multiuser Browser Client) — REPLACED 2026-04-28. Four-phase state machine (`connecting/hydrated/closed/error`) and `welcome`/`OUTPUT`/`RESTORED` snapshot streaming are tied to the long-running-engine model. Other decisions (client lives at `tools/server/client/`, public listing surface, title required) likely carry forward.
- **ADR-162** (World Model Replication) — REPLACED 2026-04-28. The wire shrinks from "full world snapshot every turn" to "channel-sparse data packets."

## What carries forward unchanged

- ADR-161 (Persistent Identity Model) — `{id, handle, passcode}` triple, orthogonal to the engine model.
- ADR-129 (ScoreLedger) and engine internals.
- The save blob format from `bf9b9564` (`world.toJSON()` / `world.loadJSON()` round-trip) — the *only* per-room server-side state under the new model.
- HTTP routes for identity, room create, room list.
- Multi-user server-side state that is *not* engine state: chat history, presence, draft-typing locks, room metadata. These stay in the server's DB / in-memory maps as today.

---

## Decisions locked in this brainstorm

### D1. Engine runs in-process Node — no Deno subprocess

**Question**: Are admin-uploaded `.sharpee` story bundles trusted?
**Answer**: Yes. Sharpee public instances run admin-installed well-known stories only (no public user-uploaded bundles). The Deno security boundary is not load-bearing.

**Consequence**: The engine runs in-process in the Node server. `tools/server/src/sandbox/` and the `deno-entry.ts` mechanism are deletable. Per-turn cost drops from ~150–300 ms (Deno cold spawn) to ~5–20 ms (in-process engine load + execute).

**Reversibility**: If untrusted bundles ever become a goal, a worker pool (Deno per-turn or a Node `worker_threads` with capability isolation) could be reintroduced as the per-turn execution surface without changing the wire or the channel model. The pivot is reversible at the worker boundary.

### D2. Wire format is fyrevm-style channel I/O

**Per-turn packet** (sparse — only changed channels):

```ts
{ kind: 'turn', turn_id: string, payload: { [channelId: string]: text | number | json } }
```

**Channel registry bootstrap** (emitted once per session, before any turn — fyrevm's "content management" channel pattern):

```ts
{ kind: 'cmgt', channels: [{ id: string, contentType: 'text' | 'number' | 'json' }, ...] }
```

The CMGT packet is the wire schema. Without it, the client cannot decode subsequent emissions. It must be the first message after connection.

### D3. Three content types: `text`, `number`, `json`

- `text` — plain string. Renderer: prose / status display / etc.
- `number` — integer or float. Engine emits `42`; client formats with locale and layout.
- `json` — structured object. Escape hatch for any author-defined complex surface.

No `boolean`, no `text[]`. `json` covers anything the three primitives don't. Stay tight.

### D4. String IDs, not integers

fyrevm packed channel names into 4-byte ASCII integers because Z-machine. We have JSON; the `contentName` *is* the id. One concept, not two.

### D5. Standard channel set (12) — Sharpee adaptation of fyrevm

| ID | Type | Mode | Source | Notes |
|---|---|---|---|---|
| `main` | json | append | engine | Narrative prose; `TextContent[]` per emission (allows decorations) |
| `prompt` | text | replace | engine | Input prompt (default `> `) |
| `location` | text | replace | engine | Status-line location name |
| `score` | json | replace | engine | `{ current: number, max: number\|null }` |
| `turn` | number | replace | engine | Turn count |
| `death` | text | event | engine | Death notification |
| `endgame` | text | event | engine | Endgame text |
| `score_notify` | text | event | engine | Transient score change announcement |
| `info` | json | once | engine | `{ title, author, version }` (one-time, structured) |
| `ifid` | text | once | engine | IFID (one-time) |
| `chat` | json | append | server | `{ from, text, ts }` (server-only, never engine) |
| `presence` | json | replace | server | Roster (server-only, never engine) |

A 13th channel `command_echo` is on deck for multi-user — broadcasts "Alice typed: NORTH" to other participants. Decision deferred until D6 (channel scoping) is settled.

**Dropped from initial sketch**:
- `inventory` — not a channel. Player types `inv`; output goes to `main`.
- `exits` — not a channel. Player types `exits`; output goes to `main`.
- `location_description` — already in `main`.
- Generic `system` — split into `death`, `endgame`, `score_notify`, etc. Specific is better.

The principle: **channels are for separate UI surfaces, not for state mirrors.** If the player can ask for it via a verb, it goes to `main`. If it has a dedicated UI slot (status line, score display) or fires as a transient signal (death, score change), it gets a channel.

### D6. Story extension via `json` channels + renderers (deferred details)

**Pattern**:
1. Story registers a channel: `registerChannel({ id: 'combat', contentType: 'json' })`.
2. Engine populates the channel during relevant turns.
3. CMGT manifest at session start advertises the channel to the client.
4. Client looks up a renderer keyed by `id`. If found, custom UI; if not, generic JSON-tree fallback (degraded but functional).

**Open**: how does the renderer JS physically ship in the bundle, and how does the client load it? Two plausible paths:

- **(a)** Renderers live in the platform client codebase. Stories declare *which* renderer (by name) handles their channel. Renderers are not author-extensible — only platform-shipped. Simpler, less powerful. Adequate if we expect a small set of recurring channel patterns (combat, dialogue, map).
- **(b)** Story bundles ship renderer JS as part of `.sharpee`. Server unpacks; serves at a known URL; client lazy-loads on first encounter. Author-extensible. More machinery (CSP, bundle layout, browser cache).

Decision deferred. (a) is enough for v1; (b) is a v2 capability if real authors need it.

### D7. `channel-service` is a new package

**Location**: `packages/channel-service/`
**Public API**:

```ts
// Channel definition (sent to client in CMGT manifest)
interface ChannelDefinition {
  id: string                                              // contentName; primary key
  contentType: 'text' | 'number' | 'json'
  mode: 'replace' | 'append' | 'event' | 'once'
}

// Channel routing rule — a (matcher, emitter) pair.
// One TextBlock can match multiple rules and produce multiple emissions
// (e.g., room.name → both `main` append AND `location` replace).
// The target channel's `mode` is the source of truth; rules just say
// which channel to target.
interface ChannelRule {
  when: {
    key?: string                                          // exact match
    keyPattern?: string | RegExp                          // pattern match
    keyPrefix?: string                                    // sugar for keyPattern
    decoration?: string                                   // matches if any content carries this decoration type
    custom?: (block: ITextBlock) => boolean               // escape hatch
  }
  emit: {
    channel: string                                       // channel id (must be registered)
    extract?:
      | 'content'                                         // pass through structured TextContent[]
      | 'string'                                          // flatten to plain string
      | 'number'                                          // parse as integer
      | ((block: ITextBlock) => unknown)                  // escape hatch
  }
  priority?: number                                       // higher = checked first; default 0
}

// Channel registry — imperative
registerChannel(def: ChannelDefinition): void
getChannelRegistry(): ChannelDefinition[]

// Routing rules — imperative (registered in story init)
addRule(rule: ChannelRule): void
addRules(rules: ChannelRule[]): void

// Bootstrap (once per session)
produceCmgtManifest(): { channels: ChannelDefinition[] }

// Per-turn producer (sparse — only changed channels emit)
produceTurnPacket(input: {
  textBlocks: ITextBlock[]
  events: DomainEvent[]
  world: WorldModel
  command?: { actor_handle, text }
  serverContext?: { chat?, presence? }
  prevValues?: Record<string, unknown>
}): { turn_id: string, payload: Record<string, unknown> }
```

**Conflict resolution**: if two rules emit to the same `replace`-mode channel in the same turn, the higher-priority rule wins; ties go to registration order (first-registered wins). Documented invariant — not a runtime warning.

**Default rule set**: channel-service ships a `platformRules` array covering the platform's core block keys (the 12 from `text-blocks/CORE_BLOCK_KEYS`). Default channels are also pre-registered. Stories opt out by not using the default ruleset (rare) or override by registering higher-priority rules for the same `key`.

**Dependencies**:
- `@sharpee/core` — events, primitive types
- `@sharpee/world-model` — read-only snapshot input
- *Not* `@sharpee/engine` — engine produces the inputs but never imports this package
- *Not* `@sharpee/lang-en-us` — language layer has already rendered text by the time channel-service runs

**Boundary statement**:
- **OWNER**: server-side bounded context. Runs in-process where the engine runs (Node).
- **SHARED?**: yes — channel definitions cross the wire. Server registers + emits; client receives via CMGT and renders. Client imports the type schemas directly (CLAUDE.md rule 7b).
- **PROMISE**: the engine's output shapes (TextBlock, DomainEvent, world snapshot) are the input contract. Engine never imports channel-service.
- **ALTERNATIVES**: leaving this in `tools/server/src/` would tie channels to the multi-user product. Pulling it to a package keeps single-user surfaces (zifmia, CLI) able to consume the same wire format if useful.

### D8. CMGT-first bootstrap order

The fyrevm pattern: the content-management rule is listed *first* in `when play begins`. The CMGT packet emits before anything else. We preserve that strict ordering:

1. `cmgt` (channel registry manifest)
2. `info` and `ifid` (one-time story metadata)
3. First `turn` packet (opening location / opening narrative)
4. Subsequent turns

A client that connects mid-session also receives `cmgt` first, then a synthesized "current state" snapshot (latest values of persistent channels), then the live stream resumes.

---

## Open questions

### Q-A. Multi-user channel scoping — RESOLVED 2026-04-28

**All channels are room-scoped.** Sharpee multi-user is "watching a play together" — everyone shares a single player character (PC). Per-participant scoping would be MPIF (multi-player IF), which is explicitly not a Sharpee product (see memory: "multi-user not multi-player"). If MPIF ever becomes a product, it forks the whole stack.

Consequence: the wire fan-out is trivial — every channel emission broadcasts to every subscriber unchanged. The `ChannelDefinition` does not carry a `scope` field. `command_echo` is room-scoped (everyone sees Alice typed NORTH; that's the feature, not a problem). Future per-recipient surfaces (DMs, etc.) live as room-level constructs that filter by recipient at render time, not as channels.

### Q-B. History and mid-session join — RESOLVED 2026-04-28

The fyrevm-server pattern: **the entire transcript is stored in each save blob**. The save blob IS the session — world state + transcript bundled together. Mid-session join = load current blob → replay its transcript → hook into live stream. Restore mechanically rolls back the transcript (older blob's transcript revert with the world). No separate `turn_packets` server-side table.

**Implementation**: a world-model capability (`transcript` or similar) holds the chronological list of channel packets. After each turn, channel-service writes the new packet into the capability via the existing `world.updateCapability()` API. `world.toJSON()` captures it as part of the snapshot automatically; `world.loadJSON()` restores it. Same pattern Sharpee already uses for the sandbox-owned `scoring.moves` counter (deno-entry mirrors `turnCount` into the scoring capability before each snapshot).

**Engine boundary**: the engine never *reads* the transcript capability — it's purely consumer-side state, written by channel-service and consumed by the wire/client. Engine never depends on transcript content.

**Mid-session join wire flow**:
1. Player connects, sends `hello`.
2. Server: `cmgt` packet (registry — same for everyone).
3. Server: extracts transcript from current save's transcript capability, replays as `turn` packets carrying a `replay: true` flag (so the client renders in transcript-builder mode — no animations, no transient toasts, no "score went up!" chime; replays are history, not events).
4. Server: hooks player into the live stream; subsequent live turns broadcast normally.

**Save size**: current engine save gzipped at T2 is ~64 KB. With transcript at ~1 KB/turn after gzip: 100 turns → ~150 KB; 500 turns → ~550 KB; 1000 turns → ~1 MB. Acceptable for typical IF session length.

**Save format version**: v2 → v3 (bump). v2 saves restore correctly under v3 — the transcript capability just starts empty. No auto-delete needed (per CLAUDE.md memory: "save-format changes use versioning next time").

### Q-C. Status of ADR-153 and ADR-162 — RESOLVED 2026-04-28

Both ended as REPLACED on the same day this brainstorm opened, alongside ADR-156 and ADR-153a. The replacement ADR is pending; the brainstorm doc is the interim source of architectural direction.

### Q-D. CLI / single-user adoption

The channel-I/O wire is reusable for single-user surfaces (CLI, zifmia). A CLI that consumes channels could render `main` to stdout, ignore `chat` and `presence`, render `score`/`turn` to a status line at the top of the terminal. Free interop.

**Open**: is single-user adoption a goal of this pivot, or just a happy accident? Affects whether `channel-service` lives in `packages/` (yes) or `tools/server/` (also fine if multi-user-only).

### Q-E. TextBlock → channel routing — RESOLVED 2026-04-28

**Sharpee already has TextBlock channels at the text-blocks layer.** `packages/text-blocks/src/types.ts` cites FyreVM by name: "Keys act as channels (FyreVM pattern). Clients route blocks by key." The package defines 12 `CORE_BLOCK_KEYS` that map cleanly onto the channel set in D5.

**The routing model is rule-based**, declarative, and imperatively registered (option (a)):

- Default rules ship with channel-service and cover the 12 core block keys.
- Stories register additional / overriding rules in their bundle's init code (`channelService.addRules([...])`).
- One TextBlock can match multiple rules and emit to multiple channels (e.g., `room.name` → both `main` (append, narrative) and `location` (replace, status bar)).
- Rule mode is **not** carried on the rule. Mode lives on the `ChannelDefinition` — the same channel always behaves the same way. Rules just say "this block goes to channel X."
- **Conflict resolution**: when two rules emit to the same `replace`-mode channel in one turn, higher priority wins; ties go to first-registered.

**Story-side metadata** (`info` channel) is **always emitted as structured data** by stories. There is no server-side `extract: 'metadata'` parser of the `game.banner` line. Stories emit info as their own `info`-keyed TextBlock with structured `TextContent` carrying `{title, author, version}`.

**Decorations on the wire**: the `main` channel is `contentType: json` and carries `TextContent[]` (string | IDecoration). Status channels are flat `text`. This is the "hybrid" path — close to fyrevm but allows markup where it matters (Photopia-style colored text, decorated item names, etc.).

The full rule and definition shapes are in D7 above.

### Q-F. Story metadata channel timing

`info` and `ifid` are one-time channels (sent at session start). Are they emitted as part of the CMGT bootstrap (combined manifest + initial values), or as their own first-turn payload? Probably the latter — keeps CMGT pure schema, and `info`/`ifid` are values.

### Q-G. Save / restore as a player feature

Under fyrevm-style, every turn produces a save. The user-facing "Save" button still exists, but it just *names* a blob that already exists. The saves table holds named pointers to per-turn blobs, not separate blobs. Restore picks one of N named blobs to roll back to.

**Open**: do we keep the named-saves UX, or replace it with "rewind one turn / N turns"? The latter is mechanically easier under stateless. The former is what every IF player expects.

---

## What this brainstorm does NOT cover

- **Implementation plan**. Phasing, package skeleton, migration steps live in a separate plan after the brainstorm converges and the new ADR lands.
- **The new ADR itself**. The ADR captures load-bearing decisions; this doc captures the conversation that produced them.
- **CI / deploy changes**. Some — Deno is no longer required in the runtime image. Ship with the implementation plan.
- **Rollback plan**. There is none — the `tools/server/` directory is rewritten substantially. Per CLAUDE.md memory ("No backwards compatibility — server admin owns lifecycle"), the cutover is one-shot. Existing rooms / saves on the live `play.sharpee.net` instance will be wiped.

---

## Next sessions

1. Start a `packages/channel-service/` skeleton: channel registry, rule registry, CMGT manifest producer, the dozen standard channels pre-registered, the platform's default rule set covering the 12 `CORE_BLOCK_KEYS`, and the `transcript` capability writer.
2. Resolve the remaining minor open questions (Q-D single-user adoption, Q-F metadata timing, Q-G saves UX) — none block the package skeleton.
3. Write the replacement ADR — load-bearing decisions only, with this brainstorm as the longer rationale. Working title: ADR-163 (Stateless Multi-User + Channel I/O).
4. Plan the cutover work in `docs/work/stateless-multiuser/plan-{date}.md`. Includes: new package, server rewrite to use it, save format v3 bump (transcript capability), Deno deletion, client wire migration, e2e suite migration.
