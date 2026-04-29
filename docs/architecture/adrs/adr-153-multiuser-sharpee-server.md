# ADR-153: Multiuser Sharpee Server

## Status: REPLACED

> **REPLACED on 2026-04-28.** This ADR specified the multi-user server as a long-running per-room Deno subprocess holding a `GameEngine` in memory, streaming `welcome` / `OUTPUT` / `RESTORED` snapshots over a stateful WebSocket. The 2026-04-28 pivot adopts a **fyrevm-style stateless server**: no per-room engine in memory; each turn loads the saved blob → executes one command → snapshots back. The wire becomes a small channel-I/O data packet rather than a stateful session. Q1 of the brainstorm settled that admin-installed stories are trusted, so the Deno subprocess sandbox is no longer load-bearing — the engine runs in-process Node. Most of this ADR's decisions become obsolete: Deno isolation, `Sandbox` lifecycle, turn protocol over stdin/stdout, save-shape tied to subprocess lifetimes, browser session phase model. Decisions that carry forward: identity contract (now governed by ADR-161), HTTP route surface, the "code is the credential" framing, the public listing rules. Brainstorm: `docs/brainstorm/stateless-multiuser/overview.md`. Replacement ADR pending.

## Date: 2026-04-19 (replaced 2026-04-28)

## Supersedes

ADR-152 ("Zifmia Server Runtime Host Interface and Pluggable Isolation Backends") — abandoned in favor of the decisions in this ADR. See the `Status` section of ADR-152 for the rationale; summary: the single-backend decision is now made (Deno with `--allow-none`), the pluggable-backend abstraction was YAGNI, Worker-thread isolation was never a real security boundary, and the MVP's deployment model is narrower than ADR-152 anticipated.

## Context

Signal from the interactive-fiction community (intfiction.org) points to a recurring pain point: **players want to play IF games together**, and they currently cobble it together with Discord/Zoom screen-sharing. The experience is awkward because the command line cannot be shared — whoever is screen-sharing also owns the keyboard, creating a typing bottleneck, an authority imbalance (the relay gets to edit or reinterpret others' commands), and a participation cliff for quieter players.

The right framing is not "prettier Discord" but **a networked game controller with a handoff mechanism**: shared or passable input authority, not just shared visibility.

Sharpee is positioned to address this. The engine is TypeScript, the runtime is portable, and the project already has infrastructure (Zifmia) for bridging a Sharpee engine to a browser client. A purpose-built multiuser platform — open-source, self-hostable, general-purpose — is a natural extension.

The detailed brainstorm that grounds this ADR is recorded in `docs/brainstorm/multiuser/overview.md`. This ADR captures the architectural commitments that emerged from that brainstorm; readers wanting the fuller rationale, the options-considered-and-rejected, and the walked user-flows should start there.

### Threat model and trust assumptions

A `.sharpee` file is **executable JavaScript bundled via esbuild**, not declarative data like `.z5` or TADS. It runs with whatever privileges the runtime gives it. Running host-uploaded `.sharpee` code on the platform's own servers therefore requires real isolation — not AST filtering, not `vm` module containment (Node's docs explicitly disclaim `vm` as a security mechanism), not Worker threads (shared address space, not a boundary).

The MVP narrows the threat model by **excluding end-user story uploads**: operators preload stories out-of-band (SSH, rsync, git pull) into a stories directory, and the platform only runs what the operator placed there. The platform still isolates story execution — operator code can have bugs, and operator trust is not the same as "safe by construction" — but the threat model is "semi-trusted author code, no adversarial uploads" for v0.1.

### Shape of the product

Not a SaaS. **Open-source, self-hostable platform software** on the Mastodon / Matrix / GitLab-CE model. The project ships code; anyone can stand up an instance. A reference instance (working name `sharpee.net`) may run on project infrastructure but is one deployment among many, not a privileged variant.

Target operators: IF clubs, individual authors running beta tests, IFTF running a comp's beta-test window, teachers for IF units, casual groups of friends, the Sharpee project itself as a demo/refuge instance.

## Decision

We will build a multiuser Sharpee server — a server-rendered, browser-client, room-based shared-play platform — with the following architectural commitments:

### 1. Server-side engine execution with Deno sandbox isolation

**The Sharpee engine runs on the platform's servers, not in each participant's browser.** Browser clients are thin: they send commands up and receive rendered events back.

Each active room gets its own **Deno subprocess** as the story runtime. The Deno process is launched with permissions equivalent to `--allow-none`: no filesystem, no network egress beyond the platform control plane, no environment access, no subprocess spawning. Deno's V8-level capability model is the security boundary.

- **Rejected**: Node Worker threads (not a security boundary — shared address space), filter-then-load approaches (unbounded escape surface), `vm` module (explicitly not a security mechanism).
- **Deferred**: Firecracker microVMs, per-room Docker containers, WASM-based sandboxing. These remain upgrade paths if the threat model widens (e.g. accepting anonymous story uploads post-MVP), but they are not v0.1 scope.

The server↔sandbox boundary is a framed message-passing protocol (command in, events out, SAVE/RESTORE blobs opaque to the server). This preserves the option to swap isolation technology later — the protocol is the boundary, not the implementation.

### 2. No filesystem access in the story runtime

**Save/restore routes through the server, not through story code.** Story code calls Sharpee's save API; the Sharpee runtime (in-sandbox) emits a save-request message to the server; the server persists the opaque blob to SQLite and returns a save_id. RESTORE reverses this.

