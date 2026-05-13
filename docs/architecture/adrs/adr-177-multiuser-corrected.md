# ADR-177: Multi-User Web Product — Corrected Architecture

## Status: ACCEPTED

## Date: 2026-05-12 (PROPOSED), 2026-05-12 (ACCEPTED — 6 findings resolved)

## Supersedes

- **ADR-175** (Zifmia — Multi-User Product Surface and Rebuild). ADR-175 was
  ACCEPTED 2026-05-10 and shipped as `tools/zifmia/` between 2026-05-11
  and 2026-05-12. Audit on 2026-05-12 against the prior working
  `tools/server/` (commit `899653cf`) found the implementation
  dropped most of the multi-user product's load-bearing surface:
  room governance (PH / tiers / succession / pin / delete / mute /
  DMs / join-code / recording notice / recycle), the session-event log,
  the world-mirror update pattern, and identity per ADR-161. What
  shipped is a flat-room multi-tenant story platform with admin
  upload — a different product than what the old `tools/server/`
  built. `tools/zifmia/` is renamed `tools/shite/` to mark it as a
  parts bin / negative example; this ADR specifies the corrected
  build.

## Builds on

- **ADR-161** (Identity Model `(Id, Handle, passcode)`), amended
  2026-05-12: no passcode. Identity is `{id, handle}` only; the
  handle IS the entire credential. Server stores `(id, handle,
  is_admin, created_at)`. Anyone who claims a handle on any browser
  becomes that identity. Accepted threat model for a small IF
  community.
- **ADR-163** (Channel-Service Platform). The platform's
  `hello / cmgt / turn / command` packet wire is the channel-io
  layer. `@sharpee/channel-service` runs the same way in the CLI,
  the platform-browser, and this server.
- **ADR-164** (Stateless Multi-User Server). Engine-execution
  model carries forward: in-process Node engine, per-turn
  load → execute → save cycle, world state lives in the save blob.
  ADR-164's three server-sourced channels (`chat`, `presence`,
  `command_echo`) are kept.
- **ADR-165** (Renderer Architecture). The client uses
  `@sharpee/channel-service`'s `Renderer` host with
  `@sharpee/platform-browser`'s default channel renderers, plus
  multi-user-specific renderers for the server channels above.

## Replaces

- **ADR-153** (Multiuser Sharpee Server) — already replaced by
  ADR-164 at the engine layer. This ADR re-adopts ADR-153's product
  surface (room governance) but discards its engine model (Deno
  subprocess) for ADR-164's stateless model.
- **ADR-153a** (Phase-4 Amendments) — transitive.
- **ADR-156** (Multiuser Browser Client) — already replaced by
  ADR-164's client-side `Renderer` consumer pattern. The component
  set (PH/tiers/recording-notice/grace-banner/DMs/etc.) comes back
  in this ADR.

## Carries forward unchanged from `tools/server/` (commit `899653cf`)

The audit found these as load-bearing pieces of the prior working
product that **must come back** in the corrected build:

- **Rooms** as the primitive (not accounts). Created without
  pre-registration of stories; story slug picked from a server-scanned
  directory.
- **Join code** — short shareable Crockford-32 token, unique per
  room. Public lobby filter accepts a join code as well as listing
  open rooms.
- **Primary Host** — first joiner; sticky bit on the room row.
- **Four-tier hierarchy**: `primary_host / co_host /
  command_entrant / participant`. Tier-gated abilities (typing,
  saving, restoring, muting, pinning, deleting).
- **Cascading succession** — PH disconnect → grace timer →
  auto-promote nominated successor; chains until a connected
  participant emerges.
- **Pin / unpin** — PH-only, surfaces to the lobby.
- **Delete room** — PH-only with title-confirmation gate.
- **14-day idle recycle sweeper**.
- **Mute** — the moderation hammer (no kick, by design).
- **DMs** — PH↔Co-Host only.
- **Recording notice** — every welcome carries the transparency
  notice; client renders a persistent `.sharpee-window-rec-indicator`.
- **`session_events`** — append-only log per room. Carries chat /
  command / output / lifecycle / role-change rows. Welcome backlog
  builds from this.