Consequences:
- Path traversal, disk exhaustion, and cross-room file leakage **do not exist as attack surfaces** — the capability doesn't exist in the sandbox.
- Saves are opaque to the server (bytes in / bytes out). The server does not introspect or mutate save content.

### 3. Rooms are the primitive, not accounts

Every session lives inside a **room**. Rooms hold: a story selection, a participant roster, one save timeline, one event log, one chat channel, one join code.

- A room is created by anyone who reaches the instance URL; the creator becomes the **Primary Host**.
- Room creation is **CAPTCHA-gated** (operator-configurable provider: Turnstile, hCaptcha, Friendly Captcha, similar), but otherwise open.
- Joining is by **URL or raw join code** (`https://{instance}/r/XYZB-3F56` or `XYZB-3F56`). Both are always visible in the room UI with copy buttons.
- Room identity is durable; participant identity is not.

### 4. No user accounts; durable session tokens per-room

**The MVP ships with no authentication system.**

On first join (create-room or code-entry), the server issues a **durable session token** stored in browser `localStorage`, scoped to the room URL. Reconnecting with the token preserves the participant's role and display name. Losing the token means rejoining as a fresh Participant — no email/password recovery, no cross-room identity.

This is the single largest structural decision in the design. It means:
- No password storage, no email-verification flow, no OAuth provider integration, no account-recovery support burden.
- Room creation, joining, and reconnection all ride on the same `join-code + token` pattern.
- Cross-room identity, per-user libraries, and any "profile" concept are deferred post-MVP. Revisiting requires adding accounts, which is a significant scope expansion.

### 5. Four-tier role hierarchy with strict promotion discipline

- **Primary Host** → **Co-Host** → **Command Entrant** → **Participant**.
- **Promotion: strict one-level-down.** Only the Primary Host creates Co-Hosts. Co-Hosts promote to Command Entrant. Command Entrants and Participants cannot promote anyone.
- **Demotion: Primary-Host-only at every tier.** Deliberate friction; forces moderation discussion; prevents Co-Host ping-pong.
- Every joiner enters as a Participant. Promotion is an explicit action by someone with higher authority.

The Primary Host's role is absolute over their own room (pin, delete, demote). Co-Host authority is a delegated subset.

### 6. Cascading succession invariant

**As long as ≥2 people are in the room, it always has exactly 1 Primary Host and ≥1 designated Co-Host successor.**

- The very first participant to join after the Primary Host is auto-designated successor. The Primary Host can change the nomination at any time.
- When the Primary Host is absent at session resume, or disconnects/goes idle for 5 minutes during an active session, the designated Co-Host is promoted to Primary Host.
- When the designated Co-Host is promoted (or vacates for any reason), the earliest-joined still-present Participant is auto-elevated to Co-Host successor. The chain walks indefinitely.
- The original Primary Host rejoining after auto-transfer reconnects as a Participant. They have fallen out of the chain.

The invariant keeps the room's moderation capability alive regardless of who comes and goes. Moderation never stalls for lack of people.

### 7. Lock-on-typing input model with live preview

**Shared input authority without the ceremony of explicit turn-passing.**

- **Lock engages** on first keystroke in the command input field.
- **Lock releases** on submission, on empty input (backspace-to-empty), on 60-second AFK timeout, or on Co-Host force-release.
- **Live preview**: every room occupant (all tiers — not just other Command Entrants) sees the lock holder's keystrokes streaming in real time, rendered as `Alice is typing: > take swo▮`. Broadcasts are debounced deltas; not persisted.
- **No attribution in the story pane**: commands render as classic single-player IF (`> take sword` / `Taken.`). Attribution lives in the event log for out-of-band review.

Live preview is the platform's **primary differentiator** over screen-share + Discord. It turns the locked period into shared design space — the room can backseat-drive in chat in real time, which is exactly the social interaction the platform is meant to enable.

### 8. Room chat + PH↔Co-Host DMs only

- **Room chat** is a single channel. All tiers can send freely from the moment they join. Chat is visible to everyone in the room.
- **Direct messages** exist on the **Primary Host ↔ Co-Host axis only**. No Co-Host ↔ Co-Host DMs, no Participant DMs, no Command Entrant DMs.
- The DM feature exists specifically to serve the demotion-request flow (a Co-Host asking the Primary Host to revoke a grant without leaking the discussion to the target). Its scope is deliberately narrow.

Zero Participant-facing DM surface means zero Participant-to-Participant harassment vector from the platform — a meaningful safety win for operators running open-access instances.

### 9. Mute is the moderation hammer; no kick

**The MVP has no kick, no ban, no IP-based enforcement.**

- **Mute** disables a participant's outbound chat (and outbound DM, for muted Co-Hosts). The muted user keeps their role, keeps command authority if they have it, sees everything.
- The mute indicator is **visible to all** next to the muted user's display name. Social visibility is part of the deterrent.
- Authority: Primary Host can mute anyone below; Co-Host can mute Command Entrants and Participants (not other Co-Hosts). Flat unmute: any PH or Co-Host can unmute anyone.
- Mute persists across disconnect/reconnect.

**Escape hatch**: the Primary Host can delete the room. That is a room-level nuke rather than a person-level action, but it sidesteps the entire token-invalidation / re-entry-prevention / IP-ban rabbit hole.

### 10. Room-scoped saves; auto-named; server-side SQLite