- **`participants`** — joins identity to room with `tier`, `muted`,
  `connected`, `is_successor` flags.
- **Story installation by directory scan** — `StoryScanner`
  enumerates `stories/` on boot; `StoryHealth` validates via a brief
  engine instantiation. **No admin upload, no story_library table,
  no admin role.** Admin actions (operator-level) run against the
  SQLite DB directly via a CLI tool.

## Discarded from `tools/server/`

These were design pieces of the old server that ADR-164 (already
ACCEPTED) replaced; the corrected build does not bring them back:

- **Deno subprocess per room** — replaced by in-process per-turn
  engine (ADR-164 Decision 1).
- **Server↔sandbox wire** (`Init / Ready / Status / Command /
  Output / Restored / Exited`) — gone with the subprocess.
- **World-Model Replication (ADR-162)** — replaced by ADR-164's
  channel-io. Clients no longer hydrate a read-only `WorldModel`
  mirror per turn; everything renderable rides channels.
- **`recording_notice` as a `welcome` field** — same intent, but
  served as a static room-metadata constant rather than per-welcome
  string.

## Discarded from `tools/zifmia/`

- **Admin upload of stories** (`POST /admin/stories` +
  `story_library` + `story_bundles` tables). Out of scope; stories
  live in a directory the server scans.
- **`/admin/*` HTTP route family** (the routes Phase-6 zifmia introduced
  for admin upload, story listing, identity admin). Out of scope; admin
  actions run against the SQLite DB via a CLI tool. The `is_admin`
  *column* on `identities` is kept (see §5 / §6) — what's discarded is
  the HTTP surface that exposed it, not the column itself.
- **Multi-tenant flat-room model** (any-identified-user creates
  a room against any installed story). Replaced by the
  room-governance model above.
- **Bearer session tokens, `/identity/register|login|me`,
  `sessions` table.** Identity is the handle only per ADR-161
  amended.

## Decision

### 1. Engine: in-process, per-turn (ADR-164 carry-forward)

A turn is one HTTP submission. The server loads the room's save
blob into a fresh `WorldModel`, runs `engine.executeTurn(command)`,
captures the channel packets the engine emits, persists the new
save blob + session-event row, then **broadcasts the channel-io
package over the room's WebSocket fan-out to every connected
participant — submitter included**. Each browser receives the JSON
package and updates its view via its channel renderer dispatch.

No engine state survives between turns in memory. No subprocess.
Per-room single-writer lease serializes concurrent submissions.

### 2. Channel-io is the wire SHAPE; WebSocket is the live delivery

The server runs `ChannelService` per turn and produces a typed
`TurnPacket` per ADR-163. The packet carries:

- Standard engine channels: `main`, `prompt`, `score`, `turn`,
  `location`, plus media channels (`image:*`, `sound`, etc.).

Each browser subscribed to the room receives the JSON `TurnPacket`
over the WebSocket and hands it to its channel renderer. The
delivery is symmetric — the submitter's browser receives the same
WS broadcast as every other browser, so all clients have identical
state derived from identical packets.

`CmgtPacket` (the channel manifest) ships once as part of the
`GET /api/rooms/:id/state` response on first entry. The
manifest is also the **first thing a browser receives** when
re-subscribing after a reconnect (via that same HTTP fetch); WS
frames begin flowing only after the manifest is in hand.

`POST /api/rooms/:id/command` is the **process** — it submits the
turn. Its HTTP response is a tiny acknowledgement
(`{ turnId }`); the channel-io package follows over WS. This
keeps the submitter's path symmetric with observers.

### 3. WebSocket: chat and command-line sharing ONLY

WS carries exactly two concerns: real-time chat between
participants, and command-line sharing — i.e., broadcasting the
channel-io package that resulted from someone's submitted command
to every browser in the room.

**Hello handshake** — the first frame on every WS connection.
- Client → Server: `hello { roomId, handle }` — MUST be the first
  frame after `open`. No other frame is accepted from the client
  until `hello:ack` has been sent. The handle here is the same
  in-band credential used on HTTP per ADR-161 amended.
- Server → Client: `hello:ack { participantId, tier, lockHolder }`
  — confirms attachment to the room's broadcast group.
- Server-side close codes on hello rejection:
  - `4001 unknown_handle` — handle does not resolve to an identity.
  - `4003 not_in_room` — identity exists but is not a participant
    of `roomId`. Caller must `POST /api/rooms/:id/join` first.
  - `4004 room_not_found` — `roomId` does not exist or is deleted.
  - `4005 hello_required` — any frame other than `hello` arrived
    first.
  - `4006 hello_timeout` — no `hello` within 5s of connection open.

**Chat** — real-time user-to-user messages:
- Client → Server: `chat:send { roomId, text }`
- Server → Client (broadcast to all room participants, sender
  included): `chat:message { id, roomId, fromId, fromHandle, text,
  ts }`

**Command-line sharing** — every browser in the room receives the
same channel-io package the engine just produced. Adjacent to that,
the typing-seat awareness (lock-on-typing) lives here so observers
know who is currently composing a command:
- Client → Server: `lock:acquire { roomId }` — I'm typing now
- Client → Server: `lock:release { roomId }` — I gave up the seat
- Server → Client (broadcast): `lock:state { roomId, holder, expiresAt }` —
  current typing seat holder
- Server → Client (broadcast after the engine produces a turn):
  `turn { roomId, turnId, submitter: { id, handle },
  packet: TurnPacket }` — the channel-io package. Every browser in
  the room receives this; each renders the packet through its
  channel renderer.

Lifecycle events that need real-time visibility ride WS as
well because they affect who can take the typing seat (i.e., they
are part of "command-line sharing"):
- Server → Client (broadcast): `role_change { roomId, participantId,
  tier, actorId? }` — emitted on promote/demote/succession/PH-grace
  auto-promote. Clients update their roster + tier-gated affordances
  in place.
- Server → Client (broadcast): `presence { roomId, participantId,
  connected, graceDeadline? }` — emitted on connect/disconnect.
  `graceDeadline` is populated when the disconnecting participant
  is the current PH; clients render a countdown banner.
- Server → Client (broadcast): `room_restored { roomId, atSaveId,
  byHandle }` — emitted after a successful restore. Clients re-fetch
  state via HTTP because the transcript moved.

WS scope is *chat + command-line sharing (with awareness)*. WS does
not carry HTTP-shaped operations (identity claim, room CRUD, save
management). Those are HTTP.

### 4. HTTP: the process (state changes + initial state)

Per ADR-161 amended, every state-changing HTTP request carries
`handle` in-band (body field for POST/PUT/DELETE, `?handle=` for
GET).

- **Identity**:
  - `POST /api/identities { handle }` → 201 `{id, handle}` |
    409 `handle_taken`
  - `POST /api/identities/erase { handle }` → 200
- **Rooms** (lifecycle + governance):
  - `GET /api/rooms` — public lobby list (filterable by join code)
  - `POST /api/rooms { handle, story_slug, title }` — create as PH
  - `POST /api/rooms/:id/join { handle }` — join as participant
  - `POST /api/rooms/:id/rename { handle, title }` — PH-only
  - `POST /api/rooms/:id/pin { handle, pinned }` — PH-only
  - `POST /api/rooms/:id/delete { handle, confirm_title }` — PH-only
  - `POST /api/rooms/:id/nominate-successor { handle, target }` — PH-only
  - `POST /api/rooms/:id/promote { handle, target, to_tier }` — PH-only
  - `POST /api/rooms/:id/demote { handle, target, to_tier }` — PH/CoHost
  - `POST /api/rooms/:id/mute { handle, target, muted }` — PH/CoHost
  - `POST /api/rooms/:id/force-release { handle, target }` — PH/CoHost