- **One save timeline per room**, shared by all participants. No per-participant save stores.
- **Any Command Entrant or above** can save or restore.
- Saves are **auto-named** (`{story-slug} — T{turn#} — {ISO-timestamp}`). No user-supplied labels in MVP.
- Persisted as **opaque blobs** in server-side **SQLite** (WAL mode). The server does not introspect save contents.

### 11. Unified append-only session event log

**Every event in a room is persisted as it happens**, in a single append-only table:

```sql
session_events (
    event_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id     TEXT NOT NULL,
    participant_id TEXT,      -- nullable for system events
    ts          TIMESTAMP NOT NULL,
    kind        TEXT NOT NULL,   -- command | output | chat | dm | role |
                                 -- save | restore | join | leave | lifecycle
    payload     JSON NOT NULL,
    INDEX (room_id, ts)
)
```

One table keeps export and replay trivial. JSON payloads keep the schema stable as event kinds evolve.

**What this buys**:
- **Beta-test review** — authors replay a full session after the fact without re-executing anything.
- **Deterministic transcript export** — straight selection from the log; no engine re-execution.
- **Debugging** — if a player reports "the game crashed when I did X," the log shows the preceding state.
- **Moderation audit** — full record of what happened in a room if there's ever a dispute.

**Privacy boundary == room boundary**: when a room is recycled or deleted, all events cascade-delete.

**Recording transparency**: on joining, every participant sees a clearly worded notice — "This session is recorded. Everything in this room is logged: every command, every chat message, every DM between Primary Host and Co-Hosts, every role change. Be on good behavior — this includes Hosts and Co-Hosts. Your DMs are not exempt." A persistent "REC" indicator stays visible in the room UI.

### 12. 14-day idle recycle; PH-only pin; PH-only delete

- **`last_activity_at`** updates on command submission, chat, and (re)joins.
- **Idle recycle**: if no activity for 14 days (operator-configurable via `rooms.idle_recycle_days`), the room is recycled. Cascade-deletes room record, saves, transcript, chat, DMs, event log. Join code returns to the pool.
- **Pin** — Primary-Host-only, bypasses idle recycle. Lives in the room settings panel. Pin status is surfaced ambiently in the room UI.
- **Delete** — Primary-Host-only, immediate, irreversible, **type-to-confirm** (must type room title to unlock Delete button). Broadcasts a final "closed by host" message to participants before disconnect.
- Silent recycle: no pre-recycle warnings in MVP (no email / push / notification infrastructure). Pin is the affordance for anyone who cares.

### 13. Desktop/laptop browsers only

**Mobile support is an explicit non-goal.** Desktop/laptop browsers only. The UI, input model, and screen layout are not constrained for small-screen or touch-first use. Players on phones join the voice call from their phone and use a laptop for the game itself.

Re-evaluating mobile is a post-MVP exercise once the desktop product is proven.

### 14. Docker as the canonical deployment artifact