- **Rooms** (the process — submit + state hydration):
  - `GET /api/rooms/:id/state?handle=` — initial-state fetch on
    room entry and on WS reconnect. Returns a `RoomStateResponse`
    (typed shape below) carrying everything a fresh browser needs to
    seed its renderer before the live WS stream takes over.
    Transcript backlog is a sequence of past `TurnPacket`s capped
    at the in-blob transcript window (ADR-164 carry-forward,
    1000 turns).

    ```ts
    interface RoomStateResponse {
      room: {
        id: string;
        title: string;
        join_code: string;
        story_slug: string;
        pinned: boolean;
        primary_host_id: string;
        recording_notice: string;
      };
      cmgt: CmgtPacket;                    // channel manifest (ADR-163)
      transcript_backlog: TurnPacket[];    // capped at 1000
      roster: Array<{
        participant_id: string;
        identity_id: string;
        handle: string;
        tier: 'primary_host' | 'co_host' | 'command_entrant' | 'participant';
        muted: boolean;
        connected: boolean;
        is_successor: boolean;
      }>;
      lock: { holder: string | null; expiresAt: number | null };
      grace?: { ph_disconnected_at: number; deadline: number };
    }
    ```
  - `POST /api/rooms/:id/command { handle, text }` → 200 `{ turnId }`.
    Runs the turn server-side. The channel-io package broadcasts
    over WS to every participant (submitter included) per §1/§3.
- **Saves**:
  - `GET /api/rooms/:id/saves?handle=...` — list
  - `POST /api/rooms/:id/saves { handle, name }` — create
  - `POST /api/rooms/:id/restore { handle, save_id }` → 200
    `{ atSaveId }`. After the persistent state rolls back, server
    broadcasts `room_restored` over WS so every browser re-fetches
    state via `GET /api/rooms/:id/state`.
- **Stories**:
  - `GET /api/stories` — list available stories (directory-scanned)
- **Resolve**:
  - `GET /api/code/:join_code` — resolves a shareable code to a
    room id for the lobby's "I have a code" flow.

### 5. Identity: handle-only (ADR-161 amended)

`{id, handle, is_admin, created_at}`. No passcode. No session
token. Anyone who claims a handle becomes that identity. Handle is
3–12 alphabetic characters per the ADR-161 spec, case-insensitive
uniqueness, case preserved for display.

Client localStorage key `sharpee:identity` holds `{id, handle}`.

`is_admin` is set by an out-of-band CLI tool against the SQLite DB.
There is **no admin HTTP surface in v1**. Admin-only operations
(rare) run via `sharpee-admin <command>` against the DB file.

**Erase teardown.** A successful `POST /api/identities/erase
{ handle }` hard-deletes the `identities` row; CASCADE removes the
corresponding `participants` rows across every room. Any open WS
connections attached to that handle are closed by the server with
code **`4007 identity_erased`** immediately after the DB write
commits, and a `presence { connected: false }` is broadcast for
each affected room. The client erases its `sharpee:identity`
localStorage entry on receiving 4007 (or on its own erase request's
HTTP 200, whichever it sees first) and returns to the unidentified
lobby view.

### 6. Persistence

- `identities (id, handle, is_admin, created_at)` — handle unique
  (case-insensitive).
- `rooms (id, join_code, title, story_slug, pinned, last_activity_at,
  created_at, primary_host_id, deleted_at?)`.
- `participants (id, room_id, identity_id, tier, muted, connected,
  is_successor, joined_at)`. FK CASCADE on identity erase and room
  delete.
- `session_events (event_id, room_id, participant_id?, ts, kind,
  payload)` — append-only. `kind` is one of `chat / dm /
  command / output / role_change / mute_state / pin / unpin /
  save_created / restored / nominated_successor / join / disconnect /
  lifecycle / recording_notice`. `payload` is JSON.
- `saves (save_id, room_id, actor_id, name, blob, created_at)` —
  room-scoped named saves; blob is the engine's `world.toJSON()`
  payload.
- `config (key, value)` — small key-value store for operator
  settings (recycle interval, grace timer, etc.).

NO `sessions` table. NO bearer tokens. NO `story_library` /
`story_bundles` tables — stories live on disk.

**Greenfield — no migration.** The schema above is the v1 schema,
taken on first boot of the corrected build. There is no data
migration from `tools/shite/` or from the prior `tools/server/`;
both lived in separate SQLite files and neither contains data the
new build owes a forward path to. Operators starting the new build
get a fresh DB file. Schema changes after v1 follow the project's
no-backcompat policy — one-shot cutover, operator owns lifecycle
— rather than online migrations.

### 7. Story installation: directory scan