- **Single Docker image** (Node server + Deno binary + SQLite tooling, multi-stage build, slim runtime).
- **Reference `docker-compose.yml`** stands up a working instance.
- **Single HTTP/WebSocket port** exposed. Operator fronts with their existing reverse proxy (Apache, nginx, Caddy, Traefik — TLS is the operator's responsibility).
- **Single-container model** in MVP: Node server as PID 1, Deno subprocesses spawned as children. Security boundary is Deno's capability model, not per-room containers.
- **Persistent volumes**: `/data/db` (SQLite), `/data/stories` (preloaded `.sharpee` files), `/etc/sharpee-platform.yaml` (config).
- **No managed-service dependencies.** Runs on a plain Linux VPS with Docker. Operators who *want* to plug in S3 for backups, Sentry for errors, etc., can — but are not forced to.

### 15. Framework and library choices

- **Web framework**: **Hono.** TS-first, tiny, runtime-agnostic (Node / Deno / Bun / Workers / Edge). The HTTP surface is small; Express's ecosystem advantage doesn't buy much. Runtime portability matches the project ethos.
- **WebSocket layer**: **bare `ws`.** The room/broadcast/authority/lock-on-typing layer is domain-specific and worth writing directly. Socket.IO's extra features (fallbacks, auto-reconnect) overlap with decisions already made differently (durable tokens, modern browsers only).
- **SQLite driver**: **`better-sqlite3`.** Synchronous, fast, easy to audit. Write volume is comfortably within a single Node event loop.
- **Data access**: **raw parameterized SQL with a repository pattern.** Each table has a repository module exposing named methods backed by prepared statements. No string concatenation into SQL, ever. No ORM, no query builder in MVP. Schema is small (~5 tables); ORM overhead is not justified. If type friction emerges, **Kysely** (typed query builder, no runtime) is the upgrade path — and repositories are already the right seam to absorb that swap.
- **Migrations**: forward-only; ordered `.sql` files in `migrations/`, tracked via a `schema_migrations` table. No rollback tooling in MVP.

## Sharpee Package Dependencies

The multiuser server is a new top-level package (`packages/multiuser-server/`) that depends on existing Sharpee packages at specific seams. Naming these explicitly prevents architectural drift during implementation.

| Package | Seam | Purpose |
|---|---|---|
| `@sharpee/engine` | Imported **only** inside the Deno sandbox entry point | Instantiates the game engine for a given story. The server process does NOT import `@sharpee/engine` directly. |
| `@sharpee/core` | Imported by both server and sandbox | Shared event type definitions, Domain Event shapes. Keeps the server↔sandbox OUTPUT payload typed at both ends. |
| `@sharpee/world-model` | Inside the sandbox only (transitive via engine) | Never imported by server code. The server treats world state as opaque. |
| `@sharpee/stdlib` | Inside the sandbox only (transitive via engine) | Same — server has no standard-action awareness. |
| `@sharpee/parser-en-us`, `@sharpee/lang-en-us` | Inside the sandbox only (transitive via the story's `.sharpee` bundle) | Bundled into the story at build time; the sandbox loads what the story includes. |
| `@sharpee/zifmia` | **Not** a dependency | The multiuser server is not built on Zifmia. Zifmia remains the desktop/browser single-player runtime; the multiuser server is a distinct product with its own HTTP/WebSocket surface. Code sharing, if any, happens through `@sharpee/core` or a future extraction. |

**Sandbox entry point.** The Deno subprocess loads a small TypeScript entry module that:
1. Receives the `.sharpee` bundle path from the server via the INIT message.
2. Dynamically imports the bundle (which registers the story with its engine).
3. Instantiates `@sharpee/engine`'s `GameEngine` with the story.
4. Loops over the Runtime Host Interface message queue, driving COMMAND/SAVE/RESTORE/SHUTDOWN against the engine.

This entry module lives in `packages/multiuser-server/src/sandbox/` and is built as a Deno-compatible bundle. The server spawns Deno with this bundle as the entrypoint.

**No changes required in existing packages** for MVP. The Sharpee engine already exposes the surfaces needed (command execution, save/restore, event emission) through its existing public API. If the sandbox integration reveals a missing seam in `@sharpee/engine`, it gets its own ADR rather than being bolted on here.

## Interface Contracts

Sketches below are TypeScript-shaped but not final. They are binding contracts for what the wire format **must express**; exact field names, versioning header, and optional fields will be refined during implementation. Every shape is framed as JSON on the wire.

### Server ↔ Sandbox (Runtime Host Interface)

Carried forward from ADR-152 with the single-backend simplification. All messages are JSON objects, newline-delimited over the Deno subprocess's stdio. Binary payloads (save blobs) are base64-encoded within the JSON envelope.

```typescript
// Lifecycle
type Init      = { kind: 'INIT'; room_id: string; story_file: string; seed?: string; protocol: number };
type Ready     = { kind: 'READY'; story_metadata: { title: string; author?: string; version?: string } };
type Shutdown  = { kind: 'SHUTDOWN' };
type Exited    = { kind: 'EXITED'; reason: 'clean' | 'crash' | 'limit' | 'shutdown'; stats?: unknown };

// Turn execution
type Command   = { kind: 'COMMAND'; turn_id: string; input: string; actor?: string };
type Output    = { kind: 'OUTPUT'; turn_id: string; text_blocks: TextBlock[]; events: DomainEvent[] };
type Cancel    = { kind: 'CANCEL'; turn_id: string };

// Save/restore
type SaveReq   = { kind: 'SAVE'; save_id: string };
type SaveResp  = { kind: 'SAVED'; save_id: string; blob_b64: string };
type Restore   = { kind: 'RESTORE'; save_id: string; blob_b64: string };
type Restored  = { kind: 'RESTORED'; save_id: string; text_blocks: TextBlock[] };

// Health + errors
type Heartbeat = { kind: 'HEARTBEAT'; turn_id?: string; stats?: unknown };
type Error     = { kind: 'ERROR'; phase: 'init' | 'turn' | 'save' | 'restore' | 'limit'; turn_id?: string; detail: string };
```

`TextBlock` and `DomainEvent` are re-exports of the types already defined in `@sharpee/core`. The save blob is opaque to the server — it stores the bytes and hands them back verbatim on RESTORE.

Resource limits (CPU per turn, memory cap, wall-clock timeout) are enforced by the Deno backend via `--v8-flags` and OS-level rlimits, not by the protocol. Limit violations surface as `ERROR { phase: 'limit', ... }` followed by `EXITED { reason: 'limit' }`.

### Browser ↔ Server (WebSocket)

All client↔server traffic after the initial HTTP join response rides a single WebSocket per participant. Messages are JSON, tagged with a `kind` discriminator. The server is authoritative on every state transition; the client issues intents and renders server-pushed state.

```typescript
// Client → Server intents
type ClientMsg =
  | { kind: 'hello';          token: string }                              // on connect / reconnect
  | { kind: 'draft_delta';    seq: number; text: string }                  // live-preview keystroke frame
  | { kind: 'submit_command'; text: string }                               // submits the current draft
  | { kind: 'release_lock'  }                                              // voluntary release (empty-input, etc.)
  | { kind: 'chat';           text: string }
  | { kind: 'dm';             to_participant_id: string; text: string }
  | { kind: 'promote';        target_participant_id: string; to_tier: 'co_host' | 'command_entrant' }
  | { kind: 'demote';         target_participant_id: string; to_tier: 'participant' | 'command_entrant' | 'co_host' }
  | { kind: 'mute';           target_participant_id: string }
  | { kind: 'unmute';         target_participant_id: string }
  | { kind: 'force_release';  target_participant_id: string }              // Co-Host force-release on lock holder
  | { kind: 'save'          }
  | { kind: 'restore';        save_id: string }
  | { kind: 'pin'           } | { kind: 'unpin' } | { kind: 'delete_room'; confirm_title: string }
  | { kind: 'nominate_successor'; target_participant_id: string };

// Server → Client pushes
type ServerMsg =
  | { kind: 'welcome';         participant_id: string; room: RoomSnapshot; participants: ParticipantSummary[] }
  | { kind: 'presence';        participant_id: string; connected: boolean }
  | { kind: 'draft_frame';     typist_id: string; seq: number; text: string }   // live preview to all
  | { kind: 'lock_state';      holder_id: string | null }                       // who holds the lock
  | { kind: 'story_output';    turn_id: string; text_blocks: TextBlock[]; events: DomainEvent[] }
  | { kind: 'chat';            event_id: number; from: string; text: string; ts: string }
  | { kind: 'dm';              event_id: number; from: string; to: string; text: string; ts: string }
  | { kind: 'role_change';     participant_id: string; tier: Tier; actor_id: string }
  | { kind: 'mute_state';      participant_id: string; muted: boolean; actor_id: string }
  | { kind: 'save_created';    save_id: string; name: string; actor_id: string; ts: string }
  | { kind: 'restored';        save_id: string; text_blocks: TextBlock[]; actor_id: string }
  | { kind: 'room_state';      pinned: boolean; last_activity_at: string }
  | { kind: 'room_closed';     reason: 'deleted' | 'recycled'; message?: string }
  | { kind: 'successor';       participant_id: string }
  | { kind: 'error';           code: string; detail: string };

type Tier = 'primary_host' | 'co_host' | 'command_entrant' | 'participant';
```

Ordering and delivery: messages are delivered in server-serialized order per connection. The server never reorders state pushes; `draft_frame` is idempotent via `seq` and the latest wins.

Reconnection: on `hello` with a valid token, the server replies with a fresh `welcome` carrying a `RoomSnapshot` (including the current lock holder, current save list, mute state, participant roster). The client re-derives its view from the snapshot rather than assuming its pre-disconnect state is still current.

### Session Event Log Payloads

The `payload` JSON in `session_events` has a different shape per `kind`. Each shape is enumerated so that transcript export, replay, and audit tools can type-check the payload they consume.

```typescript
type EventPayload =
  | { kind: 'command';   input: string; turn_id: string }
  | { kind: 'output';    turn_id: string; text_blocks: TextBlock[]; events: DomainEvent[] }
  | { kind: 'chat';      text: string }
  | { kind: 'dm';        to_participant_id: string; text: string }
  | { kind: 'role';      op: 'promote' | 'demote' | 'mute' | 'unmute' | 'nominate';
                         target_participant_id: string;
                         from_tier?: Tier; to_tier?: Tier }
  | { kind: 'save';      save_id: string; save_name: string }
  | { kind: 'restore';   save_id: string }
  | { kind: 'join';      display_name: string; reconnect: boolean }
  | { kind: 'leave';     reason: 'disconnect' | 'tab_closed' | 'grace_expired' }
  | { kind: 'lifecycle'; op: 'created' | 'pinned' | 'unpinned' | 'deleted' | 'recycled' };
```

`TextBlock[]` and `DomainEvent[]` are the same shapes carried on the Runtime Host Interface — no translation layer, no loss of fidelity.

### Repository Interfaces

Repositories are the single seam between the application layer and SQLite. Each exposes a narrow set of named methods backed by prepared statements.

```typescript
interface RoomsRepository {
  create(input: { title: string; story_slug: string; primary_host_id: string }): Room;
  findById(room_id: string): Room | null;
  findByJoinCode(code: string): Room | null;
  updateLastActivity(room_id: string, ts: string): void;
  setPinned(room_id: string, pinned: boolean): void;
  delete(room_id: string): void;                     // MUST cascade within one transaction
  listRecycleCandidates(now: string, idle_days: number): Room[];
}

interface ParticipantsRepository {
  createOrReconnect(input: { room_id: string; token: string; display_name: string }): Participant;
  findById(participant_id: string): Participant | null;
  findByToken(token: string): Participant | null;
  setTier(participant_id: string, tier: Tier, actor_id: string): void;
  setMuted(participant_id: string, muted: boolean, actor_id: string): void;
  setConnected(participant_id: string, connected: boolean): void;
  listForRoom(room_id: string): Participant[];
  earliestConnectedParticipant(room_id: string): Participant | null;  // for succession
}

interface SessionEventsRepository {
  append(input: { room_id: string; participant_id: string | null; kind: EventKind; payload: EventPayload }): number;  // returns event_id
  listForRoom(room_id: string, opts?: { since_event_id?: number; limit?: number; kinds?: EventKind[] }): SessionEvent[];
}

interface SavesRepository {
  create(input: { room_id: string; actor_id: string; name: string; blob: Buffer }): Save;
  findById(save_id: string): Save | null;
  listForRoom(room_id: string): Save[];
}

interface ConfigRepository {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
```

All implementations use `better-sqlite3` prepared statements. No method accepts untrusted SQL fragments; every query is fully parameterized.

## Atomicity Requirements

Three operations must be atomic (implemented as single SQLite transactions). Non-atomic execution is a bug.

1. **Room delete cascade.** `RoomsRepository.delete(room_id)` MUST delete the room row, all participants, all session events, all saves, and release the join code in a single `BEGIN IMMEDIATE ... COMMIT` transaction. Partial delete (e.g., room row gone but events remaining) violates the privacy boundary.

2. **Succession promotion + successor refill.** When the Primary Host's 5-minute grace expires (or the room is resumed without the PH present), the following MUST happen atomically:
   - Designated Co-Host's tier updated to `primary_host`.
   - Earliest-connected Participant (if any) elevated to `co_host` and marked as the new designated successor.
   - A `role` event appended to the event log describing the transition.
   - Server broadcasts `role_change` + `successor` to all connected participants.

   All state mutations in the first three bullets are one DB transaction. The broadcast happens after commit; a crash mid-broadcast is tolerable (clients re-sync on reconnect via `welcome`), but a crash mid-DB-transaction must roll back cleanly.

3. **Idle recycle.** When the recycle sweeper identifies an expired room, the cascade delete (same as #1) plus join-code-pool release MUST be a single transaction. Recycle sweeps run at most once per minute; overlapping sweeps must be prevented via a per-sweeper process lock, not by DB-level locking alone.

Implicitly atomic but worth naming: token-based reconnection (`Participant.findByToken` + `setConnected(true)`), and save creation (`Save.create` + session-event append — both in one transaction so the event log can never reference a save_id that doesn't exist).

## Acceptance Criteria

v0.1 ships when all of the following are demonstrable on a fresh install:

1. **Two-user smoke.** Operator stands up an instance via the published Docker image + `docker-compose.yml`. User A creates a room with a preloaded story. User B joins via the URL. User A types a command while User B watches the keystrokes stream in real time. User B takes over the keyboard on empty-input release. Both users see the same story output.

2. **Save/restore round-trip.** In a 2-user room, a Command Entrant issues `save`. The save appears in the saves list for all participants. A participant disconnects and reconnects. `restore` on the saved blob returns the room to the exact prior state, with a single `RESTORED` text block narrating the restoration.

3. **Primary Host succession.** A 3-user room has a Primary Host and a designated Co-Host. The Primary Host closes their browser. After 5 minutes ± 5 seconds, the designated Co-Host is promoted to Primary Host, and the earliest-joined Participant is promoted to Co-Host successor. The event log contains the transition. The original Primary Host reconnecting lands as a Participant.

4. **Room delete cascade.** A Primary Host deletes a pinned room via the type-to-confirm flow. All participants receive the `room_closed` notice before their sockets close. A new `SELECT` against `session_events`, `saves`, and `participants` for that room returns zero rows. The join code is immediately available for reissue.

5. **Mute visibility.** A Co-Host mutes a Participant. The Participant's chat-send attempts are rejected with "You've been muted". All participants see the mute indicator next to the target's display name. The muted user disconnects and reconnects; they are still muted.

6. **Idle recycle.** A room with `last_activity_at` older than the configured `idle_recycle_days` is recycled within 1 minute of the next sweep. All room data cascades. A pinned room with the same idle profile is not recycled.

7. **Sandbox crash recovery.** The Deno subprocess is killed externally (simulated crash). The server detects EXITED, notifies the room ("the story runtime crashed; last save available"), and allows the room to RESTORE from the most recent save. The server itself does not crash.

8. **Docker smoke.** `docker compose up` on a clean Linux VM with only Docker installed produces a running instance reachable on the configured port. `docker compose down` cleanly shuts down without data loss. A subsequent `up` resumes with prior rooms intact.

9. **Operator docs.** Install guide, config reference, backup/restore runbook, and upgrade guide are present and verified by a person other than the implementer standing up a fresh instance from scratch following the docs.

Failing any of these blocks v0.1 release.

## Test Specifications

### End-to-end scenarios (required)

These scenarios exercise the full stack and are the primary acceptance gates.

**E2E-1: create → join → play → save → restore**

```
# Driver: a headless browser harness (Playwright or equivalent)
1. User A opens the instance URL, creates a room with story "sample", display name "Alice".
2. Harness asserts: room visible, join URL + code displayed, Alice is Primary Host, event log has lifecycle=created + join.
3. User B opens the join URL, enters display name "Bob".
4. Harness asserts: Bob is Participant; Alice's client received presence + role_change for Bob's join.
5. Alice promotes Bob to Command Entrant.
6. Bob types "take lamp" character-by-character. Alice's client receives draft_frame events matching Bob's keystrokes.
7. Bob submits. Both clients receive story_output. Event log has command+output rows.
8. Alice saves. save_created arrives to both clients. Event log has a save row.
9. Bob types destructive command, submits.
10. Bob restores the save. restored arrives to both clients with the prior state's text_blocks.
11. Harness asserts: current engine state (queried via a test-only introspection hook) equals the pre-destructive-command state.
```

**E2E-2: PH disconnect → succession → chain refill**

```
1. Alice (PH), Bob (Co-Host, designated successor), Carol (Participant), Dave (Participant join later).
2. Bob is auto-nominated on join. Alice's client receives successor=Bob.
3. Alice force-closes her browser.
4. Harness waits 5 minutes + 10 seconds (or uses a test hook to advance the grace timer).
5. Bob becomes Primary Host in one atomic transaction. Harness asserts:
   - Bob's tier = primary_host
   - Carol's tier = co_host (earliest Participant auto-elevated)
   - Carol is marked as new successor
   - Event log has exactly one role event with op=promote for Bob, one for Carol, one for the nomination
6. Alice reconnects. Harness asserts: Alice's tier = participant.
7. Carol leaves. Dave (only remaining Participant) is auto-elevated to Co-Host successor.
```

### Boundary tests (required)

Each boundary condition in the decision block gets at least one test:

- **Lock race (B-1).** Two Command Entrants press their first key within 50ms of each other. Server arbitrates by timestamp; the loser's local input is reset; event log shows a single lock acquisition.
- **AFK timeout (B-2).** Lock holder stops typing with non-empty draft. At T+60s, the lock releases server-side. Other Command Entrants become eligible. The original typist's draft is preserved locally.
- **PH grace timer (B-3).** PH disconnect; at T+4m59s no succession has fired; at T+5m01s succession has fired.
- **Idle recycle boundary (B-4).** Room with `last_activity_at` at `now - idle_days - 1 second` is recycled on next sweep; room with `last_activity_at` at `now - idle_days + 1 second` is not.
- **Mute persistence (B-5).** Muted user disconnects, reconnects; still muted. Room recycles; mute state is gone with the room.
- **Type-to-confirm delete (B-6).** Typing the title correctly enables Delete; typing anything else does not. Cancel always works.

### Negative-path tests (required)

- **N-1: Sandbox crash mid-turn.** Server sends COMMAND; sandbox SIGKILLed before OUTPUT. Server logs ERROR phase=turn, surfaces "story runtime crashed" to the room, keeps the server process running, offers RESTORE from the latest save.
- **N-2: Database write failure.** Simulated ENOSPC on the SQLite file during `session_events.append`. Server surfaces `error` with code=persistence_failure to the room, logs the error, does NOT silently drop the event, does NOT apply the state change that would have required the event.
- **N-3: WebSocket drop during lock hold.** Lock holder's socket dies mid-draft. After the 60-second AFK release (or immediately if the client explicitly disconnects — TBD which), the lock becomes available. Other clients see lock_state with holder_id=null.
- **N-4: Token for deleted room.** Client sends `hello` with a token whose room has been deleted. Server replies with `room_closed` reason=deleted and closes the socket.
- **N-5: CAPTCHA failure.** Create-room with invalid CAPTCHA returns 400 with a machine-readable error; no room row is created; no token is issued.
- **N-6: Malformed story.** Operator places a non-`.sharpee` file (or a bundle that crashes on load) in the stories directory. Attempting to create a room with it fails cleanly; the server reports "story failed to load" with the sandbox error; no partial room is created.
- **N-7: Stale draft on reconnect.** A participant's client sends a `draft_delta` whose `seq` is older than the current server state. Server ignores it silently. (Prevents replay of pre-disconnect keystrokes after a new holder has claimed the lock.)

### Unit test coverage (required)

Each repository method gets unit tests against an in-memory SQLite database. Each HTTP handler gets tests for the happy path and the expected 4xx paths. The cascading-succession state machine gets a table-driven test exercising every transition.

## Backward Compatibility

**Any story built with the current Sharpee toolchain runs unmodified on the multiuser server.**

Specifically:
- Stories are loaded as existing `.sharpee` bundles (esbuild-bundled ESM modules). No changes to the build pipeline.
- The sandbox runs `@sharpee/engine` through its existing public API. No engine changes required.
- Story code using `world.save()` / `world.restore()` routes through the Sharpee save API as it already does; the multiuser server's opaque-blob protocol is strictly below that layer.
- Lock-on-typing is transparent to the story: the sandbox receives COMMAND events the same shape as any single-player engine invocation.

Single-player stories that happened to call any browser-specific API (e.g., direct DOM manipulation via a story-provided extension) will not work — but no shipping story does this. The sandbox's `--allow-none` posture is the narrower of the two runtime environments, so any story that runs cleanly in the multiuser sandbox will also run in the single-player Zifmia runtime.

The multiuser server does NOT read or modify save-blob formats. Save files from a single-player session are not portable into a multiuser room and vice versa — the blob format is the engine's, but the surrounding room-scoping and event-log integration are platform-specific. Cross-platform save portability is explicitly post-MVP.

## Localization Posture

**MVP server emits English-only user-facing strings.**

The multiuser server is not in the `engine / stdlib / world-model` package graph that CLAUDE.md's Language Layer Separation rule governs, so this is not an architectural violation — but it is an acknowledged limitation.

Strings currently hardcoded in the server subsystem include (non-exhaustive):
- The recording-transparency notice shown on join.
- The "closed by host" broadcast on room delete.
- Error messages surfaced via `ServerMsg { kind: 'error' }`.
- Mute notice ("You've been muted").
- Successor nomination passive notice ("X joined and is now your designated successor").

When multi-locale support enters scope (post-MVP), these strings get routed through a server-side message catalog keyed by participant locale. The browser client's locale preference is a natural channel for the `hello` message to carry. A future ADR will specify the catalog format and the participant-locale resolution rule; it is not part of v0.1.

Note: **story content is already localized through the existing `lang-{locale}` mechanism** — the multiuser server does not interpose on story-emitted text. Only server-emitted platform text is affected by this limitation.

## Consequences

### Positive

- **Operator burden is low.** A VPS with Docker installed stands up an instance in minutes. No cloud account required.
- **Isolation is real without being expensive.** Deno with `--allow-none` is a V8-level capability boundary that ships for free — no microVM image management, no orchestration, no per-room container lifecycle.
- **No auth complexity.** Skipping accounts erases an entire class of features, bugs, and operational burden (password reset, email deliverability, OAuth drift, session-hijacking mitigation). MVP ships with one less system.
- **Room-scoped lifecycle simplifies privacy.** Delete-room cascades everything. There is no "forgotten user data" in some other table — privacy boundary == room boundary.
- **Event log is a strategic asset.** Beta-test review, debugging, moderation audit, transcript export all fall out of the same append-only table.
- **Lock-on-typing + live preview is a real differentiator.** Not "prettier Discord"; a genuinely different input model that Discord/Zoom fundamentally cannot provide.

### Negative / Acknowledged Trade-offs

- **No cross-room identity.** Regular users have no persistent profile. A player who beta-tested three stories cannot see a consolidated history of their feedback. Acceptable for MVP; revisited if we add accounts.
- **Losing the token means losing the role.** A user who clears `localStorage` or switches browsers mid-session rejoins as a fresh Participant. Acceptable; consistent with the "join code is the credential" framing.
- **Operator is a single point of trust for story content.** The platform only runs what the operator placed in the stories directory. If the operator is malicious, they can serve malicious stories to their users (same as any self-hosted forum, wiki, or code host). Out of scope.
- **Mute is a mild sanction.** A determined harasser can switch browsers, create a new session, and rejoin. The delete-room escape hatch exists for truly intractable cases. Accepted; kick/ban introduces disproportionate complexity.
- **Saves and transcripts die with the room.** A 14-day inactive unpinned room loses everything. Pin is the affordance for anyone who cares. No pre-recycle warnings in MVP (no notification surface).
- **Desktop-only excludes a substantial player population.** Mobile is an acknowledged deferral, not an oversight. Revisited post-MVP.
- **Deno dependency in the runtime image.** The Docker image now bundles both Node and Deno binaries, increasing image size. Acceptable; Deno is small compared to Node + all npm deps.
- **Single-container model limits horizontal scaling.** A single Node server hosts all rooms on the instance. Community-scale deployments handle this easily; a multi-node architecture is post-MVP if needed.
- **Bare `ws` means writing our own room/broadcast code.** More code to test, more invariants to uphold. Acceptable; the domain model is specific enough that a generic library wouldn't reduce the work by much.

### Neutral / Follow-ups

- **Client framework choice is still open.** The decision here covers the server; the browser client's framework (React, Svelte, Solid, vanilla, etc.) is a separate question, addressed by a future ADR or design doc.
- **Rate-limiting beyond CAPTCHA** is not in MVP. If per-IP abuse becomes an issue, the reverse-proxy layer (nginx `limit_req`, Caddy's rate-limit module) is the first recourse before adding in-app rate-limiting.
- **Pre-recycle warnings, transcript export, per-user libraries, upload UI, admin UI, federation, mobile** — each listed in the brainstorm's "Explicitly Deferred" section with rationale. Each gets its own ADR if and when it becomes MVP-blocking for a real operator need.

## Implementation Plan

This ADR is a contract; the concrete build plan belongs in `docs/work/multiuser/`. Suggested vertical slices (decomposition to be refined during planning):

1. **Repository scaffolding** — new `packages/multiuser-server/` (or similar) with TS config, Docker multi-stage build, Hono skeleton, `better-sqlite3` wired up, migration runner.
2. **Schema + repositories** — 5-table schema, `RoomsRepository`, `ParticipantsRepository`, `SessionEventsRepository`, `SavesRepository`, `ConfigRepository`. Raw parameterized SQL. Unit tests.
3. **HTTP layer: create-room, join, CAPTCHA** — Hono endpoints, durable-token issuance, `localStorage` scope, display-name flow.
4. **WebSocket layer: join/leave presence, broadcast scaffolding** — bare `ws` adapter under Hono, per-room topic routing, reconnect-with-token.
5. **Deno sandbox integration** — subprocess spawn, framed message protocol, lifecycle handling, SAVE/RESTORE blob routing, crash/restart semantics.
6. **Lock-on-typing** — keystroke debounce, delta broadcast, live preview rendering, AFK timeout, Co-Host force-release, event-log integration.
7. **Role hierarchy + succession** — promotion/demotion endpoints, cascading succession invariant enforcement, 5-minute grace timer, nomination UI.
8. **Chat + DMs** — room chat wire format, PH↔Co-Host DM channel, REC indicator, recording-transparency notice.
9. **Moderation** — mute/unmute flow, mute persistence across reconnect, event-log integration.
10. **Pin/Delete/Recycle** — room settings panel, type-to-confirm delete, idle timer, cascade semantics.
11. **Docker packaging + reference `docker-compose.yml`** — multi-stage build, healthcheck, volume conventions, reference instance deployment.
12. **Operator documentation** — install guide, config reference, backup/restore runbook, upgrade guide.

Phases are vertical slices that each leave the system in a releasable state. A real implementation plan with ADR-by-ADR dependencies, deliverables, and exit criteria is written separately before coding starts.

## References

- **Brainstorm that grounds this ADR**: `docs/brainstorm/multiuser/overview.md` — the detailed rationale, options considered and rejected, and walked user-flows.
- **Superseded ADR**: `docs/architecture/adrs/adr-152-multiuser-player.md` (abandoned 2026-04-19).
- **Prior IF community signal**: intfiction.org discussions on shared-play friction (source material for the core pain point).
- **Prior art inside the project**: FyreVM client/server work (full historical recording as a model for the session event log), Zifmia (thin browser client over WebSocket), Sharpee's existing TypeScript engine with its validate/execute/report action lifecycle.
- **External references**:
  - Deno permissions model: `https://docs.deno.com/runtime/manual/basics/permissions`
  - Node `vm` module disclaimer: `https://nodejs.org/api/vm.html` (explicit "not a security mechanism")
  - Hono: `https://hono.dev/`
  - `better-sqlite3`: `https://github.com/WiseLibs/better-sqlite3`