`StoryScanner` enumerates `stories/` on boot. Each `.sharpee` file
is health-checked by `StoryHealth.validate()` (a brief engine
instantiation against `setStory()` + `start()` + first manifest
emission). Failed stories are flagged in the boot log and excluded
from `GET /api/stories`.

To deploy a new story: the operator drops the `.sharpee` file into
`stories/`. SIGHUP (or a `POST /sys/rescan` admin-CLI hook) re-runs
the scan. Not part of the user HTTP surface.

### 8. Recording notice

Every room carries a static recording-notice string per the operator's
`config` table entry (default: "Conversations in this room may be
recorded for audit and replay."). The notice is part of the
`GET /api/rooms/:id/state` response; client renders it once on
first join and shows a persistent indicator inside the room view.

### 9. Implementation location

The new code lives in a fresh directory, NOT `tools/shite/`. Proposed
options for the operator-facing name:

- `tools/sharpee-server/` — matches the prior working location's
  conceptual continuity.
- `tools/zifmia/` (reclaimed) — if the product name is kept, the
  shite rename frees the path. The `shite` directory remains as a
  parts bin pointing here.
- `tools/multiuser/` — neutral; no product-naming commitment.

**Decision deferred** to a follow-on session. The ADR doesn't pin
the path because the path is reversible later; the architecture is
not.

## Invariants

- **The process is HTTP.** Room governance, identity, saves, story
  listing, state reads, and command submission itself — all
  request/response over HTTP. State-changing operations return a
  small acknowledgement; the resulting renderable update arrives
  over WS.
- **WebSocket is the live-broadcast rail.** Two concerns: chat
  between participants, and command-line sharing — the channel-io
  `TurnPacket` from each turn broadcast to every browser in the
  room, plus the awareness signals around the typing seat
  (`lock:state`), role changes, and presence. Channel-io (ADR-163)
  defines the *wire shape*; the WS is the *delivery transport*
  for live updates.
- **The submitter is just another subscriber.** A `POST /command`
  returns `{ turnId }` and nothing more. The resulting `TurnPacket`
  comes back over the same WS broadcast that every other browser
  in the room receives. All browsers (submitter included) render
  identically off identical inputs. **Do not add a fallback that
  also returns the `TurnPacket` in the HTTP body**: it would
  reintroduce an asymmetric submitter path and, more importantly,
  imply that WS delivery is the authoritative copy. It is not. The
  authoritative copy is the persisted save blob + `session_events`
  row; every browser — submitter, observer, or a fresh joiner —
  recovers the same way via `GET /state` and the transcript backlog.
  A "flaky WS" is identical in kind to "a new browser opening the
  room": reconnect → hydrate → resume. The prior Deno design lost
  state because state lived in a process; the corrected design
  lives in SQLite, and WS is purely live delivery on top of that.
- **HTTP `GET /state` is for hydration, not for live updates.**
  Called once on room entry to seed CMGT + transcript backlog +
  roster + recording notice. Called again only on reconnect (after
  a `room_restored` WS broadcast) or on explicit user refresh.
  Between hydrations the WS stream is authoritative.
- **Handle is the entire credential.** No tokens, no hashes. WS
  hello frame carries the handle and the room id; HTTP requests
  carry the handle in-band.
- **No engine state survives between turns in memory.** Every turn
  reloads from the save blob (ADR-164 carry-forward).
- **PH is sticky on the room row.** Succession promotes a different
  participant *to* PH; the old PH's row is demoted.

## Acceptance Criteria

- **AC-1: identity claim**. `POST /api/identities { handle }` with
  a fresh handle returns 201 `{id, handle, is_admin}`. A second
  call with the same handle returns 409 `handle_taken`. localStorage
  persists across reload; clearing it returns the user to
  unidentified.
- **AC-2: lobby viewable unidentified**. `GET /api/rooms` returns
  the public room list (with participant handles in each row) to
  any caller. Create / Join buttons are gated client-side.
- **AC-3: PH room creation**. A `POST /api/rooms { handle,
  story_slug, title }` from an identified caller creates the room
  with the caller as PH (tier=`primary_host`). The response carries
  the room id and join code.
- **AC-4: tier-gated abilities**. A `participant`'s `POST
  /api/rooms/:id/pin { pinned: true }` returns 403; the same request
  from the PH succeeds.
- **AC-5: cascading succession**. PH disconnects. After the
  grace window, the nominated successor is auto-promoted to PH;
  the demoted PH's row drops to `participant`; the next-in-line
  nominee inherits the successor flag. Verified by every browser
  in the room receiving a `role_change` WS broadcast carrying
  the new tier assignments.
- **AC-6: transport split**. A network capture during a session
  shows:
  - WS frames client→server are ONLY: `chat:send`,
    `lock:acquire`, `lock:release`.
  - WS frames server→client are ONLY: `chat:message`, `lock:state`,
    `turn` (carrying the channel-io `TurnPacket`), `role_change`,
    `presence`, `room_restored`.
  - HTTP carries: identity claim/erase, room CRUD + governance,
    saves, stories, `GET /state` hydration, and `POST /command`
    (which returns just `{ turnId }`).
  - No HTTP route returns a `TurnPacket` outside the `GET /state`
    transcript-backlog payload.
- **AC-7: directory-scanned stories**. Dropping a new `.sharpee`
  file into `stories/` and sending SIGHUP makes it appear in `GET
  /api/stories`. Removing the file removes it from the list.
- **AC-8: recording notice persistence**. `GET /api/rooms/:id/state`
  carries the operator's configured notice; the client renders it
  on first join. Closing/reopening the room shows the indicator
  unchanged.
- **AC-9: erase frees the handle**. `POST /api/identities/erase
  { handle }` hard-deletes the row; subsequent `POST /api/identities
  { handle: <same> }` succeeds with a new `id`. Any WS connection
  attached to the erased handle is closed by the server with code
  `4007 identity_erased` before the HTTP response returns to the
  caller.
- **AC-10: lock-on-typing (200ms heartbeat)**. Two browsers A and B
  are in the same room. A sends `lock:acquire`; both browsers receive
  `lock:state { holder: A, expiresAt: now+200ms }`. While A continues
  typing, the client re-emits `lock:acquire` every 150ms to refresh
  the expiry; the server rebroadcasts `lock:state` only when the
  holder or expiry meaningfully changes. After 200ms of no
  `lock:acquire` from A, the server auto-releases and broadcasts
  `lock:state { holder: null, expiresAt: null }`. B's `lock:acquire`
  is rejected while `holder=A`; accepted once `holder=null`. A's
  explicit `lock:release` collapses the lock immediately.
- **AC-11: reconnect idempotency**. A browser disconnects mid-session
  and rejoins. The server's WS layer matches the `hello { roomId,
  handle }` to the existing `participants` row (same `participant_id`)
  rather than allocating a new one. The rejoining browser fetches
  `GET /api/rooms/:id/state` and resumes the live feed; observers
  see exactly one `presence { connected: false }` followed by exactly
  one `presence { connected: true }` for that `participant_id`
  across the disconnect/reconnect cycle — no duplicates, no
  cross-talk with other identities sharing the same handle (which
  is impossible per ADR-161 uniqueness).

## Constrains Future Sessions

- **The process is HTTP. Period.** Adding a new state-changing
  operation (room action, identity action, save action) is an HTTP
  route with handle in-band — never a new WS frame. State changes
  return a small acknowledgement; whatever live UI update follows
  rides the WS broadcast rail.
- **Channel-io packets are broadcast over WS, not pulled over
  HTTP.** `POST /command` returns `{turnId}`; the `TurnPacket`
  comes back over the room's WS fan-out to every connected
  browser, submitter included. The only place `TurnPacket` rides
  an HTTP body is the `transcript_backlog` field in `GET /state`
  (initial hydration on entry / reconnect).
- **Adding a new WS frame requires justification.** WS scope is
  chat + command-line sharing (including the awareness signals:
  lock, role change, presence, room restored). A new concern on
  the WS — metadata, telemetry, settings — is a new ADR that
  amends this one.
- **Identity is `{id, handle}`. Do not reintroduce sessions,
  bearer tokens, or passcodes.** If a future requirement needs
  stronger auth than "handle is the credential", that is a new ADR
  amending ADR-161 — not a quiet column addition.
- **Stories live in `stories/`. No upload endpoint.** Operators
  manage the directory; the application observes it.
- **`is_admin` exists but has no HTTP surface.** Operator tasks
  go through a CLI tool against the SQLite DB. If the IF community
  outgrows that, a new ADR specifies an admin surface.

## Out of Scope (named so they don't drift in)

- DMs / per-participant whispers between arbitrary tiers — restricted
  to PH↔Co-Host per ADR-153 Decision 8 (carried forward).
- User-uploaded story bundles.
- Federation across server instances.
- MPIF (multi-player IF where each participant controls a separate
  PC). Separate product, separate engine.
- OAuth / 3rd-party auth.
- Internationalization of the recording-notice / UI labels (v1 is
  English; the operator can override the notice string).

## Prior Art

Multi-user / shared-IF systems have been built before. Sketching
the shape of each clarifies what ADR-177 takes from them and what
it leaves on the table.

- **ifMUD + integrated interpreter (perlMud, Club Floyd).**
  Stateful long-running daemon hosting chat, identity, presence,
  room, AND an embedded IF interpreter. **One game at a time**
  across the whole MUD instance — Floyd uses that slot for its
  weekly session. State held in process memory; crash recovery is
  "reload + `restore` from a save." Works because the product is
  bounded: one shared game, scheduled events, finite session
  length. Doesn't generalize to "many concurrent rooms each running
  a different story" — and that's what makes ADR-177 not-ifMUD.

- **ADR-153 Deno-subprocess-per-room (Sharpee's own first cut,
  2025).** Many concurrent rooms, each room's engine running in its
  own Deno subprocess, talking to the main server over a wire
  protocol. Statefulness in the subprocess was the failure mode —
  subprocess crash = state loss = room dead. ADR-164 retired this
  in favor of stateless-per-turn; ADR-177 carries that decision
  forward.

- **Parchment / iplayif.com / Lectrote.** Engine in the browser; no
  shared state; single-user. The "engine fully client-side"
  extreme. Putting the engine in the browser makes shared-state-
  across-browsers a separate infrastructure problem — which
  amounts to "build a MUD on top." ADR-177's choice to put the
  engine server-side is what makes shared rooms possible without
  re-solving distributed state.

- **Twitch Plays / chat-driven game streams.** One game instance,
  many viewers, chat → input pipeline. Almost exactly ADR-177's
  shape minus the per-room concept: one engine, broadcast output
  (video in their case, channel-io in ours), chat-driven input
  (voted commands in theirs, direct submission by the typing-seat
  holder in ours). Validates the social pattern: observers +
  driver, with chat layered over a shared game, works at scale.

- **MUD frameworks with web clients (Evennia, Ranvier).**
  Long-running stateful server, web UI as a thin terminal-in-
  browser layer. Architecturally indistinguishable from ifMUD —
  the browser is just a transport reskin over a MUD daemon. Not a
  separate architecture so much as a UI choice on top of one.

- **Cloud gaming (GeForce Now, Stadia, etc.).** Extreme stateful:
  engine + scene graph + frame buffer all server-side, video
  streamed to a dumb client. Not directly applicable to text IF,
  but it's the architectural ceiling — "engine state lives in
  server, client is presentation only." ADR-177 lands closer to
  this end of the spectrum than to "engine in browser," with the
  wrinkle that durability is per-turn rather than per-frame and
  the wire is channel-io rather than video.

### What ADR-177 takes from each

- **From ifMUD**: chat + identity + presence + room is the right
  substrate model for multi-user IF. Implemented as the WS layer
  in §3.
- **From ADR-153 (Deno)**: the failure mode taught the design.
  Statefulness in a per-room process is the bug; moving state to
  durable storage every turn is the fix.
- **From Parchment**: nothing directly — ADR-177's engine is
  server-side. But Parchment's renderer-in-browser pattern is what
  ADR-165 (Renderer Architecture) carries forward: the browser
  renders, it doesn't interpret.
- **From Twitch Plays**: validation that "one engine, many
  observers, chat layered over it" is a known-working social
  pattern. ADR-177 just gives each group its own room and lets
  the typing seat rotate rather than picking commands by majority
  vote.
- **From cloud gaming**: the principle that thinness on the
  client side is fine when the server emits a renderable stream.
  ADR-163's `TurnPacket` is the text-IF equivalent of a frame.

### Where ADR-177 sits on the curve

```
  engine in browser ─── stateless per-turn ─── stateful long-running ─── streamed frames
  (Parchment)          (ADR-177)              (ifMUD, Evennia,             (cloud gaming)
                                              Deno-per-room)
```

The "stateful long-running" middle has the most prior art for
multi-user IF (ifMUD has run since the 90s; Floyd has used it for
20+ years). ADR-177 picks the unusual middle-left position because
the IF turn model — quiescent between commands — makes per-turn
durability essentially free, and that durability is what removes
the failure mode that killed the Deno design.

## Consequences

### Positive
- Reclaims the working `tools/server/` product surface (room
  governance, recording notice, session-event log, PH/tiers/
  succession) without inheriting the Deno-subprocess complexity.
- Uses the channel-io platform as designed — every other Sharpee
  surface (CLI, single-player browser) speaks the same wire, so
  channel renderers ship once and serve every surface.
- WS scope is tight: chat + command-line sharing with its
  awareness signals (lock, role change, presence, room restored)
  plus the channel-io `TurnPacket` broadcast itself. Three
  client→server kinds (chat:send, lock:acquire, lock:release),
  six server→client kinds (chat:message, lock:state, turn,
  role_change, presence, room_restored). The "process" lives in
  plain HTTP, so debugging the room CRUD + state-hydration paths
  is request/response — readable in any browser devtools without
  WS-frame inspection.
- Identity is mechanically simple. Implementation is
  one route + erase + a localStorage write. No hashing libraries,
  no token rotation, no session expiry timers.

### Negative
- Larger surface than `tools/shite/`'s flat-room model. Room
  governance is substantial code: tier-gating across every
  operation, succession chains, grace timers, recycle sweepers.
  Counts as a session-and-a-half of plan work even on the
  carry-forward path.
- No admin web UI in v1. Operator-level actions are CLI-against-DB.
  Defensible for a small IF community but will need to grow if the
  community scales.
- Handle-as-credential is genuinely impersonable. The threat model
  explicitly accepts this; the ADR will need amending if the
  community ever needs real auth.

### Neutral
- The `tools/shite/` directory survives as a parts bin. Channel-
  service wiring, the LobbyManager DOM scaffold, the
  CommandInputManager, and the platform-browser renderer
  integration are reusable in the new build. The room-governance
  layer is greenfield.

## Implementation Plan (separate from this ADR)

A follow-on plan (`docs/work/multiuser/plan-YYYYMMDD-adr-177.md`)
will sequence the rebuild:

- **Phase 0**: location decision + scaffold (decision §9).
- **Phase 1**: identity (claim + erase + localStorage + lobby
  unidentified view). Smaller than my `shite` rewrite because
  there's no passcode / session work to undo.
- **Phase 2**: room CRUD + participants + tier enforcement +
  join code resolver.
- **Phase 3**: WS handshake + chat + lock-on-typing + command-shared
  notification. (HTTP command submission is part of Phase 2; this
  phase adds the *awareness* rail on top.)
- **Phase 4**: succession + grace timer + recycle sweeper.
- **Phase 5**: saves + restore + session-event log + transcript
  backlog.
- **Phase 6**: pin/delete/mute/DMs + recording notice.
- **Phase 7**: full client UI (carries forward from `tools/server/
  client/` — `ParticipantRoster`, `SettingsPanel`, `DmPanel`,
  `SettingsSuccessor`, `GraceBanner`, `RoomClosedOverlay`, etc.).
- **Phase 8**: Playwright two-user E2E covering AC-3 through AC-9.

## Session

Captured 2026-05-12 after the audit at `/tmp/sharpee-audit/tools/
server/` (commit `899653cf`). The audit walked the old server's
schema, wire types, room manager, WS handlers, and client
components. The corrected design here keeps the engine-execution
model from ADR-164, the wire-layer from ADR-163, and the product
surface from `tools/server/` — three ADRs and one prior
implementation, stitched back together with the wrong layer
(bearer auth + admin-uploaded stories + flat rooms) removed.
